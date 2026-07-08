import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiUrl, getApiBaseUrl } from "@/lib/apiBase";
import { isCentralAdminEmail } from "@/auth/centralAdminEnv";
import {
  ouPainelAdminPeloCaminho,
  ouPainelAtendentePeloCaminho,
} from "@/painel/painelOuPaths";

/** Papéis derivados da OU no Google Workspace (caminho exato configurado abaixo). */
export type Papel =
  | "usuario"
  | "admin"
  | "biblioteca"
  | "direcao"
  | "disciplinar"
  | "dp"
  | "faculdade"
  | "financeiro"
  | "publicidade"
  | "secretaria"
  | "servicosgerais"
  | "setape"
  | "professorfac"
  | "professortecs"
  | "professorregular"
  | "primeirossocorros"
  | "clat"
  | "almoxarifado"
  | "aluno"
  /** Papéis de gerente por setor (sub-OU /Gerente dentro de cada setor). */
  | "gerente_biblioteca"
  | "gerente_direcao"
  | "gerente_disciplinar"
  | "gerente_dp"
  | "gerente_faculdade"
  | "gerente_financeiro"
  | "gerente_publicidade"
  | "gerente_secretaria"
  | "gerente_servicosgerais"
  | "gerente_setape"
  | "gerente_primeirossocorros"
  | "gerente_clat"
  | "gerente_almoxarifado"
  /** Painel de senhas — alinhado a `OU_PAINEL_*` e ao `POST /api/painel/sync-profile`. */
  | "painel_atendente"
  | "painel_admin";

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
  /**
   * Último erro de `POST /api/organizacao` (ex.: serviço sem service account) ou de rede;
   * null se a resposta OK ou ainda não carregou.
   */
  organizacaoErro: string | null;
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

/**
 * Normaliza caminho de OU para comparação (trim, barra inicial, barras duplicadas,
 * espaços unicode → espaço normal, sem barra final, sem acentos, minúsculas).
 */
function normalizarCaminhoOu(path: string): string {
  let s = path
    .trim()
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ");
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/+/g, "/").replace(/\/+$/, "");
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * No Admin, "Alunos FACULDADE" e "Alunos TECSCCI" ficam sob a OU raiz do domínio (ex.: `/Portalcci.com.br/...`),
 * não necessariamente como `/Alunos FACULDADE` na raiz. Após `normalizarCaminhoOu`, reconhecemos o **segmento**
 * exato `alunos faculdade` ou `alunos teccscci` em qualquer profundidade (inclui sub-OUs).
 * Extra: `VITE_GOOGLE_ORGUNIT_ALUNO_PREFIXES` — prefixos normalizados adicionais (vírgula).
 */
const RE_SEG_OU_ALUNO = /(^|\/)(alunos faculdade|alunos teccscci)(\/|$)/;

