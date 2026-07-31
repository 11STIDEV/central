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

/** Dev: ?parceiroHost=1 força modo portal parceiro no host atual. */
function isDevParceiroHostOverride(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("parceiroHost") === "1";
}

export function isParceiroPublicHost(): boolean {
  if (isDevParceiroHostOverride()) return true;
  const host = currentHostname();
  if (!host) return false;
  return parsePublicHosts().includes(host);
}

export function parceiroSiteUrl(): string {
  const hosts = parsePublicHosts();
  const primary = hosts[0] ?? DEFAULT_PUBLIC_HOSTS[0];
  if (typeof window !== "undefined" && parsePublicHosts().includes(currentHostname())) {
    return `${window.location.protocol}//${window.location.host}/`;
  }
  return `https://${primary}/`;
}
