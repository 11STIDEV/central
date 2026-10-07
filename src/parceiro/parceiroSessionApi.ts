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

export async function parceiroEsqueciSenha(loginOuEmail: string): Promise<{
  ok: boolean;
  emailMascarado: string;
  mensagem: string;
}> {
  const res = await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/esqueci-senha"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginOuEmail }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
  }
  return {
    ok: true,
    emailMascarado: String(data.emailMascarado || ""),
    mensagem: String(data.mensagem || "Instruções enviadas para seu e-mail."),
  };
}

export async function parceiroValidarTokenRedefinicao(token: string): Promise<{
  ok: boolean;
  login: string;
  nome: string;
  lojaNome: string;
}> {
  const res = await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/validar-token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Token inválido ou expirado.");
  }
  return {
    ok: true,
    login: String(data.login || ""),
    nome: String(data.nome || ""),
    lojaNome: String(data.lojaNome || ""),
  };
}

export async function parceiroRedefinirSenha(token: string, novaSenha: string): Promise<{
  ok: boolean;
  mensagem: string;
}> {
  const res = await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/confirmar-codigo-redefinicao"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo: token, novaSenha }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Erro ao redefinir senha.");
  }
  return {
    ok: true,
    mensagem: String(data.mensagem || "Senha redefinida com sucesso!"),
  };
}

export async function parceiroConfirmarCodigoRedefinicao(params: {
  loginOuEmail: string;
  codigo: string;
  novaSenha: string;
}): Promise<{ ok: boolean; login?: string; mensagem: string }> {
  const res = await parceiroFetch(apiUrl("/api/ccipay/parceiro/auth/confirmar-codigo-redefinicao"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Erro ao redefinir senha.");
  }
  return {
    ok: true,
    login: typeof data.login === "string" ? data.login : undefined,
    mensagem: String(data.mensagem || "Senha redefinida com sucesso!"),
  };
}

export function centralPagamentoQrUrl(token: string): string {
  const configured = import.meta.env.VITE_CENTRAL_PUBLIC_URL as string | undefined;
  if (configured?.trim()) {
    return `${configured.trim().replace(/\/+$/, "")}/cci-pay/pagar/${token}`;
  }
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/cci-pay/pagar/${token}`;
  }
  return `https://central.portalcci.com.br/cci-pay/pagar/${token}`;
}

export { getApiBaseUrl };

