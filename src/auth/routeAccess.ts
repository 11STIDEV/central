import type { Papel } from "./AuthProvider";
import { isPainelAdminEmail } from "@/painel/painelEnv";
import { isRotaBloqueadaParaUsuario } from "./routesTemporarilyBlocked";
import { podeAcessarKanban } from "@/lib/kanban";

/**
 * Rotas da intranet comum (funcionários; exclui perfil “somente aluno”).
 * Alunos em `/Alunos FACULDADE` ou `/Alunos TECSCCI` têm conjunto próprio em `isSomenteAluno`.
 */
const ROTAS_INTRANET_COMUM = new Set([
  "/achados-e-perdidos",
  "/achados-e-perdidos/publico",
  "/",
  "/avisos",
  "/portal-do-funcionario",
  "/chamados/novo",
  "/chamados/gestao",
  "/agenda-cci",
  "/minhas-reservas",
  "/reserva-espacos-equipamentos",
  "/documentos",
  "/ramais",
]);

const PAPEIS_PROFESSORES: Papel[] = ["professorfac", "professortecs", "professorregular"];

/** Alunos não acessam o módulo de avisos. */
const ROTAS_BLOQUEADAS_ALUNO = new Set(["/avisos", "/avisos/publicar"]);

/**
 * Rotas extra-comuns: o utilizador precisa de **pelo menos um** dos papéis listados.
 * Rotas não listadas aqui e fora de `ROTAS_INTRANET_COMUM` e fora de `/senhas/*` → acesso negado
 * (exceto `admin`, que vê tudo).
 */
export const ROTAS_PAPEIS_OBRIGATORIOS: Record<string, Papel[]> = {
  "/admin/papeis-manuais": ["admin"],
  /** Somente administradores podem publicar avisos. */
  "/avisos/publicar": ["admin"],
  "/ti-interno": ["setape"],
  "/controle-materiais-ti": ["setape"],
  "/ti/ischolar": ["setape"],
  "/controle-materiais-almoxarifado": ["almoxarifado"],
  "/financeiro/vales-adiantamento": ["dp", "financeiro"],
  "/vale-adiantamento": ["dp", "financeiro"],
  "/agenda-cci/admin": ["setape"],
  "/achados-e-perdidos/admin": ["secretaria", "painel_admin"],
  "/setores/professores": PAPEIS_PROFESSORES,
  "/setores/disciplinar": ["disciplinar"],
  "/setores/secretaria": ["secretaria"],
  "/setores/servicos-gerais": ["servicosgerais"],
  "/setores/publicidade": ["publicidade"],
  "/setores/dp-financeiro": ["dp", "financeiro"],
  "/setores/primeiros-socorros": ["primeirossocorros"],
  "/setores/direcao": ["direcao"],
  "/setores/clat": ["clat"],
};

/** Apenas `usuario` + `aluno`: acesso exclusivo a reservas (Chromebook na UI de reservas). */
export function isSomenteAluno(papeis: Papel[]): boolean {
  if (papeis.includes("admin")) return false;
  if (!papeis.includes("aluno")) return false;
  return papeis.every((p) => p === "usuario" || p === "aluno");
}

function normalizarPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p;
}

/** Administração completa do painel de senhas (rotas `/senhas/admin`, totem, painel TV, etc.). */
export function podePainelSenhasAdministracao(papeis: Papel[], email?: string | null): boolean {
  if (papeis.includes("admin") || papeis.includes("painel_admin")) return true;
  return isPainelAdminEmail(email);
}

function podeAcessoRotasSenhas(papeis: Papel[], pathname: string, email?: string | null): boolean {
  if (podePainelSenhasAdministracao(papeis, email)) return true;
  const atendentePainel =
    papeis.includes("painel_atendente") || papeis.includes("secretaria");
  if (!atendentePainel) return false;
  const path = normalizarPath(pathname);
  return path === "/senhas" || path.startsWith("/senhas/atendente");
}

/**
 * Permissão por papel (ignora bloqueio temporário). Usado para decidir se o item aparece no menu.
 */
export function hasRoleAccessToRoute(papeis: Papel[], pathname: string, email?: string | null): boolean {
  const path = normalizarPath(pathname);
  if (papeis.includes("admin")) return true;

  if (path.startsWith("/setores/") && path.endsWith("/visao-geral")) {
    return true;
  }

  if (papeis.includes("aluno") && ROTAS_BLOQUEADAS_ALUNO.has(path)) return false;

  if (isSomenteAluno(papeis)) {
    return (
      path === "/login" || path === "/reserva-espacos-equipamentos" || path === "/minhas-reservas"
    );
  }

  if (path.startsWith("/kanban/")) {
    const slug = path.replace("/kanban/", "");
    return podeAcessarKanban(papeis, slug);
  }

  if (path.startsWith("/senhas")) {
    return podeAcessoRotasSenhas(papeis, pathname, email);
  }

  if (ROTAS_INTRANET_COMUM.has(path)) return true;

  const obrigatorios = ROTAS_PAPEIS_OBRIGATORIOS[path];
  if (!obrigatorios || obrigatorios.length === 0) return false;
  return obrigatorios.some((p) => papeis.includes(p));
}

/**
 * Indica se o utilizador pode aceder à rota (papel + bloqueio temporário, exceto setape / painel_admin).
 *
 * @param email Opcional; usado para o fallback de admin do painel via `VITE_PAINEL_ADMIN_EMAILS`.
 */
export function canAccessRoute(papeis: Papel[], pathname: string, email?: string | null): boolean {
  if (!hasRoleAccessToRoute(papeis, pathname, email)) return false;
  if (isRotaBloqueadaParaUsuario(papeis, pathname)) return false;
  return true;
}

/** Quando o destino pedido não é permitido (ex.: após login). */
export function destinoPadraoAposLogin(papeis: Papel[], email?: string | null): string {
  if (isSomenteAluno(papeis)) return "/reserva-espacos-equipamentos";
  if (canAccessRoute(papeis, "/", email)) return "/";
  if (canAccessRoute(papeis, "/senhas/atendente", email)) return "/senhas/atendente";
  return "/reserva-espacos-equipamentos";
}
