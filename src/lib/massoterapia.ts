/**
 * Cliente e utilitários para o módulo de Massoterapia e Massagem Relaxante
 * (Programa de Bem-Estar CCI)
 */

export interface AgendamentoMassoterapia {
  id: string;
  nomeCompleto: string;
  email: string;
  setor?: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  duracaoMinutos: number;
  observacoes?: string;
  status: "agendado" | "cancelado" | "realizado";
  criadoEm?: string;
  atualizadoEm?: string;
  canceladoPor?: string | null;
  canceladoEm?: string | null;
}

export interface ConfigMassoterapia {
  titulo: string;
  dataEventoTexto: string; // Ex.: "Sexta-feira (Data a confirmar)" ou "15/09/2026"
  dataEventoYmd: string; // Formato identificador do evento
  descricao: string;
  ativo: boolean;
}

export interface HorarioSlot {
  horario: string; // HH:mm
  disponivel: boolean;
  ocupadoPor?: {
    nome: string;
    email: string;
  };
}

/**
 * Gera os horários fixos de atendimento:
 * - Intervalos de 15 minutos
 * - Das 09:00 às 18:00 (último atendimento às 17:45)
 * - Intervalo de almoço das 12:00 às 13:00 (não gerados)
 */
export function gerarGradeHorariosPadrao(): string[] {
  const slots: string[] = [];

  // Manhã: 09:00 até 11:45
  for (let hora = 9; hora <= 11; hora++) {
    for (let min = 0; min < 60; min += 15) {
      const hStr = String(hora).padStart(2, "0");
      const mStr = String(min).padStart(2, "0");
      slots.push(`${hStr}:${mStr}`);
    }
  }

  // Tarde: 13:00 até 17:45
  for (let hora = 13; hora <= 17; hora++) {
    for (let min = 0; min < 60; min += 15) {
      const hStr = String(hora).padStart(2, "0");
      const mStr = String(min).padStart(2, "0");
      slots.push(`${hStr}:${mStr}`);
    }
  }

  return slots;
}

function getApiUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
  return base || "";
}

/**
 * Lista todos os agendamentos cadastrados (com filtro opcional de data YYYY-MM-DD)
 */
export async function listarAgendamentos(
  data?: string,
  idToken?: string,
): Promise<AgendamentoMassoterapia[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/massoterapia/listar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, idToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status} ao carregar agendamentos.`);
    }

    const json = await res.json();
    return json.agendamentos || [];
  } catch (e) {
    console.error("[massoterapia] Erro ao listar agendamentos:", e);
    throw e;
  }
}

/**
 * Cria um novo agendamento de massoterapia
 */
export async function criarAgendamento(
  dados: {
    nomeCompleto: string;
    email: string;
    setor?: string;
    data: string;
    horario: string;
    observacoes?: string;
  },
  idToken?: string,
): Promise<AgendamentoMassoterapia> {
  const res = await fetch(`${getApiUrl()}/api/massoterapia/agendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dados, idToken }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status} ao agendar horário.`);
  }

  return json.agendamento;
}

/**
 * Cancela um agendamento existente
 */
export async function cancelarAgendamento(
  id: string,
  idToken?: string,
): Promise<AgendamentoMassoterapia> {
  const res = await fetch(`${getApiUrl()}/api/massoterapia/cancelar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, idToken }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status} ao cancelar agendamento.`);
  }

  return json.agendamento;
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD local
 */
export function getHojeYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

/**
 * Obtém a configuração ativa do evento de massoterapia
 */
export async function obterConfigMassoterapia(idToken?: string): Promise<ConfigMassoterapia> {
  const res = await fetch(`${getApiUrl()}/api/massoterapia/obter-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Erro ao obter configurações do evento.");
  }
  return json.config;
}

/**
 * Salva ou atualiza a data/configuração do evento de massoterapia (apenas DP/Admin)
 */
export async function salvarConfigMassoterapia(
  config: Partial<ConfigMassoterapia>,
  idToken?: string,
): Promise<ConfigMassoterapia> {
  const res = await fetch(`${getApiUrl()}/api/massoterapia/salvar-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...config, idToken }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Erro ao salvar configurações do evento.");
  }
  return json.config;
}

/**
 * Zera/limpa todos os agendamentos cadastrados (apenas DP/Admin)
 */
export async function zerarTodosAgendamentos(idToken?: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/api/massoterapia/zerar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Erro ao zerar agendamentos.");
  }
}


