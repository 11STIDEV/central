import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_JSON_PATH = path.join(__dirname, "data", "ccipay-repasses.json");

function lerRepassesLocais() {
  try {
    if (!fs.existsSync(LOCAL_JSON_PATH)) return [];
    const raw = fs.readFileSync(LOCAL_JSON_PATH, "utf8");
    return JSON.parse(raw) || [];
  } catch (e) {
    console.error("[ccipay-repasses] erro ao ler repasses locais:", e);
    return [];
  }
}

function salvarRepassesLocais(lista) {
  try {
    const dir = path.dirname(LOCAL_JSON_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(lista, null, 2), "utf8");
  } catch (e) {
    console.error("[ccipay-repasses] erro ao salvar repasses locais:", e);
  }
}

let supabaseTableChecked = false;
let supabaseTableExists = false;

async function verificarTabelaSupabase(supabase) {
  if (supabaseTableChecked) return supabaseTableExists;
  try {
    const { error } = await supabase.from("ccipay_repasses_loja").select("id").limit(1);
    supabaseTableChecked = true;
    supabaseTableExists = !error;
    return supabaseTableExists;
  } catch (_) {
    supabaseTableChecked = true;
    supabaseTableExists = false;
    return false;
  }
}

function extrairDadosVendasRepasse(r) {
  let vendaIds = Array.isArray(r.vendaIds) ? r.vendaIds : Array.isArray(r.venda_ids) ? r.venda_ids : [];
  let pedidoIds = Array.isArray(r.pedidoIds) ? r.pedidoIds : Array.isArray(r.pedido_ids) ? r.pedido_ids : [];
  let obsLimpa = r.observacao || "";

  if (typeof obsLimpa === "string" && obsLimpa.includes("__META_VENDAS__:")) {
    try {
      const idx = obsLimpa.indexOf("__META_VENDAS__:");
      const jsonStr = obsLimpa.slice(idx + "__META_VENDAS__:".length).trim();
      obsLimpa = obsLimpa.slice(0, idx).trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.vendaIds) && vendaIds.length === 0) vendaIds = parsed.vendaIds;
      if (Array.isArray(parsed.pedidoIds) && pedidoIds.length === 0) pedidoIds = parsed.pedidoIds;
    } catch (_) {}
  }

  return { vendaIds, pedidoIds, observacao: obsLimpa };
}

export async function listarRepassesLoja(supabase, lojaId, filtros = {}) {
  const { competencia, de, ate } = filtros;
  const useSupabase = await verificarTabelaSupabase(supabase);

  if (useSupabase) {
    try {
      let q = supabase
        .from("ccipay_repasses_loja")
        .select("*")
        .eq("loja_id", lojaId)
        .order("data_pagamento", { ascending: false });

      if (competencia) q = q.eq("competencia", competencia);
      if (de) q = q.gte("data_pagamento", de);
      if (ate) q = q.lte("data_pagamento", ate);

      const { data, error } = await q;
      if (!error && data) {
        return data.map((r) => {
          const { vendaIds, pedidoIds, observacao } = extrairDadosVendasRepasse(r);
          return {
            id: r.id,
            lojaId: r.loja_id,
            valor: Number(r.valor),
            competencia: r.competencia || "",
            dataPagamento: r.data_pagamento,
            formaPagamento: r.forma_pagamento || "pix",
            comprovante: r.comprovante || "",
            observacao,
            vendaIds,
            pedidoIds,
            criadoPor: r.criado_por || "",
            createdAt: r.created_at,
          };
        });
      }
    } catch (e) {
      console.warn("[ccipay-repasses] falha ao buscar no Supabase, usando fallback local:", e.message);
    }
  }

  // Fallback local
  const todos = lerRepassesLocais();
  return todos
    .filter((r) => {
      if (r.lojaId !== lojaId) return false;
      if (competencia && r.competencia !== competencia) return false;
      if (de && new Date(r.dataPagamento) < new Date(de)) return false;
      if (ate && new Date(r.dataPagamento) > new Date(ate)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime())
    .map((r) => {
      const { vendaIds, pedidoIds, observacao } = extrairDadosVendasRepasse(r);
      return {
        ...r,
        vendaIds,
        pedidoIds,
        observacao,
      };
    });
}

export async function registrarRepasseLoja(supabase, payload) {
  const {
    lojaId,
    valor,
    competencia,
    dataPagamento,
    formaPagamento,
    comprovante,
    observacao,
    criadoPor,
    vendaIds = [],
    pedidoIds = [],
  } = payload;

  const valorNum = Number(valor);
  if (!lojaId || Number.isNaN(valorNum) || valorNum <= 0) {
    throw new Error("Informe a loja e um valor válido maior que zero.");
  }

  const vIdsArray = Array.isArray(vendaIds) ? vendaIds : [];
  const pIdsArray = Array.isArray(pedidoIds) ? pedidoIds : [];

  const useSupabase = await verificarTabelaSupabase(supabase);
  const now = new Date().toISOString();
  const dataPgtoIso = dataPagamento ? new Date(dataPagamento).toISOString() : now;

  let obsComMeta = (observacao || "").trim();
  if (vIdsArray.length > 0 || pIdsArray.length > 0) {
    obsComMeta += (obsComMeta ? "\n" : "") + `__META_VENDAS__:${JSON.stringify({
      vendaIds: vIdsArray,
      pedidoIds: pIdsArray,
    })}`;
  }

  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from("ccipay_repasses_loja")
        .insert({
          loja_id: lojaId,
          valor: valorNum,
          competencia: competencia || null,
          data_pagamento: dataPgtoIso,
          forma_pagamento: formaPagamento || "pix",
          comprovante: comprovante || "",
          observacao: obsComMeta,
          criado_por: criadoPor || "",
          created_at: now,
        })
        .select("*")
        .single();

      if (!error && data) {
        return {
          id: data.id,
          lojaId: data.loja_id,
          valor: Number(data.valor),
          competencia: data.competencia || "",
          dataPagamento: data.data_pagamento,
          formaPagamento: data.forma_pagamento || "pix",
          comprovante: data.comprovante || "",
          observacao: (observacao || "").trim(),
          vendaIds: vIdsArray,
          pedidoIds: pIdsArray,
          criadoPor: data.criado_por || "",
          createdAt: data.created_at,
        };
      }
    } catch (e) {
      console.warn("[ccipay-repasses] falha ao inserir no Supabase, usando fallback local:", e.message);
    }
  }

  // Fallback local
  const novoRepasse = {
    id: randomUUID(),
    lojaId,
    valor: valorNum,
    competencia: competencia || "",
    dataPagamento: dataPgtoIso,
    formaPagamento: formaPagamento || "pix",
    comprovante: comprovante || "",
    observacao: (observacao || "").trim(),
    vendaIds: vIdsArray,
    pedidoIds: pIdsArray,
    criadoPor: criadoPor || "",
    createdAt: now,
  };

  const lista = lerRepassesLocais();
  lista.push(novoRepasse);
  salvarRepassesLocais(lista);
  return novoRepasse;
}

export async function excluirRepasseLoja(supabase, id) {
  const useSupabase = await verificarTabelaSupabase(supabase);

  if (useSupabase) {
    try {
      const { error } = await supabase.from("ccipay_repasses_loja").delete().eq("id", id);
      if (!error) return true;
    } catch (_) {}
  }

  const lista = lerRepassesLocais();
  const filtrada = lista.filter((r) => r.id !== id);
  salvarRepassesLocais(filtrada);
  return true;
}
