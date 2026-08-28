// ============================================================
// server/trilhaProgressoStore.js
// Persistência do progresso da Trilha de Conhecimento no Supabase
// ============================================================

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Calcula a nova ofensiva de dias consecutivos.
 * @param {string|null} ultimaAtividade — ISO date (YYYY-MM-DD) do último acesso
 * @param {number} ofensivaDiasAtual
 * @returns {{ ofensivaDias: number, ultimaAtividade: string }}
 */
function calcularOfensiva(ultimaAtividade, ofensivaDiasAtual) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (!ultimaAtividade) {
    return { ofensivaDias: 1, ultimaAtividade: hoje };
  }
  if (ultimaAtividade === hoje) {
    // Já contou hoje — mantém
    return { ofensivaDias: ofensivaDiasAtual, ultimaAtividade: hoje };
  }
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (ultimaAtividade === ontem) {
    // Dia consecutivo — incrementa
    return { ofensivaDias: ofensivaDiasAtual + 1, ultimaAtividade: hoje };
  }
  // Quebrou a sequência — reseta
  return { ofensivaDias: 1, ultimaAtividade: hoje };
}

/**
 * Carrega o progresso de um usuário pelo email.
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

  return {
    xpTotal: data.xp_total,
    missoesCompletas: data.missoes_completas,
    trilhasCompletas: data.trilhas_completas,
    ofensivaDias: data.ofensiva_dias,
    progressoPorTrilha: data.progresso_por_trilha ?? {},
    ultimaAtividade: data.ultima_atividade,
  };
}

/**
 * Salva o progresso de um usuário no Supabase.
 * Calcula a ofensiva automaticamente com base na ultima_atividade.
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
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  // Busca o registro atual apenas para calcular a ofensiva
  const { data: atual } = await supabase
    .from("trilha_progresso")
    .select("ofensiva_dias, ultima_atividade")
    .eq("email", email)
    .maybeSingle();

  const ofensivaBase = atual?.ofensiva_dias ?? ofensivaDiasAtual ?? 0;
  const { ofensivaDias, ultimaAtividade } = calcularOfensiva(
    atual?.ultima_atividade ?? null,
    ofensivaBase
  );

  const row = {
    email,
    nome: nome ?? null,
    avatar_url: avatarUrl ?? null,
    xp_total: xpTotal,
    missoes_completas: missoesCompletas,
    trilhas_completas: trilhasCompletas,
    ofensiva_dias: ofensivaDias,
    ultima_atividade: ultimaAtividade,
    progresso_por_trilha: progressoPorTrilha ?? {},
  };

  const { error } = await supabase
    .from("trilha_progresso")
    .upsert(row, { onConflict: "email" });

  if (error) {
    console.error("[trilha] salvarProgressoUsuario:", error.message);
    return null;
  }

  return { ofensivaDias, ultimaAtividade };
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
