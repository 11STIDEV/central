import type { Papel } from "@/auth/AuthProvider";
import { isPainelAdminEmail } from "@/painel/painelEnv";

/**
 * Atendente ou admin do painel: vem das OUs mapeadas em `mapearPapeis` (AuthProvider)
 * — prefixos Secretaria → painel_atendente; Setape/Direção → painel_admin — com
 * `orgUnitPath` preenchido após `POST /api/organizacao`.
 */
export function podePainelAtendente(papeis: Papel[]): boolean {
  return (
    papeis.includes("admin") ||
    papeis.includes("painel_admin") ||
    papeis.includes("painel_atendente")
  );
}

/** Área de administração do painel de senhas: admin global ou e-mail autorizado no `.env.local`. */
export function podePainelAdmin(papeis: Papel[], email?: string | null): boolean {
  return papeis.includes("admin") || isPainelAdminEmail(email);
}
