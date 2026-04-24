import type { Papel } from "@/auth/AuthProvider";

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

/** Área de administração do painel de senhas (OU Setape/Direção ou admin global). */
export function podePainelAdmin(papeis: Papel[]): boolean {
  return papeis.includes("admin") || papeis.includes("painel_admin");
}
