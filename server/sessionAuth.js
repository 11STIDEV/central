import {
  createSession,
  destroySession,
  getSession,
  touchSession,
} from "./sessionStore.js";
import { contextoViewerFromSession } from "./userContext.js";

export const SESSION_COOKIE_NAME = "central_sid";
export const SESSION_HEADER_NAME = "x-central-session";

/**
 * @param {import("express").Request} req
 * @returns {string|null}
 */
export function getSessionIdFromRequest(req) {
  const header = req.headers[SESSION_HEADER_NAME];
  const fromHeader = typeof header === "string" ? header.trim() : "";
  if (fromHeader) return fromHeader;
  const cookie = req.cookies?.[SESSION_COOKIE_NAME];
  return typeof cookie === "string" && cookie.trim() ? cookie.trim() : null;
}

/**
 * @param {import("express").Response} res
 * @param {string} sessionId
 */
export function setSessionCookie(res, sessionId) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure,
    sameSite: secure ? "lax" : "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
}

/** @param {import("express").Response} res */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

/**
 * @param {import("express").Request} req
 * @returns {ReturnType<typeof contextoViewerFromSession>|null}
 */
export function getContextoFromSessionRequest(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;
  const session = touchSession(sessionId);
  if (!session) return null;
  return contextoViewerFromSession(session);
}

/**
 * @param {import("express").Response} res
 * @param {{ email: string, nome: string, picture?: string, papeis: string[], orgUnitPath?: string|null }} user
 */
export function iniciarSessaoUsuario(res, user) {
  const session = createSession({
    email: user.email,
    nome: user.nome,
    picture: user.picture,
    papeis: user.papeis,
    orgUnitPath: user.orgUnitPath ?? null,
  });
  setSessionCookie(res, session.id);
  return session;
}

/** @param {import("express").Request} req @param {import("express").Response} [res] */
export function encerrarSessaoRequest(req, res) {
  const sessionId = getSessionIdFromRequest(req);
  destroySession(sessionId || "");
  if (res) clearSessionCookie(res);
}
