import type { PainelSupabaseAuthState } from "@/painel/PainelSupabaseAuthContext";
import { isPainelDbOnly } from "@/painel/painelEnv";

/** Erro típico quando o Google não está ativado em Authentication → Providers no Supabase. */
export function isGoogleAuthProviderDisabledError(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("not enabled") ||
    m.includes("provider") && m.includes("google") ||
    m.includes("accounts.google.com")
  );
}

/**
 * Usa Supabase só como banco (sem `signInWithIdToken`): `VITE_PAINEL_DB_ONLY=true`
 * ou fallback automático quando o provedor Google não está habilitado no Supabase.
 */
export function painelUsesDbOnlyMode(auth: PainelSupabaseAuthState): boolean {
  if (isPainelDbOnly()) return true;
  return auth.status === "ready" && auth.useDbOnly === true;
}
