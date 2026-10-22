// ============================================================
// server/trilhaProgressoStore.js
// Persistência do progresso da Trilha de Conhecimento no Supabase
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { obterDiasEmpresaPorEmail } from "./alterdataStore.js";

function getSupabaseAdmin() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ""
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Retorna a data de hoje no fuso horário do Brasil (America/Sao_Paulo) no formato YYYY-MM-DD.
 */
function getDataHojeBrasil() {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/**
 * Calcula a diferença em dias entre duas datas no formato YYYY-MM-DD.
 * @param {string|null} dataStr1 - Data anterior (ex: ultima_atividade)
 * @param {string} dataStr2 - Data de referência (ex: hoje)
 * @returns {number} Diferença em dias inteiros (ex: 0 = mesmo dia, 1 = ontem, >= 2 = 2 dias ou mais)
 */
function calcularDiferencaDias(dataStr1, dataStr2) {
  if (!dataStr1 || !dataStr2) return Infinity;
  const [y1, m1, d1] = dataStr1.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = dataStr2.slice(0, 10).split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Carrega o progresso de um usuário pelo email.
 * O valor da ofensiva é a quantidade de dias que o colaborador tem de empresa,
 * calculado a partir da data de 1ª admissão na base do Alterdata.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function lerProgressoUsuario(email) {
  const supabase = getSupabaseAdmin();

  // 1. Resolve os dias de empresa do colaborador comparando o e-mail logado com o Alterdata
  let diasEmpresa = null;
  try {
    diasEmpresa = await obterDiasEmpresaPorEmail(supabase, email);
  } catch (errAlterdata) {
    console.warn("[trilha] Falha ao consultar dias de empresa no Alterdata:", errAlterdata.message);
  }

  if (!supabase) {
    return {
      xpTotal: 0,
      missoesCompletas: 0,
      trilhasCompletas: 0,
      ofensivaDias: diasEmpresa ?? 0,
      progressoPorTrilha: {},
      ultimaAtividade: undefined,
    };
  }

  const { data, error } = await supabase
    .from("trilha_progresso")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[trilha] lerProgressoUsuario:", error.message);
    return null;
  }

  // Se o usuário ainda não tem registro de progresso no Supabase,
  // entrega o progresso inicial com os dias de empresa já vinculados
  if (!data) {
    return {
      xpTotal: 0,
      missoesCompletas: 0,
      trilhasCompletas: 0,
      ofensivaDias: diasEmpresa ?? 0,
      progressoPorTrilha: {},
      ultimaAtividade: undefined,
    };
  }

  // O valor da ofensiva é a quantidade de dias de empresa do colaborador
  const ofensivaDias = diasEmpresa !== null ? diasEmpresa : (data.ofensiva_dias ?? 0);

  // Mantém a coluna ofensiva_dias atualizada no banco
  if (diasEmpresa !== null && data.ofensiva_dias !== diasEmpresa) {
    supabase
      .from("trilha_progresso")
      .update({ ofensiva_dias: diasEmpresa })
      .eq("email", email)
      .then(() => {})
      .catch((err) => console.error("[trilha] Erro ao sincronizar ofensiva (dias de empresa):", err));
  }

  return {
    xpTotal: data.xp_total,
    missoesCompletas: data.missoes_completas,
    trilhasCompletas: data.trilhas_completas,
    ofensivaDias,
    progressoPorTrilha: data.progresso_por_trilha ?? {},
    ultimaAtividade: data.ultima_atividade,
  };
}

/**
 * Salva o progresso de um usuário no Supabase.
 * A ofensiva reflete os dias de empresa do colaborador segundo a 1ª admissão do Alterdata.
 * @param {object} params
 */
export async function salvarProgressoUsuario({
  email,
  nome,
  avatarUrl,
  xpTotal,
  missoesCompletas,
  trilhasCompletas,
  progressoPorTrilha,
  ofensivaDiasAtual,
  teveAtividadeRealizada = false,
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  // Busca o registro atual para preservar dados anteriores se necessário
  const { data: atual } = await supabase
    .from("trilha_progresso")
    .select("ofensiva_dias, ultima_atividade")
    .eq("email", email)
    .maybeSingle();

  const hoje = getDataHojeBrasil();
  const novaUltimaAtividade = teveAtividadeRealizada
    ? hoje
    : (atual?.ultima_atividade ? atual.ultima_atividade.slice(0, 10) : hoje);

  // Calcula a quantidade de dias de empresa a partir da 1ª admissão no Alterdata
  let novaOfensiva = ofensivaDiasAtual ?? 0;
  try {
    const diasEmpresa = await obterDiasEmpresaPorEmail(supabase, email);
    if (diasEmpresa !== null) {
      novaOfensiva = diasEmpresa;
    } else if (atual?.ofensiva_dias !== undefined && atual?.ofensiva_dias !== null) {
      novaOfensiva = atual.ofensiva_dias;
    }
  } catch (err) {
    console.warn("[trilha] salvarProgressoUsuario - erro ao buscar dias de empresa:", err.message);
  }

  const row = {
    email,
    nome: nome ?? null,
    avatar_url: avatarUrl ?? null,
    xp_total: xpTotal,
    missoes_completas: missoesCompletas,
    trilhas_completas: trilhasCompletas,
    ofensiva_dias: novaOfensiva,
    ultima_atividade: novaUltimaAtividade,
    progresso_por_trilha: progressoPorTrilha ?? {},
  };

  const { error } = await supabase
    .from("trilha_progresso")
    .upsert(row, { onConflict: "email" });

  if (error) {
    console.error("[trilha] salvarProgressoUsuario:", error.message);
    return null;
  }

  return { ofensivaDias: novaOfensiva, ultimaAtividade: novaUltimaAtividade };
}

/**
 * Registra um ganho de XP por missão concluída (ignora duplicatas silenciosamente).
 * @param {string} email
 * @param {string} trilhaId
 * @param {string} missaoId
 * @param {number} xpGanho
 */
export async function registrarXpGanho(email, trilhaId, missaoId, xpGanho) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("trilha_xp_historico")
    .upsert(
      { email, trilha_id: trilhaId, missao_id: missaoId, xp_ganho: xpGanho },
      { onConflict: "email,missao_id", ignoreDuplicates: true }
    );

  if (error && !error.message.includes("duplicate")) {
    console.error("[trilha] registrarXpGanho:", error.message);
  }
}

/**
 * Retorna o ranking semanal — usuários que mais ganharam XP na semana atual.
 * @param {number} limite
 * @returns {Promise<Array>}
 */
export async function obterRankingSemanal(limite = 10) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  // Início da semana atual (segunda-feira)
  const agora = new Date();
  const diaSemana = agora.getUTCDay(); // 0=Dom, 1=Seg, ...
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicioSemana = new Date(agora);
  inicioSemana.setUTCDate(agora.getUTCDate() - diasDesdeSegunda);
  inicioSemana.setUTCHours(0, 0, 0, 0);

  // Busca XP da semana por email
  const { data: historico, error: errHist } = await supabase
    .from("trilha_xp_historico")
    .select("email, xp_ganho")
    .gte("ganho_em", inicioSemana.toISOString());

  if (errHist) {
    console.error("[trilha] obterRankingSemanal (histórico):", errHist.message);
    return [];
  }

  // Agrega XP por email
  const xpPorEmail = {};
  for (const row of historico ?? []) {
    xpPorEmail[row.email] = (xpPorEmail[row.email] ?? 0) + row.xp_ganho;
  }

  if (Object.keys(xpPorEmail).length === 0) return [];

  // Busca dados de perfil dos usuários que aparecem no ranking
  const emails = Object.keys(xpPorEmail);
  const { data: perfis, error: errPerfis } = await supabase
    .from("trilha_progresso")
    .select("email, nome, avatar_url, xp_total")
    .in("email", emails);

  if (errPerfis) {
    console.error("[trilha] obterRankingSemanal (perfis):", errPerfis.message);
    return [];
  }

  const perfilMap = {};
  for (const p of perfis ?? []) {
    perfilMap[p.email] = p;
  }

  const CORES = [
    "from-amber-400 to-orange-500",
    "from-blue-400 to-indigo-500",
    "from-emerald-400 to-teal-500",
    "from-purple-400 to-violet-500",
    "from-pink-400 to-rose-500",
    "from-cyan-400 to-blue-500",
    "from-rose-400 to-orange-500",
    "from-lime-400 to-green-500",
    "from-fuchsia-400 to-pink-500",
    "from-yellow-400 to-amber-500",
  ];

  const ranking = emails
    .map((email, idx) => {
      const perfil = perfilMap[email] ?? {};
      const nome = perfil.nome ?? email.split("@")[0];
      const iniciais = nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("");
      return {
        email,
        nome,
        avatar: perfil.avatar_url ?? null,
        iniciais,
        xpSemana: xpPorEmail[email],
        xpTotal: perfil.xp_total ?? 0,
        cor: CORES[idx % CORES.length],
      };
    })
    .sort((a, b) => b.xpSemana - a.xpSemana)
    .slice(0, limite)
    .map((entry, idx) => ({ ...entry, posicao: idx + 1 }));

  return ranking;
}

