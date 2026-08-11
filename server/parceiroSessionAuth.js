import {
  createParceiroSession,
  destroyParceiroSession,
  touchParceiroSession,
} from "./parceiroSessionStore.js";

export const PARCEIRO_COOKIE_NAME = "parceiro_sid";
export const PARCEIRO_SESSION_HEADER = "x-parceiro-session";

/** @param {import("express").Request} req */
export function getParceiroSessionIdFromRequest(req) {
  const header = req.headers[PARCEIRO_SESSION_HEADER];
  const fromHeader = typeof header === "string" ? header.trim() : "";
  if (fromHeader) return fromHeader;
  const cookie = req.cookies?.[PARCEIRO_COOKIE_NAME];
  return typeof cookie === "string" && cookie.trim() ? cookie.trim() : null;
}

/** @param {import("express").Response} res @param {string} sessionId */
export function setParceiroSessionCookie(res, sessionId) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie(PARCEIRO_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
}

/** @param {import("express").Response} res */
export function clearParceiroSessionCookie(res) {
  res.clearCookie(PARCEIRO_COOKIE_NAME, { path: "/" });
}

/** @param {import("express").Request} req */
export function getParceiroFromRequest(req) {
  const sessionId = getParceiroSessionIdFromRequest(req);
  if (!sessionId) return null;
  const session = touchParceiroSession(sessionId);
  if (!session) return null;
  return {
    tipo: "parceiro",
    login: session.login,
    nome: session.nome,
    lojaId: session.lojaId,
    lojaNome: session.lojaNome,
    email: session.login,
    papeis: [],
  };
}

/** @param {import("express").Response} res @param {{ login: string, nome: string, lojaId: string, lojaNome: string }} operador */
export function iniciarSessaoParceiro(res, operador) {
  const session = createParceiroSession(operador);
  setParceiroSessionCookie(res, session.id);
  return session;
}

/** @param {import("express").Request} req @param {import("express").Response} [res] */
export function encerrarSessaoParceiro(req, res) {
  const sessionId = getParceiroSessionIdFromRequest(req);
  destroyParceiroSession(sessionId || "");
  if (res) clearParceiroSessionCookie(res);
}
