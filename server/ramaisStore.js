import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAMAIS_FILE = path.join(__dirname, "data", "ramais.json");

/** Lida com leitura fallback do JSON local */
export function lerRamaisLocal() {
  try {
    if (!fs.existsSync(RAMAIS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(RAMAIS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("[ramais-store] Erro ao ler JSON local:", e.message);
    return [];
  }
}

/** Lida com gravação local no JSON */
export function salvarRamaisLocal(dados) {
  try {
    const dir = path.dirname(RAMAIS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RAMAIS_FILE, JSON.stringify(dados, null, 2), "utf-8");
  } catch (e) {
    console.error("[ramais-store] Erro ao salvar JSON local:", e.message);
  }
}

/** Converte linha do Supabase para objeto Ramal com tipos garantidos */
function rowToRamal(row) {
  return {
    id: String(row.id || `ramal-${Math.random()}`),
    nome: String(row.nome || ""),
    ramal: String(row.ramal || ""),
    setor: String(row.setor || ""),
    ordem: Number(row.ordem ?? 0),
    criadoEm: row.criado_em || row.criadoEm,
    atualizadoEm: row.atualizado_em || row.atualizadoEm
  };
}

/** Converte objeto Ramal para linha do Supabase */
function ramalToRow(item) {
  return {
    id: String(item.id || `ramal-${Date.now()}`),
    nome: String(item.nome || ""),
    ramal: String(item.ramal || ""),
    setor: String(item.setor || ""),
    ordem: Number(item.ordem ?? 0),
    criado_em: item.criadoEm || new Date().toISOString(),
    atualizado_em: item.atualizadoEm || new Date().toISOString()
  };
}

/** Listar Ramais (Tenta Supabase, com auto-população inicial e fallback para JSON local) */
export async function listarRamaisStore(supabase) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_ramais")
        .select("*")
        .order("ordem", { ascending: true });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const listaSupa = data.map(rowToRamal);
          console.log(`[ramais-store] Retornando ${listaSupa.length} ramais do Supabase.`);
          salvarRamaisLocal(listaSupa);
          return listaSupa;
        } else {
          // Se a tabela no Supabase existir mas estiver vazia, popula automaticamente com os dados locais
          const locais = lerRamaisLocal();
          if (locais.length > 0) {
            console.log("[ramais-store] Populando tabela intranet_ramais no Supabase com os dados locais...");
            const rows = locais.map(ramalToRow);
            await supabase.from("intranet_ramais").upsert(rows, { onConflict: "id" });
            return locais.map(rowToRamal);
          }
        }
      } else if (error) {
        console.warn("[ramais-store] Tabela Supabase não encontrada ou sem permissão (usando JSON local):", error.message);
      }
    } catch (e) {
      console.warn("[ramais-store] Exceção ao consultar Supabase, usando JSON local:", e.message);
    }
  }

  const locais = lerRamaisLocal();
  console.log(`[ramais-store] Retornando ${locais.length} ramais do arquivo local de contingência.`);
  return (locais || []).map(rowToRamal);
}

/** Salvar ou Criar Ramal (Salva no JSON local e no Supabase) */
export async function salvarRamalStore(supabase, ramal) {
  const agora = new Date().toISOString();
  const locais = lerRamaisLocal();
  
  let item = { ...ramal };
  if (!item.id) {
    item.id = `ramal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    item.criadoEm = agora;
  }
  item.atualizadoEm = agora;

  const idx = locais.findIndex((r) => r.id === item.id);
  if (idx !== -1) {
    locais[idx] = { ...locais[idx], ...item };
    item = locais[idx];
  } else {
    if (item.ordem === undefined) {
      item.ordem = locais.length + 1;
    }
    locais.push(item);
  }

  salvarRamaisLocal(locais);

  if (supabase) {
    try {
      const row = ramalToRow(item);
      const { error } = await supabase
        .from("intranet_ramais")
        .upsert(row, { onConflict: "id" });

      if (error) {
        console.warn("[ramais-store] Erro ao fazer upsert no Supabase:", error.message);
      } else {
        console.log(`[ramais-store] Ramal ${item.id} (${item.nome}) salvo no Supabase.`);
      }
    } catch (e) {
      console.warn("[ramais-store] Exceção ao persistir no Supabase:", e.message);
    }
  }

  return item;
}

/** Excluir Ramal */
export async function excluirRamalStore(supabase, id) {
  let locais = lerRamaisLocal();
  locais = locais.filter((r) => r.id !== id);
  salvarRamaisLocal(locais);

  if (supabase) {
    try {
      const { error } = await supabase
        .from("intranet_ramais")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("[ramais-store] Erro ao excluir do Supabase:", error.message);
      } else {
        console.log(`[ramais-store] Ramal ${id} excluído do Supabase.`);
      }
    } catch (e) {
      console.warn("[ramais-store] Exceção ao excluir do Supabase:", e.message);
    }
  }

  return true;
}

/** Salvar lista completa / Reordenar */
export async function salvarTodosRamaisStore(supabase, listaRamais) {
  salvarRamaisLocal(listaRamais);

  if (supabase && Array.isArray(listaRamais) && listaRamais.length > 0) {
    try {
      const rows = listaRamais.map(ramalToRow);
      const { error } = await supabase
        .from("intranet_ramais")
        .upsert(rows, { onConflict: "id" });

      if (error) {
        console.warn("[ramais-store] Erro ao fazer upsert em lote no Supabase:", error.message);
      }
    } catch (e) {
      console.warn("[ramais-store] Exceção ao fazer upsert em lote no Supabase:", e.message);
    }
  }

  return listaRamais;
}
