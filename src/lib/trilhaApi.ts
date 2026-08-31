// ============================================================
// src/lib/trilhaApi.ts
// Comunicação com os endpoints da API da Trilha de Conhecimento
// ============================================================

import { apiUrl, centralFetch, authJsonBody } from "@/lib/apiBase";
import type { UserProgress, RankingEntry } from "@/data/trilhasMock";

export type TrilhaProgressoRaw = {
  xpTotal: number;
  missoesCompletas: number;
  trilhasCompletas: number;
  ofensivaDias: number;
  progressoPorTrilha: Record<string, string[]>;
  ultimaAtividade?: string;
};

/**
 * Carrega o progresso do usuário autenticado do servidor.
 * Retorna null se não houver registro ou falhar.
 */
export async function carregarProgressoServidor(): Promise<TrilhaProgressoRaw | null> {
  try {
    const res = await centralFetch(apiUrl("/api/trilha/progresso/obter"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.progresso ?? null;
  } catch {
    return null;
  }
}

/**
 * Salva o progresso do usuário no servidor.
 * Se `xpGanho`, `trilhaId` e `missaoId` forem informados,
 * registra também no histórico semanal.
 */
export async function salvarProgressoServidor(
  progress: UserProgress,
  opts?: { xpGanho?: number; trilhaId?: string; missaoId?: string }
): Promise<{ ofensivaDias: number } | null> {
  try {
    const body = {
      xpTotal: progress.xpTotal,
      missoesCompletas: progress.missoesCompletas,
      trilhasCompletas: progress.trilhasCompletas,
      progressoPorTrilha: progress.progressoPorTrilha,
      ofensivaDiasAtual: progress.ofensivaDias,
      ...(opts?.xpGanho !== undefined ? { xpGanho: opts.xpGanho } : {}),
      ...(opts?.trilhaId ? { trilhaId: opts.trilhaId } : {}),
      ...(opts?.missaoId ? { missaoId: opts.missaoId } : {}),
    };

    const res = await centralFetch(apiUrl("/api/trilha/progresso/salvar"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { ofensivaDias: data.ofensivaDias ?? progress.ofensivaDias };
  } catch {
    return null;
  }
}

/**
 * Carrega o ranking semanal de XP do servidor.
 * Retorna array vazio se falhar.
 */
export async function carregarRankingSemanal(): Promise<RankingEntry[]> {
  try {
    const res = await centralFetch(apiUrl("/api/trilha/ranking-semanal"), {
      method: "GET",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.ranking ?? []) as RankingEntry[];
  } catch {
    return [];
  }
}
