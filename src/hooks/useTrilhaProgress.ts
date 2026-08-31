// ============================================================
// src/hooks/useTrilhaProgress.ts
// Hook central para progresso da Trilha de Conhecimento.
// Sincroniza Supabase (via servidor) ↔ localStorage (fallback offline).
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  USER_PROGRESS_MOCK,
  salvarProgressoUsuario as salvarLocal,
  calcularProgresso,
  atualizarBadgesConquistadas,
  type UserProgress,
  type RankingEntry,
} from "@/data/trilhasMock";
import {
  carregarProgressoServidor,
  salvarProgressoServidor,
  carregarRankingSemanal,
} from "@/lib/trilhaApi";

export type UseTrilhaProgressReturn = {
  progress: UserProgress;
  ranking: RankingEntry[];
  carregando: boolean;
  /** Salva progresso local + servidor. Opcional: informe xpGanho/trilhaId/missaoId para registrar no histórico. */
  salvarProgresso: (
    novoProgresso: UserProgress,
    opts?: { xpGanho?: number; trilhaId?: string; missaoId?: string }
  ) => Promise<void>;
};

export function useTrilhaProgress(): UseTrilhaProgressReturn {
  const [progress, setProgress] = useState<UserProgress>(USER_PROGRESS_MOCK);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregouRef = useRef(false);

  // Carrega progresso do servidor na montagem (uma única vez)
  useEffect(() => {
    if (carregouRef.current) return;
    carregouRef.current = true;

    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      try {
        // Carrega progresso e ranking em paralelo
        const [progressoServidor, rankingServidor] = await Promise.all([
          carregarProgressoServidor(),
          carregarRankingSemanal(),
        ]);

        if (cancelado) return;

        if (progressoServidor) {
          const stats = calcularProgresso(progressoServidor.progressoPorTrilha);
          const merged: UserProgress = {
            ...USER_PROGRESS_MOCK,
            ...progressoServidor,
            ...stats,
            ofensivaDias: progressoServidor.ofensivaDias ?? 0,
            ultimaAtividade: progressoServidor.ultimaAtividade ?? undefined,
          };
          atualizarBadgesConquistadas(merged);
          // Sincroniza com localStorage para fallback
          salvarLocal(merged);
          setProgress(merged);
        }

        // Atualiza o ranking apenas com dados reais do servidor
        setRanking(rankingServidor);
      } catch {
        // Silencia falhas — usa o estado atual (localStorage)
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      cancelado = true;
    };
  }, []);

  const salvarProgresso = useCallback(
    async (
      novoProgresso: UserProgress,
      opts?: { xpGanho?: number; trilhaId?: string; missaoId?: string }
    ) => {
      // 1. Salva localmente imediatamente (UI responsiva)
      salvarLocal(novoProgresso);
      setProgress(novoProgresso);

      // 2. Sincroniza com o servidor em background
      try {
        const resultado = await salvarProgressoServidor(novoProgresso, opts);
        if (resultado && typeof resultado.ofensivaDias === "number") {
          // Atualiza ofensiva calculada pelo servidor (mais confiável)
          const comOfensiva: UserProgress = {
            ...novoProgresso,
            ofensivaDias: resultado.ofensivaDias,
          };
          salvarLocal(comOfensiva);
          setProgress(comOfensiva);
        }

        // Recarrega ranking após ganho de XP
        if (opts?.xpGanho) {
          const novoRanking = await carregarRankingSemanal();
          setRanking(novoRanking);
        }
      } catch {
        // Silencia — o progresso local já foi salvo
      }
    },
    []
  );

  return { progress, ranking, carregando, salvarProgresso };
}
