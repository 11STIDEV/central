import crypto from "crypto";

/** Sessão inativa por 12h; renovada a cada uso (sliding). */
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 12 * 60 * 60 * 1000;

/** @typedef {{
 *   id: string,
 *   email: string,
 *   nome: string,
 *   picture?: string,
 *   papeis: string[],
 *   orgUnitPath: string|null,
 *   createdAt: number,
 *   lastActivityAt: number,
 *   expiresAt: number,
 * }} ServerSession */

/** @type {Map<string, ServerSession>} */
const sessions = new Map();

function agora() {
  return Date.now();
}

export function criarSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

/** @param {Omit<ServerSession, "id"|"createdAt"|"lastActivityAt"|"expiresAt">} data */
export function createSession(data) {
  const id = criarSessionId();
  const now = agora();
  /** @type {ServerSession} */
  const session = {
    id,
    email: data.email,
    nome: data.nome,
    picture: data.picture,
    papeis: data.papeis,
    orgUnitPath: data.orgUnitPath ?? null,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(id, session);
  return session;
}

/** @param {string} id @returns {ServerSession|null} */
export function getSession(id) {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= agora()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

/** @param {string} id @returns {ServerSession|null} */
export function touchSession(id) {
  const session = getSession(id);
  if (!session) return null;
  const now = agora();
  session.lastActivityAt = now;
  session.expiresAt = now + SESSION_TTL_MS;
  sessions.set(id, session);
  return session;
}

/** @param {string} id */
export function destroySession(id) {
  if (id) sessions.delete(id);
}

export function purgeExpiredSessions() {
  const now = agora();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
}

setInterval(purgeExpiredSessions, 15 * 60 * 1000).unref?.();
