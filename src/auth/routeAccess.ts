import type { Papel } from "./AuthProvider";

/**
 * Rotas restritas: só usuários com **pelo menos um** dos papéis listados acessam.
 * Rotas não listadas aqui: qualquer usuário logado pode acessar.
 *
 * Regras de negócio (resumo):
 * - TI interno / Controle materiais TI → setape
 * - Almoxarifado → almoxarifado (OU /Administrativo/Almoxarifado)
 * - Financeiro vales → dp
 */
export const ROTAS_PAPEIS_OBRIGATORIOS: Record<string, Papel[]> = {
  "/admin/papeis-manuais": ["admin"],
  "/ti-interno": ["setape"],
  "/controle-materiais-ti": ["setape"],
  "/controle-materiais-almoxarifado": ["almoxarifado"],
  "/financeiro/vales-adiantamento": ["dp"],
  "/agenda-cci/admin": ["setape"],
};

/** Usuário só com papel `aluno` (além de `usuario`): acesso exclusivo à Agenda CCI. */
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
    return path === "/login" || path === "/agenda-cci";
  }
  const obrigatorios = ROTAS_PAPEIS_OBRIGATORIOS[path];
  if (!obrigatorios || obrigatorios.length === 0) return true;
  return obrigatorios.some((p) => papeis.includes(p));
}
