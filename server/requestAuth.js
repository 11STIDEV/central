import { getContextoFromSessionRequest } from "./sessionAuth.js";

/**
 * @param {{ verificarIdTokenUsuario: (idToken: string) => Promise<{ email: string, name?: string, picture?: string }>, resolverContextoChamados: (idToken: string) => Promise<object> }} deps
 */
export function createRequestAuth(deps) {
  const { verificarIdTokenUsuario, resolverContextoChamados } = deps;

  /** @param {import("express").Request} req */
  async function verificarAutenticacaoRequest(req) {
    const ctx = getContextoFromSessionRequest(req);
    if (ctx) {
      return { email: ctx.email, name: ctx.nome, picture: ctx.picture };
    }

    const idToken = req.body?.idToken;
    if (idToken && typeof idToken === "string") {
      return verificarIdTokenUsuario(idToken);
    }

    const err = new Error("Sessão expirada ou não autenticado.");
    err.status = 401;
    throw err;
  }

  /** @param {import("express").Request} req */
  async function resolverContextoFromRequest(req) {
    const fromSession = getContextoFromSessionRequest(req);
    if (fromSession) return fromSession;

    const idToken = req.body?.idToken;
    if (idToken && typeof idToken === "string") {
      return resolverContextoChamados(idToken);
    }

    const err = new Error("Sessão expirada ou não autenticado.");
    err.status = 401;
    throw err;
  }

  return { verificarAutenticacaoRequest, resolverContextoFromRequest };
}
