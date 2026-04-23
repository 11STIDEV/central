import type { Papel } from "./AuthProvider";
import { podePainelAdmin, podePainelAtendente } from "@/painel/painelWorkspaceAccess";

/**
 * Rotas do painel de senhas acessíveis **sem** login Google (URL direta):
 * hub `/senhas`, quiosque totem, painel TV.
 */
export const PUBLIC_SENHAS_KIOSK_PATHS = ["/senhas", "/senhas/totem", "/senhas/painel"] as const;

export function isPublicSenhasKioskPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return (PUBLIC_SENHAS_KIOSK_PATHS as readonly string[]).includes(p);
}

function isSenhasAuthenticatedPath(path: string): boolean {
  if (path === "/senhas" || path.startsWith("/senhas/")) {
    return !isPublicSenhasKioskPath(path);
  }
  return false;
}

function isSenhasAdminPath(path: string): boolean {
  return path === "/senhas/admin" || path.startsWith("/senhas/admin/");
}

/** Atendente: autorização detalhada (OU, perfil Supabase) fica no SenhasAtendentePage. */
function isSenhasAtendentePath(path: string): boolean {
  return path === "/senhas/atendente" || path.startsWith("/senhas/atendente/");
}

/**
 * Rotas restritas: só usuários com **pelo menos um** dos papéis listados acessam.
 * Rotas não listadas: qualquer usuário logado pode acessar (exceto regra `isSomenteAluno`).
 */
export const ROTAS_PAPEIS_OBRIGATORIOS: Record<string, Papel[]> = {
  "/admin/papeis-manuais": ["admin"],
};

/** Usuário só com papel `aluno` (além de `usuario`): home, hub e totem/TV por URL direta. */
export function isSomenteAluno(papeis: Papel[]): boolean {
  if (papeis.includes("admin")) return false;
  if (!papeis.includes("aluno")) return false;
  return papeis.every((p) => p === "usuario" || p === "aluno");
}

function normalizarPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p;
}

/** Indica se o usuário (pelos papéis) pode acessar a rota. Rotas não restritas → true. */
export function canAccessRoute(papeis: Papel[], pathname: string): boolean {
  const path = normalizarPath(pathname);
  if (papeis.includes("admin")) return true;
  if (isSomenteAluno(papeis)) {
    return (
      path === "/login" ||
      path === "/" ||
      path === "/senhas" ||
      path.startsWith("/senhas/totem") ||
      path.startsWith("/senhas/painel")
    );
  }
  if (isSenhasAuthenticatedPath(path)) {
    if (isSenhasAdminPath(path)) {
      return podePainelAdmin(papeis);
    }
    if (isSenhasAtendentePath(path)) {
      if (podePainelAtendente(papeis)) return true;
      // Só "usuario" quando /api/organizacao falhou (ex.: service account no Coolify) —
      // deixa a página carregar e mostrar a mensagem de acesso, em vez de bloquear a rota.
      if (isSomenteAluno(papeis)) return false;
      return true;
    }
    return podePainelAtendente(papeis);
  }
  const obrigatorios = ROTAS_PAPEIS_OBRIGATORIOS[path];
  if (!obrigatorios || obrigatorios.length === 0) return true;
  return obrigatorios.some((p) => papeis.includes(p));
}
