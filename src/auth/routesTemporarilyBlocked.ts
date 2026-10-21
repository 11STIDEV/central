import type { Papel } from "./AuthProvider";

/** Rotas visíveis no menu mas sem acesso (em desenvolvimento / formulários em revisão). */
export const ROTAS_TEMPORARIAMENTE_BLOQUEADAS = new Set([
  "/base-conhecimento",
  "/documentos",
  "/controle-materiais-almoxarifado",
  // "/trilha-conhecimento", // [TEMPORÁRIO - TESTES LOCAIS]: Liberado para todos os papéis
]);

function normalizarPath(pathname: string): string {
  const semQuery = pathname.split("?")[0].split("#")[0];
  const p = semQuery.replace(/\/+$/, "") || "/";
  return p;
}

export function isRotaTemporariamenteBloqueada(pathname: string): boolean {
  return ROTAS_TEMPORARIAMENTE_BLOQUEADAS.has(normalizarPath(pathname));
}

/** Papéis que ignoram o bloqueio temporário e acedem às rotas normalmente. */
export function isIsentoBloqueioTemporario(papeis: Papel[]): boolean {
  return papeis.includes("setape") || papeis.includes("painel_admin");
}

/** Advance-CCI em revisão — menu com cadeado; liberado só para administradores de papéis e equipe DP/Financeiro. */
export const ADVANCE_CCI_BLOQUEADO = true;

export function isRotaAdvanceCci(pathname: string): boolean {
  const path = normalizarPath(pathname);
  if (path === "/vale-adiantamento" || path === "/financeiro/vales-adiantamento") return true;
  return path === "/cci-pay" || path.startsWith("/cci-pay/");
}

export function isIsentoBloqueioAdvanceCci(papeis: Papel[]): boolean {
  return papeis.some((p) =>
    [
      "admin",
      "ccipay_admin",
      "ccipay_dp",
      "dp",
      "financeiro",
      "gerente_dp",
      "gerente_financeiro",
    ].includes(p)
  );
}

/** Bloqueio ativo para este utilizador (menu com cadeado + rota inacessível). */
export function isRotaBloqueadaParaUsuario(papeis: Papel[], pathname: string): boolean {
  if (ADVANCE_CCI_BLOQUEADO && isRotaAdvanceCci(pathname) && !isIsentoBloqueioAdvanceCci(papeis)) {
    return true;
  }
  return isRotaTemporariamenteBloqueada(pathname) && !isIsentoBloqueioTemporario(papeis);
}
