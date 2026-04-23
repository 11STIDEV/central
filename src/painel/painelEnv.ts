/** Variáveis públicas do painel de senhas (Vite). */
export function getSchoolSlug(): string {
  return import.meta.env.VITE_SCHOOL_SLUG?.trim() || "demo";
}

/**
 * `VITE_PAINEL_DB_ONLY=true` — usa o Supabase só como Postgres (chave anon + RLS).
 * Não chama `signInWithIdToken` nem exige Google Auth habilitado no Supabase.
 * Ainda exige login na Central (Google) para checar OUs / papéis; dados em tabelas `painel_*`.
 */
export function isPainelDbOnly(): boolean {
  const v = import.meta.env.VITE_PAINEL_DB_ONLY?.trim();
  return v === "1" || v?.toLowerCase() === "true";
}

export function getYoutubePlaylistId(): string | null {
  const id = import.meta.env.VITE_PAINEL_YOUTUBE_PLAYLIST_ID?.trim();
  return id || null;
}

export function getOverlayDurationMs(): number {
  const raw = import.meta.env.VITE_PAINEL_OVERLAY_SECONDS?.trim();
  const n = raw ? parseInt(raw, 10) : 10;
  if (!Number.isFinite(n) || n <= 0) return 10_000;
  return n * 1000;
}
