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
import { apiUrl, centralFetch } from "@/lib/apiBase";
import { calcularDiasDeEmpresa } from "@/lib/alterdataDeduplication";

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

        // Resolve ofensiva (dias de empresa). Se veio do servidor, usa; se vier zerado, tenta obter da API do Alterdata
        let ofensivaDias = progressoServidor?.ofensivaDias ?? 0;
        if (ofensivaDias === 0) {
          try {
            const resAlter = await centralFetch(apiUrl("/api/alterdata/funcionario/me"));
            if (resAlter.ok) {
              const dataAlter = await resAlter.json();
              const dt = dataAlter?.resumo?.primeiraAdmissao || dataAlter?.funcionario?.primeira_admissao;
              if (dt) {
                const dias = calcularDiasDeEmpresa(dt);
                if (typeof dias === "number" && dias > 0) {
                  ofensivaDias = dias;
                }
              }
            }
          } catch {
            /* ignora erro de rede/offline */
          }
        }

        if (progressoServidor) {
          const cacheTrilhas = getTrilhasCache();
          const stats = cacheTrilhas && cacheTrilhas.length > 0
            ? calcularProgresso(progressoServidor.progressoPorTrilha, cacheTrilhas)
            : null;

          const merged: UserProgress = {
            ...PROGRES_LIMPO,
            ...progressoServidor,
            // Prioriza sempre o xpTotal gravado no Supabase para evitar oscilações ou valores fictícios
            xpTotal: typeof progressoServidor.xpTotal === "number"
              ? progressoServidor.xpTotal
              : (stats?.xpTotal ?? 0),
            missoesCompletas: typeof progressoServidor.missoesCompletas === "number"
              ? progressoServidor.missoesCompletas
              : (stats?.missoesCompletas ?? 0),
            trilhasCompletas: typeof progressoServidor.trilhasCompletas === "number"
              ? progressoServidor.trilhasCompletas
              : (stats?.trilhasCompletas ?? 0),
            ofensivaDias: ofensivaDias,
            ultimaAtividade: progressoServidor.ultimaAtividade ?? undefined,
          };
          atualizarBadgesConquistadas(merged, cacheTrilhas);
          setProgress(merged);
        } else {
          // Se não há registro no Supabase, inicia com os dias de empresa do colaborador
          const inicial: UserProgress = {
            ...PROGRES_LIMPO,
            ofensivaDias: ofensivaDias,
          };
          setProgress(inicial);
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
      const cacheTrilhas = getTrilhasCache();
      const stats = cacheTrilhas && cacheTrilhas.length > 0
        ? calcularProgresso(novoProgresso.progressoPorTrilha, cacheTrilhas)
        : null;

      const atualizado: UserProgress = {
        ...novoProgresso,
        xpTotal: typeof novoProgresso.xpTotal === "number"
          ? novoProgresso.xpTotal
          : (stats?.xpTotal ?? 0),
        missoesCompletas: stats?.missoesCompletas ?? novoProgresso.missoesCompletas,
        trilhasCompletas: stats?.trilhasCompletas ?? novoProgresso.trilhasCompletas,
      };
      atualizarBadgesConquistadas(atualizado, cacheTrilhas);
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

