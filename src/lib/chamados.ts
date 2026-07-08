import type { Papel, UsuarioLogado } from "@/auth/AuthProvider";
import { apiUrl } from "@/lib/apiBase";

export type ChamadoStatus = "aberto" | "resolvido";

export type Chamado = {
  id: string;
  titulo: string;
  solicitante: string;
  solicitanteEmail: string;
  /** Papel (não-`usuario`) usado para agrupar visibilidade entre colegas do mesmo perfil. */
  papelAbertura: Papel;
  categoria: string;
  prioridade: "baixa" | "media" | "alta";
  status: ChamadoStatus;
  data: string;
  descricao: string;
  acompanhamentos: { autor: string; texto: string; data: string }[];
  tarefas: { autor: string; texto: string; data: string }[];
  solucao?: { autor: string; texto: string; data: string };
  /** Histórico de reaberturas (setape). Cada entrada arquiva a solução que estava vigente. */
  reaberturas?: {
    autor: string;
    data: string;
    motivo: string;
    solucaoAnterior?: { autor: string; texto: string; data: string };
  }[];
  /** Campos extras para solicitação de filmagem de câmera. */
  solicitaFilmagem?: boolean;
  filmagemData?: string;
  filmagemHoraInicio?: string;
  filmagemHoraFim?: string;
  filmagemTermosAceitos?: boolean;
};

/** Papel “de equipe” para filtro de visibilidade (exclui `usuario` genérico). */
export function papelPrincipalUsuario(papeis: Papel[]): Papel {
  const semUsuario = papeis.filter((p) => p !== "usuario");
  return semUsuario.length > 0 ? semUsuario[0] : "usuario";
}

/** setape vê todos; demais veem o próprio + mesmo papel de abertura. */
export function podeVerChamado(usuario: UsuarioLogado, chamado: Chamado): boolean {
  if (usuario.papeis.includes("setape")) return true;
  if (chamado.solicitanteEmail.toLowerCase() === usuario.email.toLowerCase()) return true;
  return chamado.papelAbertura === papelPrincipalUsuario(usuario.papeis);
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

/** Lista chamados visíveis para o usuário (Supabase via API). */
export async function listarChamados(idToken: string): Promise<Chamado[]> {
  const res = await fetch(apiUrl("/api/chamados/listar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(erroDaResposta(data, `Erro ao listar chamados (HTTP ${res.status}).`));
  }
  const lista = data.chamados;
  return Array.isArray(lista) ? (lista as Chamado[]) : [];
}

export type CriarChamadoInput = {
  titulo: string;
  categoria: string;
  prioridade: "baixa" | "media" | "alta";
  descricao: string;
  /** Campos de solicitação de filmagem (opcionais). */
  solicitaFilmagem?: boolean;
  filmagemData?: string;
  filmagemHoraInicio?: string;
  filmagemHoraFim?: string;
  filmagemTermosAceitos?: boolean;
};

/** Registra um novo chamado no Supabase. */
export async function criarChamado(
  idToken: string,
  input: CriarChamadoInput,
): Promise<Chamado> {
  const res = await fetch(apiUrl("/api/chamados/criar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, ...input }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(erroDaResposta(data, `Erro ao abrir chamado (HTTP ${res.status}).`));
  }
  const chamado = data.chamado;
  if (!chamado || typeof chamado !== "object") {
    throw new Error("Resposta inválida ao criar chamado.");
  }
  return chamado as Chamado;
}

/** Atualiza acompanhamentos, tarefas e solução no Supabase. */
export async function atualizarChamadoRemoto(
  idToken: string,
  chamado: Chamado,
): Promise<Chamado> {
  const res = await fetch(apiUrl("/api/chamados/atualizar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, chamado }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(erroDaResposta(data, `Erro ao salvar chamado (HTTP ${res.status}).`));
  }
  const atualizado = data.chamado;
  if (!atualizado || typeof atualizado !== "object") {
    throw new Error("Resposta inválida ao atualizar chamado.");
  }
  return atualizado as Chamado;
}
