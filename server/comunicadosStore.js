import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMUNICADOS_INTERSETORIAIS_FILE = path.join(__dirname, "data", "comunicadosIntersetoriais.json");

/** Lida com leitura fallback do JSON local */
export function lerComunicadosIntersetoriaisLocal() {
  try {
    if (!fs.existsSync(COMUNICADOS_INTERSETORIAIS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(COMUNICADOS_INTERSETORIAIS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("[comunicados-store] Erro ao ler JSON local:", e.message);
    return [];
  }
}

/** Lida com gravação local no JSON */
export function salvarComunicadosIntersetoriaisLocal(dados) {
  try {
    const dir = path.dirname(COMUNICADOS_INTERSETORIAIS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COMUNICADOS_INTERSETORIAIS_FILE, JSON.stringify(dados, null, 2), "utf-8");
  } catch (e) {
    console.error("[comunicados-store] Erro ao salvar JSON local:", e.message);
  }
}

/** Converte linha do Supabase para objeto Comunicado */
function rowToComunicado(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    setorOrigem: row.setor_origem,
    setoresDestino: Array.isArray(row.setores_destino) ? row.setores_destino : [],
    canaisDivulgacao: Array.isArray(row.canais_divulgacao) ? row.canais_divulgacao : [],
    descricao: row.descricao || "",
    dataValidade: row.data_validade || null,
    anexosOuLinks: Array.isArray(row.anexos_ou_links) ? row.anexos_ou_links : [],
    criadoPorEmail: row.criado_por_email,
    criadoPorNome: row.criado_por_nome,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    cientes: Array.isArray(row.cientes) ? row.cientes : []
  };
}

/** Converte objeto Comunicado para linha do Supabase */
function comunicadoToRow(item) {
  return {
    id: item.id,
    titulo: item.titulo,
    setor_origem: item.setorOrigem,
    setores_destino: item.setoresDestino || [],
    canais_divulgacao: item.canaisDivulgacao || [],
    descricao: item.descricao,
    data_validade: item.dataValidade || null,
    anexos_ou_links: item.anexosOuLinks || [],
    criado_por_email: item.criadoPorEmail,
    criado_por_nome: item.criadoPorNome,
    criado_em: item.criadoEm || new Date().toISOString(),
    atualizado_em: item.atualizadoEm || new Date().toISOString(),
    cientes: item.cientes || []
  };
}

/** Listar Comunicados (Tenta Supabase, com fallback para JSON local) */
export async function listarComunicadosStore(supabase) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_comunicados_intersetoriais")
        .select("*")
        .order("criado_em", { ascending: false });

      if (!error && data) {
        const listaSupa = data.map(rowToComunicado);
        // Atualiza cache local em background
        salvarComunicadosIntersetoriaisLocal(listaSupa);
        return listaSupa;
      } else if (error) {
        console.warn("[comunicados-store] Tabela Supabase não encontrada ou erro, usando fallback JSON:", error.message);
      }
    } catch (e) {
      console.warn("[comunicados-store] Exceção ao consultar Supabase, usando fallback JSON:", e.message);
    }
  }

  return lerComunicadosIntersetoriaisLocal();
}

/** Criar Comunicado (Salva no JSON local e no Supabase) */
export async function criarComunicadoStore(supabase, item) {
  // 1. Salva no JSON local
  const locais = lerComunicadosIntersetoriaisLocal();
  locais.unshift(item);
  salvarComunicadosIntersetoriaisLocal(locais);

  // 2. Salva no Supabase se configurado
  if (supabase) {
    try {
      const row = comunicadoToRow(item);
      const { error } = await supabase
        .from("intranet_comunicados_intersetoriais")
        .insert(row);

      if (error) {
        console.warn("[comunicados-store] Erro ao inserir no Supabase (JSON local salvo):", error.message);
      } else {
        console.log(`[comunicados-store] Comunicado ${item.id} gravado no Supabase com sucesso.`);
      }
    } catch (e) {
      console.warn("[comunicados-store] Exceção ao inserir no Supabase:", e.message);
    }
  }

  return item;
}

/** Atualizar Comunicado / Registrar Ciente / Status (Salva no JSON local e no Supabase) */
export async function atualizarComunicadoStore(supabase, id, patch) {
  // 1. Atualiza no JSON local
  const locais = lerComunicadosIntersetoriaisLocal();
  const idx = locais.findIndex((c) => c.id === id);
  let itemAtualizado = null;
  if (idx !== -1) {
    locais[idx] = {
      ...locais[idx],
      ...patch,
      atualizadoEm: new Date().toISOString()
    };
    itemAtualizado = locais[idx];
    salvarComunicadosIntersetoriaisLocal(locais);
  }

  // 2. Atualiza no Supabase se configurado
  if (supabase && itemAtualizado) {
    try {
      const rowPatch = {};
      if (patch.titulo !== undefined) rowPatch.titulo = patch.titulo;
      if (patch.descricao !== undefined) rowPatch.descricao = patch.descricao;
      if (patch.setorOrigem !== undefined) rowPatch.setor_origem = patch.setorOrigem;
      if (patch.setoresDestino !== undefined) rowPatch.setores_destino = patch.setoresDestino;
      if (patch.canaisDivulgacao !== undefined) rowPatch.canais_divulgacao = patch.canaisDivulgacao;
      if (patch.dataValidade !== undefined) rowPatch.data_validade = patch.dataValidade;
      if (patch.anexosOuLinks !== undefined) rowPatch.anexos_ou_links = patch.anexosOuLinks;
      if (patch.cientes !== undefined) rowPatch.cientes = patch.cientes;
      rowPatch.atualizado_em = new Date().toISOString();

      const { error } = await supabase
        .from("intranet_comunicados_intersetoriais")
        .update(rowPatch)
        .eq("id", id);

      if (error) {
        console.warn("[comunicados-store] Erro ao atualizar no Supabase:", error.message);
      }
    } catch (e) {
      console.warn("[comunicados-store] Exceção ao atualizar no Supabase:", e.message);
    }
  }

  return itemAtualizado;
}

/** Excluir Comunicado */
export async function excluirComunicadoStore(supabase, id) {
  // 1. Exclui do JSON local
  let locais = lerComunicadosIntersetoriaisLocal();
  locais = locais.filter((c) => c.id !== id);
  salvarComunicadosIntersetoriaisLocal(locais);

  // 2. Exclui do Supabase se configurado
  if (supabase) {
    try {
      const { error } = await supabase
        .from("intranet_comunicados_intersetoriais")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("[comunicados-store] Erro ao excluir do Supabase:", error.message);
      }
    } catch (e) {
      console.warn("[comunicados-store] Exceção ao excluir do Supabase:", e.message);
    }
  }
}
