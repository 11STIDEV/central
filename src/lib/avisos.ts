import { apiUrl } from "@/lib/apiBase";

export type AvisoTipo = "aviso" | "informativo" | "urgente" | "tutorial" | "atualizacao";

export type AvisoSetor =
  | "institucional"
  | "direcao"
  | "secretaria"
  | "dp"
  | "financeiro"
  | "setape"
  | "disciplinar"
  | "publicidade"
  | "servicosgerais"
  | "almoxarifado"
  | "biblioteca"
  | "faculdade"
  | "clat"
  | "primeiros-socorros"
  | "professores-faculdade"
  | "professores-tecs"
  | "professores-regular";

export type Aviso = {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: AvisoTipo;
  setor: AvisoSetor;
  autor: string;
  autorEmail: string;
  /** Data legível (pt-BR). */
  data: string;
  createdAt: string;
};

export const AVISO_TIPOS: { value: AvisoTipo; label: string }[] = [
  { value: "aviso", label: "Aviso" },
  { value: "informativo", label: "Informativo" },
  { value: "urgente", label: "Urgente" },
  { value: "tutorial", label: "Tutorial" },
  { value: "atualizacao", label: "Atualização" },
];

export const AVISO_SETORES: { value: AvisoSetor; label: string }[] = [
  { value: "institucional", label: "Institucional" },
  { value: "direcao", label: "Direção" },
  { value: "secretaria", label: "Secretaria" },
  { value: "dp", label: "DP" },
  { value: "financeiro", label: "Financeiro" },
  { value: "setape", label: "Setape (TI)" },
  { value: "disciplinar", label: "Disciplinar" },
  { value: "publicidade", label: "Publicidade" },
  { value: "servicosgerais", label: "Serviços Gerais" },
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "biblioteca", label: "Biblioteca" },
  { value: "faculdade", label: "Faculdade" },
  { value: "clat", label: "CLAT" },
  { value: "primeiros-socorros", label: "Primeiros Socorros" },
  { value: "professores-faculdade", label: "Professores — Faculdade" },
  { value: "professores-tecs", label: "Professores — TECS" },
  { value: "professores-regular", label: "Professores — Regular" },
];

export function labelTipoAviso(tipo: AvisoTipo): string {
  return AVISO_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

export function labelSetorAviso(setor: AvisoSetor): string {
  return AVISO_SETORES.find((s) => s.value === setor)?.label ?? setor;
}

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function erroDaResposta(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}

/** Lista todos os avisos (Supabase via API). */
export async function listarAvisos(idToken: string): Promise<Aviso[]> {
  const res = await fetch(apiUrl("/api/avisos/listar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(erroDaResposta(data, `Erro ao listar avisos (HTTP ${res.status}).`));
  }
  const lista = data.avisos;
  return Array.isArray(lista) ? (lista as Aviso[]) : [];
}

export async function obterUltimosAvisos(idToken: string, limite = 3): Promise<Aviso[]> {
  const todos = await listarAvisos(idToken);
  return todos.slice(0, limite);
}

export type CriarAvisoInput = {
  titulo: string;
  conteudo: string;
  tipo: AvisoTipo;
  setor: AvisoSetor;
};

/** Publica um novo aviso no Supabase. */
export async function criarAviso(idToken: string, input: CriarAvisoInput): Promise<Aviso> {
  const res = await fetch(apiUrl("/api/avisos/criar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, ...input }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(erroDaResposta(data, `Erro ao publicar aviso (HTTP ${res.status}).`));
  }
  const aviso = data.aviso;
  if (!aviso || typeof aviso !== "object") {
    throw new Error("Resposta inválida ao publicar aviso.");
  }
  return aviso as Aviso;
}
