/** Variáveis públicas do painel de senhas (Vite). */
export function getSchoolSlug(): string {
  return import.meta.env.VITE_SCHOOL_SLUG?.trim() || "demo";
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
