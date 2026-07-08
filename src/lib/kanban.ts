import { apiUrl } from "@/lib/apiBase";
import type { Papel } from "@/auth/AuthProvider";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type KanbanColuna = "todo" | "doing" | "done";
export type KanbanPrioridade = "baixa" | "media" | "alta";

export type KanbanCard = {
  id: string;
  setor: string;
  titulo: string;
  descricao: string;
  coluna: KanbanColuna;
  atribuidoA: string[];
  atribuidoNome: string[];
  criadoPor: string;
  criadoPorNome: string | null;
  prioridade: KanbanPrioridade;
  dataLimite: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type KanbanUsuario = {
  email: string;
  nome: string;
  isGerente: boolean;
};

// ─── Config de setores ───────────────────────────────────────────────────────

export const KANBAN_SETORES = [
  { slug: "biblioteca",         papel: "biblioteca"        as Papel, gerentePapel: "gerente_biblioteca"        as Papel, nome: "Biblioteca"       },
  { slug: "direcao",            papel: "direcao"           as Papel, gerentePapel: "gerente_direcao"           as Papel, nome: "Direção"          },
  { slug: "disciplinar",        papel: "disciplinar"       as Papel, gerentePapel: "gerente_disciplinar"       as Papel, nome: "Disciplinar"      },
  { slug: "dp-financeiro",      papel: "dp"                as Papel, gerentePapel: "gerente_dp"                as Papel, nome: "DP e Financeiro"  },
  { slug: "faculdade",          papel: "faculdade"         as Papel, gerentePapel: "gerente_faculdade"         as Papel, nome: "Faculdade"        },
  { slug: "publicidade",        papel: "publicidade"       as Papel, gerentePapel: "gerente_publicidade"       as Papel, nome: "Publicidade"      },
  { slug: "secretaria",         papel: "secretaria"        as Papel, gerentePapel: "gerente_secretaria"        as Papel, nome: "Secretaria"       },
  { slug: "servicosgerais",     papel: "servicosgerais"    as Papel, gerentePapel: "gerente_servicosgerais"    as Papel, nome: "Serviços Gerais"  },
  { slug: "setape",             papel: "setape"            as Papel, gerentePapel: "gerente_setape"            as Papel, nome: "Setape / TI"      },
  { slug: "primeirossocorros",  papel: "primeirossocorros" as Papel, gerentePapel: "gerente_primeirossocorros" as Papel, nome: "Primeiros Socorros"},
  { slug: "clat",               papel: "clat"              as Papel, gerentePapel: "gerente_clat"              as Papel, nome: "CLAT"             },
  { slug: "almoxarifado",       papel: "almoxarifado"      as Papel, gerentePapel: "gerente_almoxarifado"      as Papel, nome: "Almoxarifado"     },
] as const;

export type KanbanSetorSlug = typeof KANBAN_SETORES[number]["slug"];

export function getSetorBySlug(slug: string) {
  return KANBAN_SETORES.find((s) => s.slug === slug) ?? null;
}

export function isGerenteDoSetor(papeis: Papel[], slug: string): boolean {
  if (slug === "dp-financeiro") {
    return papeis.includes("gerente_dp") || papeis.includes("gerente_financeiro");
  }
  const s = getSetorBySlug(slug);
  if (!s) return false;
  return papeis.includes(s.gerentePapel);
}

export function podeAcessarKanban(papeis: Papel[], slug: string): boolean {
  if (papeis.includes("admin")) return true;
  if (slug === "dp-financeiro") {
    return (
      papeis.includes("dp") ||
      papeis.includes("financeiro") ||
      papeis.includes("gerente_dp") ||
      papeis.includes("gerente_financeiro")
    );
  }
  const s = getSetorBySlug(slug);
  if (!s) return false;
  return papeis.includes(s.papel) || papeis.includes(s.gerentePapel);
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────

export const COLUNAS: { key: KanbanColuna; label: string; cor: string; bgGlass: string; borderColor: string }[] = [
  { key: "todo",  label: "A Fazer",       cor: "text-blue-600 dark:text-blue-400",   bgGlass: "bg-blue-50/40 dark:bg-blue-950/30",   borderColor: "border-blue-200 dark:border-blue-500/30" },
  { key: "doing", label: "Em Andamento",  cor: "text-amber-600 dark:text-amber-400",  bgGlass: "bg-amber-50/40 dark:bg-amber-950/30",  borderColor: "border-amber-200 dark:border-amber-500/30" },
  { key: "done",  label: "Concluído",     cor: "text-emerald-600 dark:text-emerald-400",bgGlass: "bg-emerald-50/40 dark:bg-emerald-950/30",borderColor: "border-emerald-200 dark:border-emerald-500/30" },
];

export const PRIORIDADE_INFO: Record<KanbanPrioridade, { label: string; className: string }> = {
  alta:  { label: "Alta",  className: "bg-red-500/20 text-red-400 border-red-500/30" },
  media: { label: "Média", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  baixa: { label: "Baixa", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export function iniciais(nome: string | null | undefined): string {
  if (!nome) return "?";
  const parts = nome.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export async function listarKanbanCards(idToken: string, setor: string): Promise<KanbanCard[]> {
  const res = await fetch(apiUrl("/api/kanban/cards/listar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, setor }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error ?? "Erro ao listar cards.");
  return Array.isArray(data.cards) ? (data.cards as KanbanCard[]) : [];
}

export async function criarKanbanCard(idToken: string, card: Partial<KanbanCard>): Promise<KanbanCard> {
  const res = await fetch(apiUrl("/api/kanban/cards/criar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, card }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error ?? "Erro ao criar card.");
  return data.card as KanbanCard;
}

export async function atualizarKanbanCard(idToken: string, id: string, patch: Partial<KanbanCard>): Promise<KanbanCard> {
  const res = await fetch(apiUrl("/api/kanban/cards/atualizar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, id, patch }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error ?? "Erro ao atualizar card.");
  return data.card as KanbanCard;
}

export async function excluirKanbanCard(idToken: string, id: string): Promise<void> {
  const res = await fetch(apiUrl("/api/kanban/cards/excluir"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, id }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error ?? "Erro ao excluir card.");
}

export async function listarKanbanUsuarios(idToken: string, setor: string): Promise<KanbanUsuario[]> {
  const res = await fetch(apiUrl("/api/kanban/usuarios"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, setor }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error ?? "Erro ao listar usuários.");
  return Array.isArray(data.usuarios) ? (data.usuarios as KanbanUsuario[]) : [];
}
