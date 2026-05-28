export function getLostFoundSchoolId(): string {
  const explicit = import.meta.env.VITE_LF_SCHOOL_ID as string | undefined;
  const fallbackSlug = import.meta.env.VITE_SCHOOL_SLUG as string | undefined;
  return explicit?.trim() || fallbackSlug?.trim() || "default";
}
