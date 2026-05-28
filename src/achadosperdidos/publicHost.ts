const DEFAULT_PUBLIC_HOSTS = ["achadoseperdidos.portalcci.com.br"];

function parsePublicHosts(): string[] {
  const raw = import.meta.env.VITE_LF_PUBLIC_HOSTS as string | undefined;
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

/** Dev: ?publicHost=1 força modo vitrine no host atual. */
function isDevPublicHostOverride(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("publicHost") === "1";
}

export function isLostFoundPublicHost(): boolean {
  if (isDevPublicHostOverride()) return true;
  const host = currentHostname();
  if (!host) return false;
  return parsePublicHosts().includes(host);
}

/** URL pública absoluta para links externos (hub, e-mail, etc.). */
export function lostFoundPublicSiteUrl(): string {
  const hosts = parsePublicHosts();
  const primary = hosts[0] ?? DEFAULT_PUBLIC_HOSTS[0];
  if (typeof window !== "undefined" && parsePublicHosts().includes(currentHostname())) {
    return `${window.location.protocol}//${window.location.host}/`;
  }
  return `https://${primary}/`;
}
