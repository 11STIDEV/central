import type { Papel } from "./AuthProvider";

/** Rotas visíveis no menu mas sem acesso (em desenvolvimento / formulários em revisão). */
export const ROTAS_TEMPORARIAMENTE_BLOQUEADAS = new Set([
  "/vale-adiantamento",
  "/agenda-cci",
  "/base-conhecimento",
  "/documentos",
  "/controle-materiais-almoxarifado",
  "/financeiro/vales-adiantamento",
]);

function normalizarPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p;
}

export function isRotaTemporariamenteBloqueada(pathname: string): boolean {
  return ROTAS_TEMPORARIAMENTE_BLOQUEADAS.has(normalizarPath(pathname));
}

/** Papéis que ignoram o bloqueio temporário e acedem às rotas normalmente. */
export function isIsentoBloqueioTemporario(papeis: Papel[]): boolean {
  return papeis.includes("setape") || papeis.includes("painel_admin");
}

/** Bloqueio ativo para este utilizador (menu com cadeado + rota inacessível). */
export function isRotaBloqueadaParaUsuario(papeis: Papel[], pathname: string): boolean {
  return isRotaTemporariamenteBloqueada(pathname) && !isIsentoBloqueioTemporario(papeis);
}
