import { getContextoFromSessionRequest } from "./sessionAuth.js";

const contextCache = new Map();
const authUserCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

function getValidCached(cache, key) {
  if (!key) return null;
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(cache, key, data) {
  if (!key) return;
  if (cache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * @param {{ verificarIdTokenUsuario: (idToken: string) => Promise<{ email: string, name?: string, picture?: string }>, resolverContextoChamados: (idToken: string) => Promise<object> }} deps
 */
export function createRequestAuth(deps) {
  const { verificarIdTokenUsuario, resolverContextoChamados } = deps;

  /** @param {import("express").Request} req */
  async function verificarAutenticacaoRequest(req) {
    if (req._cachedAuthUser) return req._cachedAuthUser;

    const ctx = getContextoFromSessionRequest(req);
    if (ctx) {
      const user = { email: ctx.email, name: ctx.nome, picture: ctx.picture };
      req._cachedAuthUser = user;
      return user;
    }

    const idToken = req.body?.idToken;
    if (idToken && typeof idToken === "string") {
      const cached = getValidCached(authUserCache, idToken);
      if (cached) {
        req._cachedAuthUser = cached;
        return cached;
      }
      const res = await verificarIdTokenUsuario(idToken);
      setCached(authUserCache, idToken, res);
      req._cachedAuthUser = res;
      return res;
    }

    const err = new Error("Sessão expirada ou não autenticado.");
    err.status = 401;
    throw err;
  }

  /** @param {import("express").Request} req */
  async function resolverContextoFromRequest(req) {
    if (req._cachedContext) return req._cachedContext;

    const fromSession = getContextoFromSessionRequest(req);
    if (fromSession) {
      req._cachedContext = fromSession;
      return fromSession;
    }

    const idToken = req.body?.idToken;
    if (idToken && typeof idToken === "string") {
      const cached = getValidCached(contextCache, idToken);
      if (cached) {
        req._cachedContext = cached;
        return cached;
      }
      const res = await resolverContextoChamados(idToken);
      setCached(contextCache, idToken, res);
      req._cachedContext = res;
      return res;
    }

    const err = new Error("Sessão expirada ou não autenticado.");
    err.status = 401;
    throw err;
  }

  return { verificarAutenticacaoRequest, resolverContextoFromRequest };
}