function ouAlunoPeloCaminhoWorkspace(chaveNormalizada: string): boolean {
  if (RE_SEG_OU_ALUNO.test(chaveNormalizada)) return true;
  const raw = (import.meta.env.VITE_GOOGLE_ORGUNIT_ALUNO_PREFIXES as string | undefined)?.trim();
  if (!raw) return false;
  for (const part of raw.split(",")) {
    const p = normalizarCaminhoOu(part);
    if (p && (chaveNormalizada === p || chaveNormalizada.startsWith(`${p}/`))) return true;
  }
  return false;
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
  [normalizarCaminhoOu("/Administrativo/Financeiro"), "financeiro"],
  [normalizarCaminhoOu("/Administrativo/Publicidade"), "publicidade"],
  [normalizarCaminhoOu("/Administrativo/Secretaria"), "secretaria"],
  [normalizarCaminhoOu("/Administrativo/Serviços Gerais"), "servicosgerais"],
  [normalizarCaminhoOu("/Administrativo/Setape"), "setape"],
  [normalizarCaminhoOu("/Administrativo/Almoxarifado"), "almoxarifado"],
  [normalizarCaminhoOu("/Administrativo/Primeiros Socorros"), "primeirossocorros"],
  [normalizarCaminhoOu("/Administrativo/CLAT"), "clat"],
  // Gerentes — sub-OU /Gerente dentro de cada setor
  [normalizarCaminhoOu("/Administrativo/Biblioteca/Gerente"), "gerente_biblioteca"],
  [normalizarCaminhoOu("/Administrativo/Direção/Gerente"), "gerente_direcao"],
  [normalizarCaminhoOu("/Administrativo/Disciplinar/Gerente"), "gerente_disciplinar"],
  [normalizarCaminhoOu("/Administrativo/DP/Gerente"), "gerente_dp"],
  [normalizarCaminhoOu("/Administrativo/Faculdade/Gerente"), "gerente_faculdade"],
  [normalizarCaminhoOu("/Administrativo/Financeiro/Gerente"), "gerente_financeiro"],
  [normalizarCaminhoOu("/Administrativo/Publicidade/Gerente"), "gerente_publicidade"],
  [normalizarCaminhoOu("/Administrativo/Secretaria/Gerente"), "gerente_secretaria"],
  [normalizarCaminhoOu("/Administrativo/Serviços Gerais/Gerente"), "gerente_servicosgerais"],
  [normalizarCaminhoOu("/Administrativo/Setape/Gerente"), "gerente_setape"],
  [normalizarCaminhoOu("/Administrativo/Almoxarifado/Gerente"), "gerente_almoxarifado"],
  [normalizarCaminhoOu("/Administrativo/Primeiros Socorros/Gerente"), "gerente_primeirossocorros"],
  [normalizarCaminhoOu("/Administrativo/CLAT/Gerente"), "gerente_clat"],
  [normalizarCaminhoOu("/Professores FAC"), "professorfac"],
  [normalizarCaminhoOu("/Professores TECS"), "professortecs"],
  [normalizarCaminhoOu("/Professores REGULAR"), "professorregular"],
  [normalizarCaminhoOu("/Alunos FACULDADE"), "aluno"],
  [normalizarCaminhoOu("/Alunos TECSCCI"), "aluno"],
  [normalizarCaminhoOu("/Portalcci.com.br/Alunos FACULDADE"), "aluno"],
  [normalizarCaminhoOu("/Portalcci.com.br/Alunos TECSCCI"), "aluno"],
  [normalizarCaminhoOu("/portalcci.com.br/Alunos FACULDADE"), "aluno"],
  [normalizarCaminhoOu("/portalcci.com.br/Alunos TECSCCI"), "aluno"],
]);

/** Mapa de papel gerente → papel base do setor (para que gerentes recebam os dois papéis). */
const GERENTE_PARA_BASE: Partial<Record<Papel, Papel>> = {
  gerente_biblioteca: "biblioteca",
  gerente_direcao: "direcao",
  gerente_disciplinar: "disciplinar",
  gerente_dp: "dp",
  gerente_faculdade: "faculdade",
  gerente_financeiro: "financeiro",
  gerente_publicidade: "publicidade",
  gerente_secretaria: "secretaria",
  gerente_servicosgerais: "servicosgerais",
  gerente_setape: "setape",
  gerente_almoxarifado: "almoxarifado",
  gerente_primeirossocorros: "primeirossocorros",
  gerente_clat: "clat",
};

/** Domínios Google permitidos a entrar na Central (OAuth). */
const DOMINIOS_PERMITIDOS = [
  "@portalcci.com.br",
  "@faculdadecci.com.br",
  "@tecscci.com.br",
] as const;

function emailDominioPermitido(email: string): boolean {
  const e = email.toLowerCase();
  return DOMINIOS_PERMITIDOS.some((d) => e.endsWith(d.toLowerCase()));
}

