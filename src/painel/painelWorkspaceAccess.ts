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
