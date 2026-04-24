/**
 * - Produção (build): base vazia = mesmo origem (Docker `node` serve `dist` + API) ou
 *   `VITE_API_BASE_URL` se front e API tiverem hosts diferentes.
 * - Dev: por defeito a API fala direto com `http://<host>:3001` (contorna o proxy do Vite, que
 *   nalguns ambientes devolve 405 a POST /api). Defina `VITE_USE_VITE_PROXY=1` no .env.local
 *   se quiser voltar ao proxy relativo a `/api`.
 */
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
