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

export function parceiroSiteUrl(): string {
  if (typeof window !== "undefined") {
    // Em desenvolvimento local, aponta diretamente para o host local com o parâmetro de parceiro
    if (import.meta.env.DEV) {
      return `${window.location.origin}/?parceiroHost=1`;
    }
    if (parsePublicHosts().includes(currentHostname())) {
      return `${window.location.protocol}//${window.location.host}/`;
    }
  }
  const hosts = parsePublicHosts();
  const primary = hosts[0] ?? DEFAULT_PUBLIC_HOSTS[0];
  return `https://${primary}/`;
}
