// ============================================================
// server/trilhaProgressoStore.js
// Persistência do progresso da Trilha de Conhecimento no Supabase
// ============================================================

import { createClient } from "@supabase/supabase-js";

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
 * Calcula a ofensiva ao realizar uma atividade (missão ou trilha concluída).
 * @param {string|null} ultimaAtividade - YYYY-MM-DD da última atividade
 * @param {number} ofensivaDiasAtual - ofensiva atual registrada
 * @returns {{ ofensivaDias: number, ultimaAtividade: string }}
 */
function calcularOfensivaAoRealizarAtividade(ultimaAtividade, ofensivaDiasAtual) {
  const hoje = getDataHojeBrasil();
  if (!ultimaAtividade) {
    return { ofensivaDias: 1, ultimaAtividade: hoje };
  }

  const diff = calcularDiferencaDias(ultimaAtividade, hoje);

  if (diff === 0) {
    // Já realizou atividade hoje — mantém a ofensiva de hoje
    return { ofensivaDias: Math.max(ofensivaDiasAtual, 1), ultimaAtividade: hoje };
  }

  if (diff === 1) {
    // Realizou atividade ontem — sequência contínua mantida com sucesso!
    return { ofensivaDias: Math.max(ofensivaDiasAtual, 0) + 1, ultimaAtividade: hoje };
  }

  // diff >= 2: ficou mais de 24h / 1 dia inteiro sem atividade — quebrou a sequência.
  // Como completou uma missão hoje, inicia uma nova ofensiva de 1 dia!
  return { ofensivaDias: 1, ultimaAtividade: hoje };
}

/**
 * Carrega o progresso de um usuário pelo email.
 * Zera automaticamente a ofensiva se o usuário tiver ficado mais de 1 dia sem atividade.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function lerProgressoUsuario(email) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("trilha_progresso")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[trilha] lerProgressoUsuario:", error.message);
    return null;
  }

  if (!data) return null;

  const hoje = getDataHojeBrasil();
  const ultimaAtividade = data.ultima_atividade ? data.ultima_atividade.slice(0, 10) : null;
  let ofensivaDias = data.ofensiva_dias ?? 0;

  if (ultimaAtividade) {
    const diff = calcularDiferencaDias(ultimaAtividade, hoje);
    // diff === 0: fez atividade hoje -> ofensiva ativa
    // diff === 1: fez atividade ontem -> ofensiva ativa (aguardando atividade de hoje)
    // diff >= 2: ficou mais de 1 dia sem atividade -> ofensiva expirou e está ZERADA
    if (diff >= 2 && ofensivaDias > 0) {
      ofensivaDias = 0;
      // Atualiza no banco em background para manter consistência
      supabase
        .from("trilha_progresso")
        .update({ ofensiva_dias: 0 })
        .eq("email", email)
        .then(() => {})
        .catch((err) => console.error("[trilha] Erro ao sincronizar ofensiva zerada:", err));
    }
  } else {
    ofensivaDias = 0;
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

  // Busca o registro atual para calcular a ofensiva
  const { data: atual } = await supabase
    .from("trilha_progresso")
    .select("ofensiva_dias, ultima_atividade")
    .eq("email", email)
    .maybeSingle();

  const hoje = getDataHojeBrasil();
  const ultimaAtividadeAntiga = atual?.ultima_atividade ? atual.ultima_atividade.slice(0, 10) : null;
  const ofensivaBase = atual?.ofensiva_dias ?? ofensivaDiasAtual ?? 0;

  let novaOfensiva = ofensivaBase;
  let novaUltimaAtividade = ultimaAtividadeAntiga;

  if (teveAtividadeRealizada) {
    const res = calcularOfensivaAoRealizarAtividade(ultimaAtividadeAntiga, ofensivaBase);
    novaOfensiva = res.ofensivaDias;
    novaUltimaAtividade = res.ultimaAtividade;
  } else {
    if (ultimaAtividadeAntiga) {
      const diff = calcularDiferencaDias(ultimaAtividadeAntiga, hoje);
      if (diff >= 2) {
        novaOfensiva = 0;
      }
    } else {
      novaOfensiva = 0;
    }
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
