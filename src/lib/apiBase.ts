/**
 * Em dev (Vite + proxy) use base vazia: pedidos a `/api/...` no mesmo host.
 * Se o front estiver noutro domínio que o Node (Coolify com dois serviços, CDN estático, etc.),
 * defina `VITE_API_BASE_URL=https://onde-esta-a-api` no build do front (sem barra no fim).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.trim().replace(/\/+$/, "");
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
