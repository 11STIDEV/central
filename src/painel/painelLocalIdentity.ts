const STORAGE_KEY = "central_painel_local_attendant_uuid";

/**
 * ID estável (por navegador) para montar o perfil virtual do atendente quando
 * `VITE_PAINEL_DB_ONLY` está ativo — sem `auth.users` no Supabase.
 * Em inserções em `painel_calls` usamos `attendant_id: null` para não quebrar FK.
 */
export function getOrCreateLocalPainelAttendantId(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-4000-8000-000000000000";
  }
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "00000000-0000-4000-8000-000000000001";
  }
}
