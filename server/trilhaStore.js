// ============================================================
// server/trilhaStore.js
// CRUD de trilhas e missões de conhecimento no Supabase
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

/** Converte linha do banco para o tipo Trilha do frontend. */
function rowToTrilha(row, missoes = []) {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao ?? "",
    categoria: row.categoria ?? "",
    icone: row.icone ?? "📚",
    cor: row.cor ?? "from-indigo-500 to-blue-600",
    dificuldade: row.dificuldade ?? "iniciante",
    setorRestrito: row.setor_restrito ?? undefined,
    xpTotal: missoes.reduce((acc, m) => acc + (m.xp_recompensa ?? 5), 0) + 10,
    missoes: missoes.map(rowToMissao),
    _ativo: row.ativo,
    _ordem: row.ordem,
  };
}

/** Converte linha do banco para o tipo Missao do frontend. */
function rowToMissao(row) {
  return {
    id: row.id,
    trilhaId: row.trilha_id,
    ordem: row.ordem,
    titulo: row.titulo,
    descricao: row.descricao ?? "",
    conteudo: row.conteudo ?? "",
    linkExterno: row.link_externo ?? undefined,
    xpRecompensa: row.xp_recompensa ?? 5,
    tempoEstimadoMin: row.tempo_estimado_min ?? 10,
    quiz: Array.isArray(row.quiz) ? row.quiz : [],
  };
}

/**
 * Lista todas as trilhas ativas com suas missões, ordenadas.
 * @returns {Promise<Array>}
 */
export async function listarTrilhas() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null; // null = não configurado (usar fallback estático)

  const { data: trilhasRows, error: errT } = await supabase
    .from("trilhas_conhecimento")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (errT) {
    console.error("[trilhaStore] listarTrilhas:", errT.message);
    return null;
  }

  if (!trilhasRows || trilhasRows.length === 0) return [];

  const ids = trilhasRows.map((t) => t.id);
  const { data: missoesRows, error: errM } = await supabase
    .from("trilhas_missoes")
    .select("*")
    .in("trilha_id", ids)
    .order("ordem", { ascending: true });

  if (errM) {
    console.error("[trilhaStore] listarTrilhas (missões):", errM.message);
    return null;
  }

  const missoesPorTrilha = {};
  for (const m of missoesRows ?? []) {
    if (!missoesPorTrilha[m.trilha_id]) missoesPorTrilha[m.trilha_id] = [];
    missoesPorTrilha[m.trilha_id].push(m);
  }

  return trilhasRows.map((t) => rowToTrilha(t, missoesPorTrilha[t.id] ?? []));
}

/**
 * Lista trilhas para o painel admin (inclui inativas).
 */
export async function listarTrilhasAdmin() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: trilhasRows, error: errT } = await supabase
    .from("trilhas_conhecimento")
    .select("*")
    .order("ordem", { ascending: true });

  if (errT) {
    console.error("[trilhaStore] listarTrilhasAdmin:", errT.message);
    return null;
  }

  if (!trilhasRows || trilhasRows.length === 0) return [];

  const ids = trilhasRows.map((t) => t.id);
  const { data: missoesRows, error: errM } = await supabase
    .from("trilhas_missoes")
    .select("*")
    .in("trilha_id", ids)
    .order("ordem", { ascending: true });

  if (errM) {
    console.error("[trilhaStore] listarTrilhasAdmin (missões):", errM.message);
    return null;
  }

  const missoesPorTrilha = {};
  for (const m of missoesRows ?? []) {
    if (!missoesPorTrilha[m.trilha_id]) missoesPorTrilha[m.trilha_id] = [];
    missoesPorTrilha[m.trilha_id].push(m);
  }

  return trilhasRows.map((t) => ({
    ...rowToTrilha(t, missoesPorTrilha[t.id] ?? []),
    ativo: t.ativo,
    ordem: t.ordem,
  }));
}

/**
 * Cria uma nova trilha.
 */
export async function criarTrilha(dados) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { id, titulo, descricao, categoria, icone, cor, dificuldade, setorRestrito, ativo, ordem } = dados;
  if (!id || !titulo) throw new Error("id e titulo são obrigatórios.");

  const { data, error } = await supabase
    .from("trilhas_conhecimento")
    .insert({
      id,
      titulo,
      descricao: descricao ?? "",
      categoria: categoria ?? "",
      icone: icone ?? "📚",
      cor: cor ?? "from-indigo-500 to-blue-600",
      dificuldade: dificuldade ?? "iniciante",
      setor_restrito: setorRestrito ?? null,
      ativo: ativo !== false,
      ordem: ordem ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTrilha(data, []);
}

/**
 * Atualiza uma trilha existente.
 */
export async function atualizarTrilha(id, dados) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase não configurado.");

  const updates = {};
  if (dados.titulo !== undefined) updates.titulo = dados.titulo;
  if (dados.descricao !== undefined) updates.descricao = dados.descricao;
  if (dados.categoria !== undefined) updates.categoria = dados.categoria;
  if (dados.icone !== undefined) updates.icone = dados.icone;
  if (dados.cor !== undefined) updates.cor = dados.cor;
  if (dados.dificuldade !== undefined) updates.dificuldade = dados.dificuldade;
  if (dados.setorRestrito !== undefined) updates.setor_restrito = dados.setorRestrito || null;
  if (dados.ativo !== undefined) updates.ativo = dados.ativo;
  if (dados.ordem !== undefined) updates.ordem = dados.ordem;

  const { error } = await supabase
    .from("trilhas_conhecimento")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Exclui uma trilha (cascateia as missões pelo FK).
 */
export async function excluirTrilha(id) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase.from("trilhas_conhecimento").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Cria uma nova missão dentro de uma trilha.
 */
export async function criarMissao(trilhaId, dados) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { id, ordem, titulo, descricao, conteudo, linkExterno, xpRecompensa, tempoEstimadoMin, quiz } = dados;
  if (!id || !titulo) throw new Error("id e titulo são obrigatórios.");

  const { data, error } = await supabase
    .from("trilhas_missoes")
    .insert({
      id,
      trilha_id: trilhaId,
      ordem: ordem ?? 1,
      titulo,
      descricao: descricao ?? "",
      conteudo: conteudo ?? "",
      link_externo: linkExterno ?? null,
      xp_recompensa: xpRecompensa ?? 5,
      tempo_estimado_min: tempoEstimadoMin ?? 10,
      quiz: quiz ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToMissao(data);
}

/**
 * Atualiza uma missão existente.
 */
export async function atualizarMissao(missaoId, dados) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase não configurado.");

  const updates = {};
  if (dados.ordem !== undefined) updates.ordem = dados.ordem;
  if (dados.titulo !== undefined) updates.titulo = dados.titulo;
  if (dados.descricao !== undefined) updates.descricao = dados.descricao;
  if (dados.conteudo !== undefined) updates.conteudo = dados.conteudo;
  if (dados.linkExterno !== undefined) updates.link_externo = dados.linkExterno || null;
  if (dados.xpRecompensa !== undefined) updates.xp_recompensa = dados.xpRecompensa;
  if (dados.tempoEstimadoMin !== undefined) updates.tempo_estimado_min = dados.tempoEstimadoMin;
  if (dados.quiz !== undefined) updates.quiz = dados.quiz;

  const { error } = await supabase
    .from("trilhas_missoes")
    .update(updates)
    .eq("id", missaoId);

  if (error) throw new Error(error.message);
}

/**
 * Exclui uma missão.
 */
export async function excluirMissao(missaoId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase.from("trilhas_missoes").delete().eq("id", missaoId);
  if (error) throw new Error(error.message);
}
