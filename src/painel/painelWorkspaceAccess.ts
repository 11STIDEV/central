import type { Papel } from "@/auth/AuthProvider";
import { podePainelSenhasAdministracao } from "@/auth/routeAccess";

/**
 * Atendente ou admin do painel: vem das OUs mapeadas em `mapearPapeis` (AuthProvider)
 * — prefixos Secretaria → painel_atendente; Setape/Direção → painel_admin — com
 * `orgUnitPath` preenchido após `POST /api/organizacao`.
 */
export function podePainelAtendente(papeis: Papel[]): boolean {
  return (
    papeis.includes("admin") ||
    papeis.includes("painel_admin") ||
    papeis.includes("painel_atendente") ||
    papeis.includes("secretaria")
  );
}

/** Totem, painel TV, `/senhas/admin`: papel `painel_admin`, `admin` global ou e-mail em `VITE_PAINEL_ADMIN_EMAILS`. */
export function podePainelAdmin(papeis: Papel[], email?: string | null): boolean {
  return podePainelSenhasAdministracao(papeis, email);
}
