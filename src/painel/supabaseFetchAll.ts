import type { PostgrestError } from "@supabase/supabase-js";

/** Limite padrão do PostgREST/Supabase por request. */
export const SUPABASE_PAGE_SIZE = 1000;

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Busca todas as linhas de uma query paginando com `.range()`.
 * `buildQuery` deve retornar um builder novo a cada chamada (antes do `.range()`).
 */
export async function fetchAllRows<T>(
  buildQuery: () => { range: (from: number, to: number) => QueryResult<T> },
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const all: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + SUPABASE_PAGE_SIZE - 1);
    if (error) return { data: all, error };
    const page = data ?? [];
    all.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    offset += SUPABASE_PAGE_SIZE;
  }

  return { data: all, error: null };
}

/** Executa `.in(column, values)` em lotes para evitar limites de URL/tamanho do filtro. */
export async function fetchByInChunks<T, Id extends string>(
  buildQuery: (ids: Id[]) => QueryResult<T>,
  ids: Id[],
  chunkSize = 150,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  if (!ids.length) return { data: [], error: null };

  const all: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await buildQuery(chunk);
    if (error) return { data: all, error };
    if (data?.length) all.push(...data);
  }

  return { data: all, error: null };
}
