/** Extrai o token de pagamento de URL ou texto escaneado no QR Advance-CCI. */
export function extrairTokenPagamentoQr(texto: string): string | null {
  const raw = texto.trim();
  if (!raw) return null;

  const pathMatch = raw.match(/\/cci-pay\/pagar\/([^/?#\s]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

  try {
    const url = new URL(raw);
    const urlPathMatch = url.pathname.match(/\/cci-pay\/pagar\/([^/]+)/i);
    if (urlPathMatch?.[1]) return decodeURIComponent(urlPathMatch[1]);
  } catch {
    // texto pode ser só o token
  }

  if (/^[a-zA-Z0-9_-]{8,}$/.test(raw)) return raw;

  return null;
}
