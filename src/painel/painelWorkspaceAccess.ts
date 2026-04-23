import type { Papel } from "@/auth/AuthProvider";

/** Atendente ou admin do painel (OU) ou admin global da Central. */
export function podePainelAtendente(papeis: Papel[]): boolean {
  return (
    papeis.includes("admin") ||
    papeis.includes("painel_admin") ||
    papeis.includes("painel_atendente")
  );
}

/** Área de administração do painel de senhas. */
export function podePainelAdmin(papeis: Papel[]): boolean {
  return papeis.includes("admin") || papeis.includes("painel_admin");
}

function emailNaListaLocalPainel(email: string | null | undefined): boolean {
  const raw = import.meta.env.VITE_PAINEL_LOCAL_ALLOW_EMAILS?.trim() || "";
  if (!raw || !email) return false;
  const allow = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return allow.has(email.toLowerCase());
}

/**
 * Replica o que o `AuthProvider` faria com `VITE_PAINEL_LOCAL_ALLOW_EMAILS` (útil com API off
 * ou se o clique ainda não atualizou os papéis) para montar perfil/rotas.
 */
export function papeisComFallbackListaLocal(
  papeis: Papel[],
  email: string | null | undefined,
): Papel[] {
  if (!emailNaListaLocalPainel(email)) return papeis;
  let out = Array.from(new Set(papeis));
  if (!out.includes("painel_atendente")) {
    out = [...out, "painel_atendente"];
  }
  if (import.meta.env.VITE_PAINEL_LOCAL_ROLE === "admin" && !out.includes("painel_admin")) {
    out = [...out, "painel_admin"];
  }
  return out;
}
