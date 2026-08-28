// ============================================================
// src/hooks/useTrilhas.ts
// Carrega trilhas do servidor; fallback para dados estáticos.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { TRILHAS_MOCK, type Trilha } from "@/data/trilhasMock";
import { carregarTrilhasApi } from "@/lib/trilhasStore";

export type UseTrilhasReturn = {
  trilhas: Trilha[];
  carregando: boolean;
};

/**
 * Carrega trilhas do servidor (Supabase).
 * Se o servidor retornar null (Supabase não configurado ou sem trilhas cadastradas),
 * usa os dados estáticos de TRILHAS_MOCK como fallback.
 */
export function useTrilhas(): UseTrilhasReturn {
  const [trilhas, setTrilhas] = useState<Trilha[]>(TRILHAS_MOCK);
  const [carregando, setCarregando] = useState(true);
  const carregouRef = useRef(false);

  useEffect(() => {
    if (carregouRef.current) return;
    carregouRef.current = true;

    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      try {
        const resultado = await carregarTrilhasApi();
        if (cancelado) return;
        if (resultado !== null && resultado.length > 0) {
          setTrilhas(resultado);
        }
        // null = Supabase não configurado → mantém TRILHAS_MOCK
        // [] vazio → também mantém TRILHAS_MOCK (nenhuma trilha cadastrada ainda)
      } catch {
        // Mantém fallback estático silenciosamente
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      cancelado = true;
    };
  }, []);

  return { trilhas, carregando };
}