function mapearPapeis(tokenPayload: any): Papel[] {
  const papeis: Set<Papel> = new Set(["usuario"]);

  const email: string | undefined = tokenPayload?.email;
  const orgUnit: string | undefined =
    (tokenPayload as any)?.orgUnitPath ||
    (tokenPayload as any)?.org_unit_path ||
    (tokenPayload as any)?.organizationUnitPath ||
    (tokenPayload as any)?.ou ||
    (tokenPayload as any)?.orgUnit;

  if (orgUnit && orgUnit.trim() !== "") {
    const chave = normalizarCaminhoOu(orgUnit);
    let papelOu = OU_PARA_PAPEL.get(chave);
    if (!papelOu && ouAlunoPeloCaminhoWorkspace(chave)) {
      papelOu = "aluno";
    }
    if (papelOu) {
      papeis.add(papelOu);
      // Se é um papel de gerente, adiciona também o papel base do setor
      const papelBase = GERENTE_PARA_BASE[papelOu];
      if (papelBase) papeis.add(papelBase);
    }
    if (ouPainelAtendentePeloCaminho(chave)) {
      papeis.add("painel_atendente");
      papeis.add("secretaria");
    }
    if (ouPainelAdminPeloCaminho(chave)) {
      papeis.add("painel_admin");
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
  const [organizacaoErro, setOrganizacaoErro] = useState<string | null>(null);
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
        const res = await fetch(apiUrl("/api/organizacao"), {
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
          let msg: string;
          if (res.status === 405) {
            const baseHint = getApiBaseUrl()
              ? ` API configurada: ${getApiBaseUrl()}.`
              : "";
            msg = `HTTP 405 (Método não permitido). O pedido POST a /api/organizacao não chegou ao Node.${baseHint} Causa muito comum: no Coolify a aplicação está como *static site* (Nginx) — aí o POST a /api é bloqueado. Desative *Is it a static site?*, use *Dockerfile* na raiz, porta 3001, e confirme GET /api/health. Se a API for outro URL, use VITE_API_BASE_URL no build ou CENTRAL_API_BASE_URL (runtime) e reconstrua/reinicie.`;
          } else {
            msg =
              typeof data.error === "string"
                ? data.error
                : `HTTP ${res.status}`;
          }
          const detalhe =
            typeof data.detalhe === "string" && data.detalhe.trim() !== ""
              ? ` ${data.detalhe}`
              : "";
          setOrganizacaoErro(`${msg}${detalhe}`);
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
          setOrganizacaoErro(null);
          const raw =
            data.orgUnitPath ??
            data.org_unit_path ??
            (typeof (data as Record<string, unknown>).organizationUnitPath === "string"
              ? (data as Record<string, unknown>).organizationUnitPath
              : undefined);
          const trimmed = raw != null && String(raw).trim() !== "" ? String(raw).trim() : "";
          orgUnitPath = trimmed === "" ? undefined : trimmed;
        }
      } catch (e) {
        setOrganizacaoErro(
          "A API em http://127.0.0.1:3001 não respondeu. Confirme se a API arrancou (npm run dev:all ou cd server && npm run dev) e se já correu `npm install` em server/.",
        );
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            "[api/organizacao] falha de rede ou servidor parado (rode npm run dev:server na pasta server, porta 3001):",
            e,
          );
        }
      }

      const ouParaMapear = orgUnitPath;
      const payloadComOU =
        ouParaMapear !== undefined
          ? {
              ...payload,
              orgUnitPath: ouParaMapear,
              org_unit_path: ouParaMapear,
              organizationUnitPath: ouParaMapear,
              orgUnit: ouParaMapear,
              ou: ouParaMapear,
            }
          : payload;
      let papeis = mapearPapeis(payloadComOU);
      try {
        const res = await fetch(apiUrl("/api/papeis-manuais/obter"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (res.ok) {
          const data = (await res.json()) as { papeisManuais?: string[] };
          const extras = Array.isArray(data.papeisManuais) ? data.papeisManuais : [];
          const permitidos = new Set<Papel>(["admin", "painel_admin", "painel_atendente"]);
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
      if (isCentralAdminEmail(payload.email)) {
        papeis = Array.from(new Set([...papeis, "admin"]));
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
      // Registra/atualiza o usuário no banco (nome + email + setor + is_gerente)
      // Fire-and-forget: não bloqueia o login
      void (async () => {
        try {
          await fetch(apiUrl("/api/usuarios/registrar"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, papeis }),
          });
        } catch {
          /* registro de usuário é opcional — não falha o login */
        }
      })();
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
    setOrganizacaoErro(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        googleIdToken,
        organizacaoErro,
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

