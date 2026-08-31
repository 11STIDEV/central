// ============================================================
// src/hooks/useTrilhas.ts
// Carrega trilhas exclusivamente do banco de dados (Supabase via API).
// Não utiliza nenhum dado estático.
// ============================================================

import { useState, useEffect, useRef } from "react";
import type { Trilha } from "@/data/trilhasMock";
import { carregarTrilhasApi } from "@/lib/trilhasStore";

export type UseTrilhasReturn = {
  trilhas: Trilha[];
  carregando: boolean;
};

/**
 * Carrega trilhas do servidor (Supabase).
 * Se não houver trilhas no banco de dados, retorna array vazio [].
 */
export function useTrilhas(): UseTrilhasReturn {
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
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
        setTrilhas(resultado ?? []);
      } catch {
        if (!cancelado) setTrilhas([]);
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
