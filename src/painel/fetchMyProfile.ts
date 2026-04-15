import { getPainelSupabase } from "@/painel/supabaseClient";
import type { Profile } from "@/painel/types/database";

/** Lê o perfil do usuário logado via RPC (contorna RLS quando o SELECT direto falha). */
export async function fetchMyProfile(): Promise<Profile | null> {
  const supabase = getPainelSupabase();
  const { data, error } = await supabase.rpc("painel_my_profile");
  if (error) return null;
  const rows = data as Profile[] | null;
  return rows?.[0] ?? null;
}
