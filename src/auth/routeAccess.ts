import type { Papel } from "./AuthProvider";
import { isPainelAdminEmail } from "@/painel/painelEnv";
import { isRotaBloqueadaParaUsuario } from "./routesTemporarilyBlocked";
import { podeAcessarKanban } from "@/lib/kanban";
import {
  canAccessGestaoChamadosSetor,
  getChamadosSetorBySlug,
} from "@/lib/chamadosSetores";

/**
 * Rotas da intranet comum (funcionários; exclui perfil “somente aluno”).
 * Alunos em `/Alunos FACULDADE` ou `/Alunos TECSCCI` têm conjunto próprio em `isSomenteAluno`.
 */
const ROTAS_INTRANET_COMUM = new Set([
  "/achados-e-perdidos/publico",
  "/",
  "/avisos",
  "/portal-do-funcionario",
  "/chamados/novo",
  "/agenda-cci",
  "/minhas-reservas",
  "/reserva-espacos-equipamentos",
  "/documentos",
  "/ramais",
  "/meu-setor",
  "/cci-pay",
  "/vale-adiantamento",
  "/cci-pay/loja",
  "/cci-pay/meus-pedidos",
  "/comunicados-intersetoriais",
]);

const PAPEIS_PROFESSORES: Papel[] = ["professorfac", "professortecs", "professorregular"];

const PAPEIS_ACHADOS_PERDIDOS: Papel[] = ["secretaria", "gerente_secretaria", "painel_admin"];

/** Alunos não acessam o módulo de avisos. */
const ROTAS_BLOQUEADAS_ALUNO = new Set(["/avisos", "/avisos/publicar"]);

/**
 * Rotas extra-comuns: o utilizador precisa de **pelo menos um** dos papéis listados.
 * Rotas não listadas aqui e fora de `ROTAS_INTRANET_COMUM` e fora de `/senhas/*` → acesso negado
 * (exceto `admin`, que vê tudo).
 */
export const ROTAS_PAPEIS_OBRIGATORIOS: Record<string, Papel[]> = {
  "/admin/papeis-manuais": ["admin"],
  "/chamados/gestao": ["admin"],
  "/setores": ["admin"],
  /** Publicar avisos — TI / administração. */
  "/avisos/publicar": ["admin", "setape"],
  "/ti-interno": ["setape"],
  "/controle-materiais-ti": ["setape"],
  "/ti/ischolar": ["setape"],
  "/ti/alterdata": ["setape"],
  "/controle-materiais-almoxarifado": ["almoxarifado"],
  "/financeiro/vales-adiantamento": ["dp", "financeiro", "ccipay_dp", "ccipay_admin"],
  "/cci-pay/financeiro": ["dp", "financeiro", "ccipay_dp", "ccipay_admin"],
  "/cci-pay/lancamentos": ["ccipay_lancador", "ccipay_admin"],
  "/cci-pay/admin/funcionarios": ["dp", "financeiro", "ccipay_dp", "ccipay_admin"],
  "/cci-pay/admin/lojas": ["ccipay_admin"],
  "/cci-pay/admin/lancadores": ["ccipay_admin"],
  "/cci-pay/relatorios/dp": ["dp", "financeiro", "ccipay_dp", "ccipay_admin"],
  "/cci-pay/relatorios/loja": ["ccipay_loja", "ccipay_admin", "ccipay_dp"],
  "/agenda-cci/admin": ["setape"],
  "/achados-e-perdidos": PAPEIS_ACHADOS_PERDIDOS,
  "/achados-e-perdidos/admin": PAPEIS_ACHADOS_PERDIDOS,
  "/setores/professores": PAPEIS_PROFESSORES,
  "/setores/disciplinar": ["disciplinar"],
  "/setores/secretaria": ["secretaria"],
  "/setores/servicos-gerais": ["servicosgerais"],
  "/setores/publicidade": ["publicidade"],
  "/setores/dp-financeiro": ["dp", "financeiro"],
  "/dp-financeiro/atestados": ["dp", "financeiro", "gerente_dp", "gerente_financeiro"],
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

  if (path === "/chamados/gestao") {
    return papeis.includes("admin");
  }

  const gestaoSetorMatch = path.match(/^\/chamados\/gestao\/([^/]+)$/);
  if (gestaoSetorMatch) {
    const slug = gestaoSetorMatch[1];
    if (!getChamadosSetorBySlug(slug)) return false;
    return canAccessGestaoChamadosSetor(papeis, slug);
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
