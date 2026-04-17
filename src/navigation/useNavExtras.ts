import type { NavExtraLink } from "@/navigation/intranetNavConfig";

/**
 * Links extras por setor (futuro: `useQuery` Supabase, tabela tipo `intranet_nav_sector_links`).
 * Enquanto isso, retorna vazio — `mergeNavExtras` no layout continua sendo um no-op.
 */
export function useNavExtras(): NavExtraLink[] {
  return [];
}
