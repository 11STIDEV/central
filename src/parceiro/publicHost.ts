const DEFAULT_PUBLIC_HOSTS = ["parceiro.portalcci.com.br"];

function parsePublicHosts(): string[] {
  const raw = import.meta.env.VITE_PARCEIRO_PUBLIC_HOSTS as string | undefined;
  if (!raw?.trim()) return DEFAULT_PUBLIC_HOSTS;
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function currentHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

/** Dev: ?parceiroHost=1 força modo portal parceiro no host atual e persiste na sessão. */
function isDevParceiroHostOverride(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("parceiroHost") === "1") {
    try {
      sessionStorage.setItem("dev_parceiro_host", "1");
    } catch {
      /* ignore */
    }
    return true;
  }
  if (params.get("parceiroHost") === "0") {
    try {
      sessionStorage.removeItem("dev_parceiro_host");
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    return sessionStorage.getItem("dev_parceiro_host") === "1";
  } catch {
    return false;
  }
}

export function isParceiroPublicHost(): boolean {
  if (isDevParceiroHostOverride()) return true;
  const host = currentHostname();
  if (!host) return false;
  return parsePublicHosts().includes(host);
}

export function isParceiroSubpath(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.toLowerCase();
  return path === "/parceiro" || path.startsWith("/parceiro/");
}

export function parceiroSiteUrl(): string {
  // 1. URL explícita configurada no .env (ex: VITE_PARCEIRO_SITE_URL=https://parceiro.portalcci.com.br)
  const envUrl = (import.meta.env.VITE_PARCEIRO_SITE_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl : `${envUrl}/`;
  }

  if (typeof window !== "undefined") {
    // 2. Se já estiver acessando pelo próprio subdomínio público configurado
    if (parsePublicHosts().includes(currentHostname())) {
      return `${window.location.protocol}//${window.location.host}/`;
    }

    // 3. Se estiver acessando pela rota /parceiro no mesmo domínio (ex: central.portalcci.com.br/parceiro)
    if (isParceiroSubpath()) {
      return `${window.location.origin}/parceiro/`;
    }

    // 4. Em desenvolvimento local
    if (import.meta.env.DEV) {
      return `${window.location.origin}/parceiro/`;
    }
  }

  // 5. Fallback padrão para produção: subdomínio primário
  const hosts = parsePublicHosts();
  const primary = hosts[0] ?? DEFAULT_PUBLIC_HOSTS[0];
  return `https://${primary}/`;
}
