/** E-mails com papel `admin` na intranet (ver tudo), independente da OU. */
export function getCentralAdminEmails(): string[] {
  const raw = import.meta.env.VITE_CENTRAL_ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isCentralAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return getCentralAdminEmails().includes(normalized);
}
