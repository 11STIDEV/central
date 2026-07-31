import { type Papel, type UsuarioLogado } from "@/auth/AuthProvider";
import {
  apiUrl,
  centralFetch,
  setStoredSessionId,
} from "@/lib/apiBase";

export type SessaoServidorUser = {
  nome: string;
  email: string;
  picture?: string;
  papeis: Papel[];
};

function usuarioFromSessao(user: SessaoServidorUser): UsuarioLogado {
  return {
    nome: user.nome,
    email: user.email,
    picture: user.picture,
    papeis: user.papeis,
  };
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const AUTH_FETCH_TIMEOUT_MS = 8_000;

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  try {
    return await centralFetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/** Troca ID token Google por sessão de servidor (~12h). */
export async function criarSessaoServidor(idToken: string): Promise<UsuarioLogado | null> {
  const res = await authFetch(apiUrl("/api/auth/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const sessionId =
    typeof data.sessionId === "string" && data.sessionId.trim() ? data.sessionId.trim() : null;
  if (sessionId) setStoredSessionId(sessionId);

  const user = data.user as SessaoServidorUser | undefined;
  if (!user?.email) return null;
  return usuarioFromSessao(user);
}

/** Restaura usuário da sessão de servidor (cookie ou header). */
export async function obterSessaoServidor(): Promise<UsuarioLogado | null> {
  const res = await authFetch(apiUrl("/api/auth/me"), { method: "GET" });
  if (res.status === 401) {
    setStoredSessionId(null);
    return null;
  }
  const data = await parseJson(res);
  if (!res.ok) return null;

  const sessionId =
    typeof data.sessionId === "string" && data.sessionId.trim() ? data.sessionId.trim() : null;
  if (sessionId) setStoredSessionId(sessionId);

  const user = data.user as SessaoServidorUser | undefined;
  if (!user?.email) return null;
  return usuarioFromSessao(user);
}

/** Encerra sessão de servidor. */
export async function encerrarSessaoServidor(): Promise<void> {
  try {
    await centralFetch(apiUrl("/api/auth/logout"), { method: "POST" });
  } catch {
    /* ignore */
  }
  setStoredSessionId(null);
}
