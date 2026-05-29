const STORAGE_PREFIX = "central_painel_atendente_window";

function storageKey(schoolId: string, profileId: string): string {
  return `${STORAGE_PREFIX}:${schoolId}:${profileId}`;
}

export function readStoredServiceWindowId(
  schoolId: string,
  profileId: string,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(storageKey(schoolId, profileId));
    return value?.trim() ? value : null;
  } catch {
    return null;
  }
}

export function storeServiceWindowId(
  schoolId: string,
  profileId: string,
  windowId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(schoolId, profileId), windowId);
  } catch {
    // quota / modo privado
  }
}

export function resolveInitialServiceWindowId(
  schoolId: string,
  profileId: string,
  serviceWindows: { id: string }[],
  profileDefaultWindowId: string | null,
): string {
  const stored = readStoredServiceWindowId(schoolId, profileId);
  if (stored && serviceWindows.some((w) => w.id === stored)) {
    return stored;
  }
  if (
    profileDefaultWindowId &&
    serviceWindows.some((w) => w.id === profileDefaultWindowId)
  ) {
    return profileDefaultWindowId;
  }
  return serviceWindows[0]?.id ?? "";
}
