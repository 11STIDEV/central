import type { Papel } from "./AuthProvider";

/** Rotas visíveis no menu mas sem acesso (em desenvolvimento / formulários em revisão). */
export const ROTAS_TEMPORARIAMENTE_BLOQUEADAS = new Set([
  "/agenda-cci",
  "/base-conhecimento",
  "/documentos",
  "/controle-materiais-almoxarifado",
  "/reserva-espacos-equipamentos",
  "/minhas-reservas",
  "/trilha-conhecimento",
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

/** Advance-CCI em revisão — menu com cadeado; liberado só para administradores de papéis. */
export const ADVANCE_CCI_BLOQUEADO = true;

export function isRotaAdvanceCci(pathname: string): boolean {
  const path = normalizarPath(pathname);
  if (path === "/vale-adiantamento" || path === "/financeiro/vales-adiantamento") return true;
  return path === "/cci-pay" || path.startsWith("/cci-pay/");
}

export function isIsentoBloqueioAdvanceCci(papeis: Papel[]): boolean {
  return papeis.includes("admin");
}

/** Bloqueio ativo para este utilizador (menu com cadeado + rota inacessível). */
export function isRotaBloqueadaParaUsuario(papeis: Papel[], pathname: string): boolean {
  if (ADVANCE_CCI_BLOQUEADO && isRotaAdvanceCci(pathname) && !isIsentoBloqueioAdvanceCci(papeis)) {
    return true;
  }
  return isRotaTemporariamenteBloqueada(pathname) && !isIsentoBloqueioTemporario(papeis);
}
