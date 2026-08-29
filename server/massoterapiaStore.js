import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MASSOTERAPIA_FILE = path.join(__dirname, "data", "massoterapia-agendamentos.json");
const MASSOTERAPIA_CONFIG_FILE = path.join(__dirname, "data", "massoterapia-config.json");

const CONFIG_PADRAO = {
  titulo: "Programa de Bem-Estar CCI",
  dataEventoTexto: "Data a ser definida pelo DP",
  dataEventoYmd: "evento-atual",
  descricao: "Para que todos possam aproveitar a experiência de forma organizada, os atendimentos serão realizados mediante agendamento, com horários disponíveis a cada 15 minutos, das 9h00 às 18h00, com intervalo das 12h00 às 13h00.",
  ativo: true,
};

/** Lê a configuração do evento */
export function lerConfigMassoterapiaLocal() {
  try {
    if (!fs.existsSync(MASSOTERAPIA_CONFIG_FILE)) {
      return CONFIG_PADRAO;
    }
    const raw = fs.readFileSync(MASSOTERAPIA_CONFIG_FILE, "utf-8");
    return { ...CONFIG_PADRAO, ...JSON.parse(raw || "{}") };
  } catch (e) {
    console.error("[massoterapia-store] Erro ao ler config local:", e.message);
    return CONFIG_PADRAO;
  }
}

/** Salva a configuração do evento */
export function salvarConfigMassoterapiaLocal(config) {
  try {
    const dir = path.dirname(MASSOTERAPIA_CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MASSOTERAPIA_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("[massoterapia-store] Erro ao salvar config local:", e.message);
  }
}

export async function obterConfigMassoterapiaStore(supabase) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_massoterapia_config")
        .select("*")
        .eq("id", "config_principal")
        .single();
      if (!error && data) {
        return {
          titulo: data.titulo || CONFIG_PADRAO.titulo,
          dataEventoTexto: data.data_evento_texto || CONFIG_PADRAO.dataEventoTexto,
          dataEventoYmd: data.data_evento_ymd || CONFIG_PADRAO.dataEventoYmd,
          descricao: data.descricao || CONFIG_PADRAO.descricao,
          ativo: data.ativo !== false,
        };
      }
    } catch {
      // Fallback para arquivo local
    }
  }
  return lerConfigMassoterapiaLocal();
}

