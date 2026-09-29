// ============================================================
// src/hooks/useTrilhaProgress.ts
// Hook central para progresso da Trilha de Conhecimento.
// O Supabase é a ÚNICA fonte de verdade dos dados (sem localStorage).
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  USER_PROGRESS_MOCK,
  calcularProgresso,
  atualizarBadgesConquistadas,
  type UserProgress,
  type RankingEntry,
} from "@/data/trilhasMock";
import {
  carregarProgressoServidor,
  salvarProgressoServidor,
  carregarRankingSemanal,
  zerarProgressoServidor,
} from "@/lib/trilhaApi";
import { getTrilhasCache } from "@/lib/trilhasStore";

export type UseTrilhaProgressReturn = {
  progress: UserProgress;
  ranking: RankingEntry[];
  carregando: boolean;
  /** Salva progresso diretamente no Supabase. Opcional: informe xpGanho/trilhaId/missaoId para registrar no histórico. */
  salvarProgresso: (
    novoProgresso: UserProgress,
    opts?: { xpGanho?: number; trilhaId?: string; missaoId?: string }
  ) => Promise<void>;
  /** Zera o progresso do usuário no Supabase */
  zerarProgresso: () => Promise<void>;
};

const PROGRES_LIMPO: UserProgress = {
  ...USER_PROGRESS_MOCK,
  xpTotal: 0,
  missoesCompletas: 0,
  trilhasCompletas: 0,
  ofensivaDias: 0,
  progressoPorTrilha: {},
  ultimaAtividade: undefined,
  nivel: 1,
  xpProximoNivel: 100,
};

export function useTrilhaProgress(): UseTrilhaProgressReturn {
  const [progress, setProgress] = useState<UserProgress>(PROGRES_LIMPO);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregouRef = useRef(false);

  // Garante que qualquer resíduo antigo do localStorage seja expurgado
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("central-trilha-progress");
      } catch {}
    }
  }, []);

  // Carrega progresso diretamente do Supabase na montagem
  useEffect(() => {
    if (carregouRef.current) return;
    carregouRef.current = true;

    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      try {
        const [progressoServidor, rankingServidor] = await Promise.all([
          carregarProgressoServidor(),
          carregarRankingSemanal(),
        ]);

        if (cancelado) return;

        if (progressoServidor) {
          const stats = calcularProgresso(progressoServidor.progressoPorTrilha, getTrilhasCache());
          const merged: UserProgress = {
            ...PROGRES_LIMPO,
            ...progressoServidor,
            ...stats,
            ofensivaDias: progressoServidor.ofensivaDias ?? 0,
            ultimaAtividade: progressoServidor.ultimaAtividade ?? undefined,
          };
          atualizarBadgesConquistadas(merged, getTrilhasCache());
          setProgress(merged);
        } else {
          // Se não há registro no Supabase, o usuário está zerado
          setProgress(PROGRES_LIMPO);
        }

        setRanking(rankingServidor);
      } catch {
        setProgress(PROGRES_LIMPO);
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
      const stats = calcularProgresso(novoProgresso.progressoPorTrilha, getTrilhasCache());
      const atualizado: UserProgress = {
        ...novoProgresso,
        ...stats,
      };
      atualizarBadgesConquistadas(atualizado, getTrilhasCache());
      setProgress(atualizado);

      // Persiste exclusivamente no Supabase via servidor
      try {
        const resultado = await salvarProgressoServidor(atualizado, opts);
        if (resultado && typeof resultado.ofensivaDias === "number") {
          const comOfensiva: UserProgress = {
            ...atualizado,
            ofensivaDias: resultado.ofensivaDias,
          };
          setProgress(comOfensiva);
        }

        if (opts?.xpGanho) {
          const novoRanking = await carregarRankingSemanal();
          setRanking(novoRanking);
        }
      } catch (err) {
        console.error("[useTrilhaProgress] Erro ao sincronizar com Supabase:", err);
      }
    },
    []
  );

  const zerarProgresso = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("central-trilha-progress");
      } catch {}
    }
    atualizarBadgesConquistadas(PROGRES_LIMPO, getTrilhasCache());
    setProgress(PROGRES_LIMPO);
    setRanking([]);

    await zerarProgressoServidor();
  }, []);

  return { progress, ranking, carregando, salvarProgresso, zerarProgresso };
}

