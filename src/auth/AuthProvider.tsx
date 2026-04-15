import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/** Papéis derivados da OU no Google Workspace (caminho exato configurado abaixo). */
export type Papel =
  | "usuario"
  | "admin"
  | "biblioteca"
  | "direcao"
  | "disciplinar"
  | "dp"
  | "faculdade"
  | "publicidade"
  | "secretaria"
  | "setape"
  | "professorfac"
  | "professortecs"
  | "professorregular"
  | "almoxarifado"
  | "aluno";

export type UsuarioLogado = {
  nome: string;
  email: string;
  picture?: string;
  papeis: Papel[];
};

type AuthContextType = {
  usuario: UsuarioLogado | null;
  /** ID token atual (mesmo da sessão) para `POST /api/*` autenticados; null se não logado. */
  googleIdToken: string | null;
  /** True até terminar de tentar restaurar sessão (localStorage + validade do token). */
  carregando: boolean;
  /** True até o script `gsi/client` carregar (necessário só para o botão na página de login). */
  carregandoGoogle: boolean;
  erro?: string;
  /** Renderiza o botão oficial do Google no container; abre popup mesmo sem conta conectada (ex.: aba anônima). */
  renderGoogleButton: (container: HTMLElement | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Chave do ID token no localStorage (para chamadas à API com o mesmo token da sessão). */
export const STORAGE_KEY_GOOGLE_ID_TOKEN = "central_connect_google_id_token";
const STORAGE_KEY_ID_TOKEN = STORAGE_KEY_GOOGLE_ID_TOKEN;

/** Normaliza caminho de OU para comparação (trim, sem barra final, sem acentos, minúsculas). */
function normalizarCaminhoOu(path: string): string {
  return path
    .trim()
    .replace(/\/+$/, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Mapeamento OU (Google Admin) → papel.
 * Caminhos esperados conforme estrutura do Workspace.
 */
const OU_PARA_PAPEL = new Map<string, Papel>([
  [normalizarCaminhoOu("/Administrativo/Biblioteca"), "biblioteca"],
  [normalizarCaminhoOu("/Administrativo/Direção"), "direcao"],
  [normalizarCaminhoOu("/Administrativo/Disciplinar"), "disciplinar"],
  [normalizarCaminhoOu("/Administrativo/DP"), "dp"],
  [normalizarCaminhoOu("/Administrativo/Faculdade"), "faculdade"],
  [normalizarCaminhoOu("/Administrativo/Publicidade"), "publicidade"],
  [normalizarCaminhoOu("/Administrativo/Secretaria"), "secretaria"],
  [normalizarCaminhoOu("/Administrativo/Setape"), "setape"],
  [normalizarCaminhoOu("/Administrativo/Almoxarifado"), "almoxarifado"],
  [normalizarCaminhoOu("/Professores FAC"), "professorfac"],
  [normalizarCaminhoOu("/Professores TECS"), "professortecs"],
  [normalizarCaminhoOu("/Professores REGULAR"), "professorregular"],
  [normalizarCaminhoOu("/Alunos FACULDADE"), "aluno"],
  [normalizarCaminhoOu("/Alunos TECSCCI"), "aluno"],
]);

/** Domínios Google permitidos a entrar na Central (OAuth). */
const DOMINIOS_PERMITIDOS = [
  "@portalcci.com.br",
  "@faculdadecci.com.br",
  "@tecscci.com.br",
] as const;

function emailDominioPermitido(email: string): boolean {
  const e = email.toLowerCase();
  return DOMINIOS_PERMITIDOS.some((d) => e.endsWith(d));
}

function mapearPapeis(tokenPayload: any): Papel[] {
  const papeis: Set<Papel> = new Set(["usuario"]);

  const email: string | undefined = tokenPayload?.email;
  const orgUnit: string | undefined =
    (tokenPayload as any)?.orgUnitPath ||
    (tokenPayload as any)?.org_unit_path ||
    (tokenPayload as any)?.ou ||
    (tokenPayload as any)?.orgUnit;

  if (orgUnit && orgUnit.trim() !== "") {
    const chave = normalizarCaminhoOu(orgUnit);
    const papelOu = OU_PARA_PAPEL.get(chave);
    if (papelOu) {
      papeis.add(papelOu);
    }
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("mapearPapeis:", { email, orgUnit, papeis: Array.from(papeis) });
  }
  return Array.from(papeis);
}

function decodeJwt(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    // JWT usa base64url; em alguns browsers pode faltar padding.
    const base64url = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64url.length % 4)) % 4;
    const base64 = base64url + "=".repeat(padLen);
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Falha ao decodificar JWT:", e);
    return null;
  }
}

/** ID token do Google expira (tipicamente ~1h); acima disso é preciso entrar de novo. */
function idTokenAindaValido(token: string): boolean {
  const payload = decodeJwt(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 > Date.now() + 10_000;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoGoogle, setCarregandoGoogle] = useState(true);
  const [erro, setErro] = useState<string | undefined>(undefined);
  const inicializadoRef = useRef(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setCarregandoGoogle(false);
    script.onerror = () => {
      setErro("Não foi possível carregar o Google Login.");
      setCarregandoGoogle(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const aplicarCredencial = useCallback(
    async (idToken: string, opcoes?: { persistir?: boolean }) => {
      const persistir = opcoes?.persistir !== false;
      const payload = decodeJwt(idToken);
      if (!payload?.email) {
        setErro("Não foi possível obter os dados do usuário.");
        return;
      }
      if (!emailDominioPermitido(payload.email)) {
        setErro(
          "Apenas contas @portalcci.com.br, @faculdadecci.com.br ou @tecscci.com.br podem acessar esta central.",
        );
        setUsuario(null);
        setGoogleIdToken(null);
        try {
          localStorage.removeItem(STORAGE_KEY_ID_TOKEN);
        } catch {
          /* ignore */
        }
        return;
      }

      let orgUnitPath: string | undefined;
      try {
        const res = await fetch("/api/organizacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const text = await res.text();
        let data: Record<string, unknown> = {};
        try {
          if (text) data = JSON.parse(text) as Record<string, unknown>;
        } catch {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(
              "[api/organizacao] corpo não é JSON:",
              res.status,
              text?.slice?.(0, 200),
            );
          }
        }

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[api/organizacao]", {
            status: res.status,
            ok: res.ok,
            data,
            corpoBruto: text?.slice?.(0, 500),
          });
        }

        if (!res.ok) {
          const msg =
            typeof data.error === "string"
              ? data.error
              : `HTTP ${res.status}`;
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn("[api/organizacao] erro:", msg, data);
            if (!text || Object.keys(data).length === 0) {
              // eslint-disable-next-line no-console
              console.warn(
                "[api/organizacao] resposta sem JSON — confira o terminal do Vite (proxy) e se a API está em http://127.0.0.1:3001",
              );
            }
          }
        } else {
          const raw = data.orgUnitPath ?? data.org_unit_path;
          if (typeof raw === "string") {
            orgUnitPath = raw;
          }
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            "[api/organizacao] falha de rede ou servidor parado (rode npm run dev:server na pasta server, porta 3001):",
            e,
          );
        }
      }

      const payloadComOU =
        orgUnitPath !== undefined ? { ...payload, orgUnitPath } : payload;
      let papeis = mapearPapeis(payloadComOU);
      try {
        const res = await fetch("/api/papeis-manuais/obter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (res.ok) {
          const data = (await res.json()) as { papeisManuais?: string[] };
          const extras = Array.isArray(data.papeisManuais) ? data.papeisManuais : [];
          const permitidos = new Set<Papel>(["admin"]);
          for (const p of extras) {
            if (typeof p === "string" && permitidos.has(p as Papel)) {
              papeis = [...papeis, p as Papel];
            }
          }
          papeis = Array.from(new Set(papeis));
        }
      } catch {
        /* papéis manuais opcionais se a API estiver indisponível */
      }
      setUsuario({
        nome: payload.name ?? payload.given_name ?? "Usuário",
        email: payload.email,
        picture: payload.picture,
        papeis,
      });
      setGoogleIdToken(idToken);
      setErro(undefined);
      if (persistir) {
        try {
          localStorage.setItem(STORAGE_KEY_ID_TOKEN, idToken);
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        let armazenado: string | null = null;
        try {
          armazenado = localStorage.getItem(STORAGE_KEY_ID_TOKEN);
        } catch {
          armazenado = null;
        }
        if (armazenado && idTokenAindaValido(armazenado)) {
          await aplicarCredencial(armazenado, { persistir: false });
        } else if (armazenado) {
          try {
            localStorage.removeItem(STORAGE_KEY_ID_TOKEN);
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [aplicarCredencial]);

  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response?.credential) return;
      await aplicarCredencial(response.credential, { persistir: true });
    },
    [aplicarCredencial],
  );

  const renderGoogleButton = useCallback(
    (container: HTMLElement | null) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
      if (!container) return;
      if (!clientId) {
        setErro(
          "VITE_GOOGLE_CLIENT_ID não configurado. Defina o Client ID no .env.local.",
        );
        return;
      }
      if (!window.google?.accounts?.id) {
        setErro("Google Identity ainda não foi carregado. Tente novamente.");
        return;
      }

      if (!inicializadoRef.current) {
        inicializadoRef.current = true;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: "popup",
          context: "signin",
        });
      }

      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 320,
      });
    },
    [handleCredentialResponse],
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_ID_TOKEN);
    } catch {
      /* ignore */
    }
    setUsuario(null);
    setGoogleIdToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        googleIdToken,
        carregando,
        carregandoGoogle,
        erro,
        renderGoogleButton,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}

