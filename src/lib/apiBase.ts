/**
 * - Produção (build): base vazia = mesmo origem (Docker `node` serve `dist` + API) ou
 *   `VITE_API_BASE_URL` se front e API tiverem hosts diferentes.
 * - Dev: por defeito a API fala direto com `http://<host>:3001` (contorna o proxy do Vite, que
 *   nalguns ambientes devolve 405 a POST /api). Defina `VITE_USE_VITE_PROXY=1` no .env.local
 *   se quiser voltar ao proxy relativo a `/api`.
 */
import { isAuthTokenErrorBody } from "@/lib/authSession";
export const SESSION_HEADER_NAME = "X-Central-Session";
export const STORAGE_KEY_SERVER_SESSION = "central_server_session_id";

let centralSessionId: string | null = null;

export function getStoredSessionId(): string | null {
  if (centralSessionId) return centralSessionId;
  try {
    return localStorage.getItem(STORAGE_KEY_SERVER_SESSION);
  } catch {
    return null;
  }
}

export function setStoredSessionId(id: string | null): void {
  centralSessionId = id;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_SERVER_SESSION, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_SERVER_SESSION);
    }
  } catch {
    /* ignore */
  }
}

/** Sincroniza ID de sessão em memória (dev cross-port 8080↔3001). */
export function setCentralSessionId(id: string | null): void {
  setStoredSessionId(id);
}

/** Inicializa sessão da memória a partir do localStorage (chamado no boot). */
export function initCentralSessionFromStorage(): void {
  centralSessionId = null;
  const stored = getStoredSessionId();
  if (stored) centralSessionId = stored;
}

export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_USE_VITE_PROXY === "1") {
    return "";
  }
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.trim().replace(/\/+$/, "");
  }
  // Produção: o servidor Node pode injetar a base da API (sem rebuild) — ver CENTRAL_API_BASE_URL no .env
  if (import.meta.env.PROD && typeof document !== "undefined") {
    const m = document
      .querySelector('meta[name="central-api-base"]')
      ?.getAttribute("content")
      ?.trim();
    if (m) {
      return m.replace(/\/+$/, "");
    }
  }
  if (import.meta.env.DEV) {
    if (typeof window === "undefined") {
      return "";
    }
    const h = window.location.hostname;
    const host =
      h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" ? "127.0.0.1" : h;
    return `http://${host}:3001`;
  }
  return "";
}

/** Ex.: `apiUrl("/api/organizacao")` → URL absoluta ou relativa. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) return p;
  return `${base}${p}`;
}

type AuthExpiredHandler = () => void;

let authExpiredHandler: AuthExpiredHandler | null = null;

/** Registrado pelo AuthProvider para encerrar sessão quando a API rejeitar o token. */
export function registerAuthExpiredHandler(handler: AuthExpiredHandler | null): void {
  authExpiredHandler = handler;
}

function authFetchInit(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const sid = centralSessionId || getStoredSessionId();
  if (sid) {
    headers.set(SESSION_HEADER_NAME, sid);
  }
  return {
    ...init,
    credentials: "include",
    headers,
  };
}

/**
 * `fetch` autenticado com cookie/header de sessão e detecção de 401.
 * Preferir em chamadas autenticadas à API.
 */
export async function centralFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, authFetchInit(init));
  if (res.status === 401 && authExpiredHandler) {
    const text = await res.clone().text().catch(() => "");
    if (isAuthTokenErrorBody(text)) {
      authExpiredHandler();
    }
  }
  return res;
}

/** Corpo JSON para POST autenticados — idToken só como fallback legado. */
export function authJsonBody(
  fields: Record<string, unknown>,
  idToken?: string | null,
): string {
  const body: Record<string, unknown> = { ...fields };
  if (idToken) body.idToken = idToken;
  return JSON.stringify(body);
}