/**
 * Zera o progresso e o histórico de XP de um usuário específico.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function zerarProgressoUsuario(email) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !email) return false;
  const emailNorm = String(email).toLowerCase();

  try {
    // 1. Remove histórico de XP do usuário
    await supabase.from("trilha_xp_historico").delete().eq("email", emailNorm);

    let diasEmpresa = 0;
    try {
      const dias = await obterDiasEmpresaPorEmail(supabase, emailNorm);
      if (dias !== null) diasEmpresa = dias;
    } catch {}

    // 2. Reseta o registro na tabela trilha_progresso
    await supabase
      .from("trilha_progresso")
      .update({
        xp_total: 0,
        missoes_completas: 0,
        trilhas_completas: 0,
        ofensiva_dias: diasEmpresa,
        ultima_atividade: null,
        progresso_por_trilha: {},
        atualizado_em: new Date().toISOString(),
      })
      .eq("email", emailNorm);

    return true;
  } catch (err) {
    console.error("[trilha] Erro ao zerar progresso do usuário:", err);
    return false;
  }
}

/**
 * Zera o progresso e o histórico de XP de TODOS os usuários.
 * @returns {Promise<boolean>}
 */
export async function zerarProgressoTodosUsuarios() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    await supabase.from("trilha_xp_historico").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    await supabase
      .from("trilha_progresso")
      .update({
        xp_total: 0,
        missoes_completas: 0,
        trilhas_completas: 0,
        ofensiva_dias: 0,
        ultima_atividade: null,
        progresso_por_trilha: {},
        atualizado_em: new Date().toISOString(),
      })
      .neq("email", "");

    return true;
  } catch (err) {
    console.error("[trilha] Erro ao zerar progresso de todos os usuários:", err);
    return false;
  }
}