export async function atualizarConfigMassoterapiaStore(supabase, config) {
  const finalConfig = { ...lerConfigMassoterapiaLocal(), ...config };
  salvarConfigMassoterapiaLocal(finalConfig);

  if (supabase) {
    try {
      await supabase.from("intranet_massoterapia_config").upsert({
        id: "config_principal",
        titulo: finalConfig.titulo,
        data_evento_texto: finalConfig.dataEventoTexto,
        data_evento_ymd: finalConfig.dataEventoYmd,
        descricao: finalConfig.descricao,
        ativo: finalConfig.ativo,
        atualizado_em: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[massoterapia-store] Erro ao salvar config no Supabase:", e.message);
    }
  }

  return finalConfig;
}

/** Lê os agendamentos do JSON local de fallback */
export function lerAgendamentosMassoterapiaLocal() {
  try {
    if (!fs.existsSync(MASSOTERAPIA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(MASSOTERAPIA_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("[massoterapia-store] Erro ao ler JSON local:", e.message);
    return [];
  }
}

/** Salva os agendamentos no JSON local */
export function salvarAgendamentosMassoterapiaLocal(dados) {
  try {
    const dir = path.dirname(MASSOTERAPIA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MASSOTERAPIA_FILE, JSON.stringify(dados, null, 2), "utf-8");
  } catch (e) {
    console.error("[massoterapia-store] Erro ao salvar JSON local:", e.message);
  }
}

/** Converte linha do Supabase para objeto de Agendamento */
function rowToAgendamento(row) {
  return {
    id: row.id,
    nomeCompleto: row.nome_completo,
    email: row.email,
    setor: row.setor || "",
    data: row.data, // YYYY-MM-DD
    horario: row.horario, // HH:mm
    duracaoMinutos: row.duracao_minutos || 15,
    observacoes: row.observacoes || "",
    status: row.status || "agendado", // 'agendado' | 'cancelado' | 'realizado'
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    canceladoPor: row.cancelado_por || null,
    canceladoEm: row.cancelado_em || null,
  };
}

/** Converte objeto Agendamento para linha do Supabase */
function agendamentoToRow(item) {
  return {
    id: item.id,
    nome_completo: item.nomeCompleto,
    email: item.email,
    setor: item.setor || "",
    data: item.data,
    horario: item.horario,
    duracao_minutos: item.duracaoMinutos || 15,
    observacoes: item.observacoes || "",
    status: item.status || "agendado",
    criado_em: item.criadoEm || new Date().toISOString(),
    atualizado_em: item.atualizadoEm || new Date().toISOString(),
    cancelado_por: item.canceladoPor || null,
    cancelado_em: item.canceladoEm || null,
  };
}

/**
 * Listar agendamentos (Tenta Supabase com fallback para JSON local)
 * @param {any} supabase
 * @param {string} [dataFiltro] Formato YYYY-MM-DD
 */
export async function listarAgendamentosStore(supabase, dataFiltro) {
  if (supabase) {
    try {
      let query = supabase
        .from("intranet_massoterapia")
        .select("*")
        .order("horario", { ascending: true });

      if (dataFiltro) {
        query = query.eq("data", dataFiltro);
      }

      const { data, error } = await query;

      if (!error && data) {
        const listaSupa = data.map(rowToAgendamento);
        if (!dataFiltro) {
          salvarAgendamentosMassoterapiaLocal(listaSupa);
        }
        return listaSupa;
      } else if (error) {
        console.warn("[massoterapia-store] Tabela Supabase não encontrada ou erro, usando fallback JSON:", error.message);
      }
    } catch (e) {
      console.warn("[massoterapia-store] Exceção ao consultar Supabase, usando fallback JSON:", e.message);
    }
  }

  const locais = lerAgendamentosMassoterapiaLocal();
  if (dataFiltro) {
    return locais.filter((a) => a.data === dataFiltro);
  }
  return locais;
}

/**
 * Criar novo Agendamento com validação de conflito de horário
 */
export async function criarAgendamentoStore(supabase, agendamento) {
  // 1. Verificar conflito de horário no mesmo dia
  const todos = await listarAgendamentosStore(supabase, agendamento.data);
  const conflito = todos.find(
    (a) =>
      a.status === "agendado" &&
      a.data === agendamento.data &&
      a.horario === agendamento.horario &&
      a.id !== agendamento.id
  );

  if (conflito) {
    throw new Error(`O horário ${agendamento.horario} já foi reservado por outro participante.`);
  }

  // 2. Salva no JSON local
  const locais = lerAgendamentosMassoterapiaLocal();
  locais.unshift(agendamento);
  salvarAgendamentosMassoterapiaLocal(locais);

  // 3. Salva no Supabase se configurado
  if (supabase) {
    try {
      const row = agendamentoToRow(agendamento);
      const { error } = await supabase.from("intranet_massoterapia").insert(row);
      if (error) {
        console.warn("[massoterapia-store] Erro ao inserir no Supabase (salvo no JSON local):", error.message);
      } else {
        console.log(`[massoterapia-store] Agendamento ${agendamento.id} inserido no Supabase.`);
      }
    } catch (e) {
      console.warn("[massoterapia-store] Exceção ao inserir no Supabase:", e.message);
    }
  }

  return agendamento;
}

/**
 * Cancelar um agendamento
 */
export async function cancelarAgendamentoStore(supabase, id, canceladoPorEmail) {
  const now = new Date().toISOString();
  const locais = lerAgendamentosMassoterapiaLocal();
  const idx = locais.findIndex((a) => a.id === id);
  let atualizado = null;

  if (idx !== -1) {
    locais[idx] = {
      ...locais[idx],
      status: "cancelado",
      canceladoPor: canceladoPorEmail,
      canceladoEm: now,
      atualizadoEm: now,
    };
    atualizado = locais[idx];
    salvarAgendamentosMassoterapiaLocal(locais);
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from("intranet_massoterapia")
        .update({
          status: "cancelado",
          cancelado_por: canceladoPorEmail,
          cancelado_em: now,
          atualizado_em: now,
        })
        .eq("id", id);

      if (error) {
        console.warn("[massoterapia-store] Erro ao atualizar cancelamento no Supabase:", error.message);
      }
    } catch (e) {
      console.warn("[massoterapia-store] Exceção ao cancelar no Supabase:", e.message);
    }
  }

  return atualizado;
}

/**
 * Zera/limpa todos os agendamentos para iniciar uma nova ação de massoterapia
 */
export async function zerarAgendamentosStore(supabase) {
  salvarAgendamentosMassoterapiaLocal([]);

  if (supabase) {
    try {
      const { error } = await supabase
        .from("intranet_massoterapia")
        .delete()
        .neq("id", "none");

      if (error) {
        console.warn("[massoterapia-store] Erro ao zerar no Supabase:", error.message);
      }
    } catch (e) {
      console.warn("[massoterapia-store] Exceção ao zerar no Supabase:", e.message);
    }
  }

  return { ok: true };
}

