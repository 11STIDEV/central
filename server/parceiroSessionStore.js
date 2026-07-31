import crypto from "crypto";

export const PARCEIRO_SESSION_TTL_MS =
  Number(process.env.PARCEIRO_SESSION_TTL_MS) || 12 * 60 * 60 * 1000;

/** @typedef {{
 *   id: string,
 *   login: string,
 *   nome: string,
 *   lojaId: string,
 *   lojaNome: string,
 *   createdAt: number,
 *   lastActivityAt: number,
 *   expiresAt: number,
 * }} ParceiroSession */

/** @type {Map<string, ParceiroSession>} */
const sessions = new Map();

function agora() {
  return Date.now();
}

export function criarParceiroSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

/** @param {Omit<ParceiroSession, "id"|"createdAt"|"lastActivityAt"|"expiresAt">} data */
export function createParceiroSession(data) {
  const id = criarParceiroSessionId();
  const now = agora();
  /** @type {ParceiroSession} */
  const session = {
    id,
    login: data.login,
    nome: data.nome,
    lojaId: data.lojaId,
    lojaNome: data.lojaNome,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + PARCEIRO_SESSION_TTL_MS,
  };
  sessions.set(id, session);
  return session;
}

/** @param {string} id @returns {ParceiroSession|null} */
export function getParceiroSession(id) {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= agora()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

/** @param {string} id @returns {ParceiroSession|null} */
export function touchParceiroSession(id) {
  const session = getParceiroSession(id);
  if (!session) return null;
  const now = agora();
  session.lastActivityAt = now;
  session.expiresAt = now + PARCEIRO_SESSION_TTL_MS;
  sessions.set(id, session);
  return session;
}

/** @param {string} id */
export function destroyParceiroSession(id) {
  if (id) sessions.delete(id);
}
