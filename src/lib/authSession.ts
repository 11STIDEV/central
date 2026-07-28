/** Flag lida na tela de login após expiração automática da sessão. */
export const SESSION_EXPIRED_KEY = "central_sessao_expirada";

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64url = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64url.length % 4)) % 4;
    const base64 = base64url + "=".repeat(padLen);
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** ID token do Google expira (tipicamente ~1h); margem de 10s antes do vencimento. */
export function idTokenAindaValido(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 > Date.now() + 10_000;
}

/** Tempo restante até expirar (ms); null se token inválido ou já expirado. */
export function msAteExpirarToken(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  const restante = exp * 1000 - Date.now();
  return restante > 0 ? restante : null;
}

export function isAuthTokenErrorBody(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("token used too late") ||
    lower.includes("jwt expired") ||
    lower.includes("token expirado") ||
    (lower.includes("idtoken") && lower.includes("expir")) ||
    (lower.includes("id token") && lower.includes("expir"))
  );
}

export function marcarSessaoExpirada(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Retorna true uma vez se a sessão expirou desde o último login. */
export function consumirSessaoExpirada(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1") {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
