import type { Papel } from "@/auth/AuthProvider";

/**
 * Hub, atendente e demais rotas do painel (exceto admin): OU Secretaria ou Setape,
 * ou papéis manuais / admin global.
 */
export function podePainelAtendente(papeis: Papel[]): boolean {
  return (
    papeis.includes("admin") ||
    papeis.includes("secretaria") ||
    papeis.includes("setape") ||
    papeis.includes("painel_atendente")
  );
}

/** Administração do painel: somente OU Setape (ou equivalentes manuais / admin global). */
export function podePainelAdmin(papeis: Papel[]): boolean {
  return (
    papeis.includes("admin") ||
    papeis.includes("setape") ||
    papeis.includes("painel_admin")
  );
}
