import type { Papel } from "@/auth/AuthProvider";
import { podePainelAdmin } from "@/painel/painelWorkspaceAccess";
import type { Profile, School } from "@/painel/types/database";

/**
 * Perfil mínimo quando a OU do Google já autoriza o painel, sem linha em painel_profiles
 * (evita depender de sync com service role só para liberar a UI).
 */
export function perfilPainelPorOu(
  userId: string,
  school: School,
  nome: string,
  email: string,
  papeis: Papel[],
): Profile {
  const role = podePainelAdmin(papeis, email) ? "admin" : "attendant";
  const fullName = nome.trim() || email.split("@")[0] || email;
  return {
    id: userId,
    school_id: school.id,
    full_name: fullName,
    role,
    service_window_id: null,
    created_at: new Date().toISOString(),
  };
}

/** Alinha o papel ao que as regras atuais permitem (admin global ou e-mail autorizado). */
export function alinharPapelPerfilOu(profile: Profile, papeis: Papel[], email?: string | null): Profile {
  const role = podePainelAdmin(papeis, email) ? "admin" : "attendant";
  if (profile.role === role) return profile;
  return { ...profile, role };
}
