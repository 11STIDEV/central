import { apiUrl, getApiBaseUrl } from "@/lib/apiBase";

export const PARCEIRO_SESSION_HEADER = "X-Parceiro-Session";
export const STORAGE_KEY_PARCEIRO_SESSION = "parceiro_server_session_id";

export type ParceiroOperador = {
  login: string;
  nome: string;
  lojaId: string;
  lojaNome: string;
};

let parceiroSessionId: string | null = null;

export function getStoredParceiroSessionId(): string | null {
  if (parceiroSessionId) return parceiroSessionId;
  try {
    return localStorage.getItem(STORAGE_KEY_PARCEIRO_SESSION);
  } catch {
    return null;
  }
}

export function setStoredParceiroSessionId(id: string | null): void {
  parceiroSessionId = id;
  try {
    if (id) localStorage.setItem(STORAGE_KEY_PARCEIRO_SESSION, id);
    else localStorage.removeItem(STORAGE_KEY_PARCEIRO_SESSION);
  } catch {
    /* ignore */
  }
}

export function initParceiroSessionFromStorage(): void {
  parceiroSessionId = null;
  const stored = getStoredParceiroSessionId();
  if (stored) parceiroSessionId = stored;
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

export async function parceiroFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const sid = parceiroSessionId || getStoredParceiroSessionId();
  if (sid) headers.set(PARCEIRO_SESSION_HEADER, sid);
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}

export async function parceiroLogin(login: string, senha: string): Promise<ParceiroOperador> {
  const res = await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, senha }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
  }
  const sessionId =
    typeof data.sessionId === "string" && data.sessionId.trim() ? data.sessionId.trim() : null;
  if (sessionId) setStoredParceiroSessionId(sessionId);
  const op = data.operador as ParceiroOperador | undefined;
  if (!op?.login) throw new Error("Resposta inválida do servidor.");
  return op;
}

export async function parceiroObterSessao(): Promise<ParceiroOperador | null> {
  const res = await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/me"), { method: "GET" });
  if (res.status === 401) {
    setStoredParceiroSessionId(null);
    return null;
  }
  const data = await parseJson(res);
  if (!res.ok) return null;
  const sessionId =
    typeof data.sessionId === "string" && data.sessionId.trim() ? data.sessionId.trim() : null;
  if (sessionId) setStoredParceiroSessionId(sessionId);
  const op = data.operador as ParceiroOperador | undefined;
  return op?.login ? op : null;
}

export async function parceiroLogout(): Promise<void> {
  await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/logout"), { method: "POST" });
  setStoredParceiroSessionId(null);
}

/** URL da Central para pagamento QR (colaborador). */
export function centralPagamentoQrUrl(token: string): string {
  const configured = import.meta.env.VITE_CENTRAL_PUBLIC_URL as string | undefined;
  if (configured?.trim()) {
    return `${configured.trim().replace(/\/+$/, "")}/cci-pay/pagar/${token}`;
  }
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const h = window.location.hostname;
    const host =
      h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" ? "127.0.0.1" : h;
    return `http://${host}:8080/cci-pay/pagar/${token}`;
  }
  return `https://central.portalcci.com.br/cci-pay/pagar/${token}`;
}

export { getApiBaseUrl };
