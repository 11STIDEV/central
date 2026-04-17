import type { Papel } from "./AuthProvider";

/**
 * Rotas restritas: só usuários com **pelo menos um** dos papéis listados acessam.
 * Rotas não listadas: qualquer usuário logado pode acessar (exceto regra `isSomenteAluno`).
 */
export const ROTAS_PAPEIS_OBRIGATORIOS: Record<string, Papel[]> = {
  "/admin/papeis-manuais": ["admin"],
};

/** Usuário só com papel `aluno` (além de `usuario`): nesta branch, acesso à home e ao hub do painel (totem e TV). */
export function isSomenteAluno(papeis: Papel[]): boolean {
  if (papeis.includes("admin")) return false;
  if (!papeis.includes("aluno")) return false;
  return papeis.every((p) => p === "usuario" || p === "aluno");
}

function normalizarPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p;
}

/** Indica se o usuário (pelos papéis) pode acessar a rota. Rotas não restritas → true. */
export function canAccessRoute(papeis: Papel[], pathname: string): boolean {
  const path = normalizarPath(pathname);
  if (papeis.includes("admin")) return true;
  if (isSomenteAluno(papeis)) {
    return (
      path === "/login" ||
      path === "/" ||
      path === "/senhas" ||
      path.startsWith("/senhas/totem") ||
      path.startsWith("/senhas/painel")
    );
  }
  const obrigatorios = ROTAS_PAPEIS_OBRIGATORIOS[path];
  if (!obrigatorios || obrigatorios.length === 0) return true;
  return obrigatorios.some((p) => papeis.includes(p));
}
