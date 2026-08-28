// ============================================================
// src/lib/trilhasStore.ts
// Funções para chamar a API de CRUD de trilhas/missões
// ============================================================

import { apiUrl, centralFetch } from "@/lib/apiBase";
import type { Trilha, Missao, PerguntaQuiz, Dificuldade } from "@/data/trilhasMock";

export type TrilhaAdminPayload = {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  icone?: string;
  cor?: string;
  dificuldade?: Dificuldade;
  setorRestrito?: string;
  ativo?: boolean;
  ordem?: number;
};

export type MissaoPayload = {
  id: string;
  ordem?: number;
  titulo: string;
  descricao?: string;
  conteudo?: string;
  linkExterno?: string;
  xpRecompensa?: number;
  tempoEstimadoMin?: number;
  quiz?: PerguntaQuiz[];
};

/** Carrega trilhas ativas do servidor. Retorna null se o servidor usar fallback estático. */
export async function carregarTrilhasApi(): Promise<Trilha[] | null> {
  try {
    const res = await centralFetch(apiUrl("/api/trilhas"), { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.fonte === "estatico" || !Array.isArray(data.trilhas)) return null;
    return data.trilhas as Trilha[];
  } catch {
    return null;
  }
}

/** [Admin] Carrega todas as trilhas (inclusive inativas). */
export async function carregarTrilhasAdminApi(): Promise<Trilha[]> {
  const res = await centralFetch(apiUrl("/api/trilhas/admin"), { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.trilhas ?? []) as Trilha[];
}

/** [Admin] Cria uma nova trilha. */
export async function criarTrilhaApi(dados: TrilhaAdminPayload): Promise<Trilha> {
  const res = await centralFetch(apiUrl("/api/trilhas"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()).trilha as Trilha;
}

/** [Admin] Atualiza uma trilha. */
export async function atualizarTrilhaApi(id: string, dados: Partial<TrilhaAdminPayload>): Promise<void> {
  const res = await centralFetch(apiUrl(`/api/trilhas/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

/** [Admin] Exclui uma trilha. */
export async function excluirTrilhaApi(id: string): Promise<void> {
  const res = await centralFetch(apiUrl(`/api/trilhas/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

/** [Admin] Cria uma nova missão. */
export async function criarMissaoApi(trilhaId: string, dados: MissaoPayload): Promise<Missao> {
  const res = await centralFetch(apiUrl(`/api/trilhas/${trilhaId}/missoes`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()).missao as Missao;
}

/** [Admin] Atualiza uma missão. */
export async function atualizarMissaoApi(trilhaId: string, missaoId: string, dados: Partial<MissaoPayload>): Promise<void> {
  const res = await centralFetch(apiUrl(`/api/trilhas/${trilhaId}/missoes/${missaoId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

/** [Admin] Exclui uma missão. */
export async function excluirMissaoApi(trilhaId: string, missaoId: string): Promise<void> {
  const res = await centralFetch(apiUrl(`/api/trilhas/${trilhaId}/missoes/${missaoId}`), {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}
