import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { unificarFuncionariosAlterdata } from "./alterdataDeduplication.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DATA_DIR = path.join(__dirname, "data");
const LOCAL_JSON_FILE = path.join(LOCAL_DATA_DIR, "alterdata_funcionarios.json");

function garantirDiretorioLocal() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

export function lerBancoLocal() {
  garantirDiretorioLocal();
  if (!fs.existsSync(LOCAL_JSON_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(LOCAL_JSON_FILE, "utf-8");
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error("[alterdataStore] Erro ao ler JSON local:", err.message);
    return [];
  }
}

export function salvarBancoLocal(itens) {
  garantirDiretorioLocal();
  try {
    fs.writeFileSync(LOCAL_JSON_FILE, JSON.stringify(itens, null, 2), "utf-8");
  } catch (err) {
    console.error("[alterdataStore] Erro ao salvar JSON local:", err.message);
  }
}

export function formatarItemParaPersistencia(item) {
  if (!item) return null;

  // Se o item já veio no formato consolidado de persistência
  if (item.chave_unica && item.nome_completo) {
    return {
      chave_unica: String(item.chave_unica),
      id_alterdata_principal: String(item.id_alterdata_principal || "0"),
      cpf: item.cpf ? String(item.cpf) : null,
      nome_completo: String(item.nome_completo),
      email: item.email ? String(item.email).trim().toLowerCase() : null,
      status_atual: String(item.status_atual || "Ativo"),
      tem_contrato_ativo: item.tem_contrato_ativo !== undefined ? Boolean(item.tem_contrato_ativo) : true,
      codigo_contrato_vigente: item.codigo_contrato_vigente ? String(item.codigo_contrato_vigente) : null,
      primeira_admissao: item.primeira_admissao ? String(item.primeira_admissao) : null,
      admissao_atual: item.admissao_atual ? String(item.admissao_atual) : null,
      demissao_mais_recente: item.demissao_mais_recente ? String(item.demissao_mais_recente) : null,
      total_contratos: Number(item.total_contratos || 1),
      historico_contratos: Array.isArray(item.historico_contratos) ? item.historico_contratos : [],
      codigos_resumo: String(item.codigos_resumo || ""),
      atualizado_em: item.atualizado_em || new Date().toISOString(),
    };
  }

  const attrs = item.attributes || {};
  const unificado = item._unificado || {};

  const cpf = attrs.cpf || attrs.cpfcnpj || attrs.cpf_cnpj || item.cpf || null;
  const cpfDigits = cpf ? String(cpf).replace(/\D/g, "") : null;
  const nomeCompleto = attrs.nome || attrs.nomecargo || attrs.nomeFantasia || item.nome_completo || "Sem Nome";
  const statusAtual = unificado.temContratoAtivo !== undefined
    ? (unificado.temContratoAtivo ? "Ativo" : "Inativo")
    : (item.status_atual || "Ativo");

  const codigoVigente = attrs.codigo || attrs.codigoEmpresa || item.codigo_contrato_vigente || item.id || null;
  const primeiraAdmissao = unificado.primeiraAdmissao || attrs.dataadmissao || attrs.dataAdmissao || item.primeira_admissao || null;
  const admissaoAtual = unificado.admissaoAtual || attrs.dataadmissao || attrs.dataAdmissao || item.admissao_atual || null;
  const demissaoMaisRecente = unificado.demissaoMaisRecente || attrs.datademissao || attrs.dataDemissao || item.demissao_mais_recente || null;
  const totalContratos = unificado.totalContratos || item.total_contratos || 1;
  const historicoContratos = unificado.historicoContratos || item.historico_contratos || [];
  const codigosResumo = unificado.codigosResumo || item.codigos_resumo || "";

  const chaveUnica =
    unificado.chaveUnica ||
    item.chave_unica ||
    (cpfDigits && cpfDigits.length >= 11 ? `CPF:${cpfDigits}` : `ID:${item.id || item.id_alterdata_principal || "0"}`);

  const email =
    unificado.email ||
    attrs.email ||
    attrs.emailComercial ||
    attrs.emailPessoal ||
    attrs.email_corporativo ||
    attrs.emailcorporativo ||
    attrs.email_pessoal ||
    item.email ||
    null;

  return {
    chave_unica: chaveUnica,
    id_alterdata_principal: String(item.id || item.id_alterdata_principal || "0"),
    cpf: cpf ? String(cpf) : null,
    nome_completo: String(nomeCompleto),
    email: email ? String(email).trim().toLowerCase() : null,
    status_atual: statusAtual,
    tem_contrato_ativo: unificado.temContratoAtivo !== undefined ? Boolean(unificado.temContratoAtivo) : true,
    codigo_contrato_vigente: codigoVigente ? String(codigoVigente) : null,
    primeira_admissao: primeiraAdmissao ? String(primeiraAdmissao) : null,
    admissao_atual: admissaoAtual ? String(admissaoAtual) : null,
    demissao_mais_recente: demissaoMaisRecente ? String(demissaoMaisRecente) : null,
    total_contratos: Number(totalContratos),
    historico_contratos: historicoContratos,
    codigos_resumo: String(codigosResumo),
    atualizado_em: new Date().toISOString(),
  };
}

export function extrairResumoColaborador(dbItem) {
  if (!dbItem) return null;

  let cargo = null;
  let pixPadrao = null;
  let banco = null;
  let agencia = null;
  let conta = null;
  let salarioBase = null;
  let departamento = null;
  let telefone = null;

  if (Array.isArray(dbItem.historico_contratos) && dbItem.historico_contratos.length > 0) {
    // Procura o registro ativo ou mais recente
    const contratos = dbItem.historico_contratos;
    const ativoOuUltimo =
      contratos.find((c) => String(c.status).toLowerCase() === "ativo") ||
      contratos[contratos.length - 1];

    const attrs = ativoOuUltimo?.registroOriginal?.attributes || {};
    cargo = attrs.nomefuncao || attrs.nomecargo || null;
    pixPadrao = attrs.chavePix || null;
    banco = attrs.nomeDoBanco || (attrs.banco ? String(attrs.banco) : null);
    agencia = attrs.agencia || null;
    conta = attrs.conta || null;
    salarioBase = attrs.salarioBase ? Number(attrs.salarioBase) : null;
    telefone = attrs.telefonecelular || attrs.telefone || null;
    departamento = ativoOuUltimo?.registroOriginal?.relationships?.departamento || null;
  }

  return {
    chaveUnica: dbItem.chave_unica,
    codigo: dbItem.codigo_contrato_vigente,
    nome: dbItem.nome_completo,
    cpf: dbItem.cpf,
    email: dbItem.email,
    status: dbItem.status_atual,
    ativo: Boolean(dbItem.tem_contrato_ativo),
    cargo,
    pixPadrao,
    banco,
    agencia,
    conta,
    salarioBase,
    departamento,
    telefone,
    primeiraAdmissao: dbItem.primeira_admissao,
    admissaoAtual: dbItem.admissao_atual,
    totalContratos: dbItem.total_contratos,
    atualizadoEm: dbItem.atualizado_em,
  };
}

export async function salvarFuncionariosNoBanco(supabase, listaUnificada, apenasAtivosFlag = true) {
  if (!Array.isArray(listaUnificada) || listaUnificada.length === 0) {
    return { ok: true, salvos: 0 };
  }

  let itensParaSalvar = listaUnificada;
  if (apenasAtivosFlag) {
    itensParaSalvar = listaUnificada.filter((item) => {
      if (item._unificado) {
        return Boolean(item._unificado.temContratoAtivo);
      }
      return item.tem_contrato_ativo === true || item.status_atual === "Ativo";
    });
  }

  if (itensParaSalvar.length === 0) {
    return { ok: true, salvos: 0, mensagem: "Nenhum colaborador localizado para salvar com os filtros aplicados." };
  }

  const itensFormatados = itensParaSalvar.map(formatarItemParaPersistencia);

  // 1. Salva no banco JSON local (armazenamento persistente local imediato)
  const bancoAtual = lerBancoLocal();
  const mapaExistentes = new Map(bancoAtual.map((i) => [i.chave_unica, i]));

  itensFormatados.forEach((item) => {
    mapaExistentes.set(item.chave_unica, item);
  });

  const bancoAtualizado = Array.from(mapaExistentes.values());
  salvarBancoLocal(bancoAtualizado);

  // 2. Se Supabase estiver conectado, sincroniza com a tabela no Supabase em lotes de 100
  let supabaseStatus = { conectado: Boolean(supabase), sucesso: false, erro: null };

  if (supabase) {
    try {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < itensFormatados.length; i += CHUNK_SIZE) {
        const chunk = itensFormatados.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from("intranet_alterdata_funcionarios")
          .upsert(chunk, { onConflict: "chave_unica", ignoreDuplicates: false });

        if (error) {
          console.warn(`[alterdataStore/supabase] Erro no chunk ${i}:`, error.message);
          supabaseStatus.erro = error.message;
          break;
        }
      }

      if (!supabaseStatus.erro) {
        supabaseStatus.sucesso = true;
      }
    } catch (err) {
      console.warn("[alterdataStore/supabase] Erro ao sincronizar Supabase:", err.message);
      supabaseStatus.erro = err.message;
    }
  }

  return {
    ok: true,
    salvos: itensFormatados.length,
    totalBancoLocal: bancoAtualizado.length,
    supabase: supabaseStatus,
  };
}

export async function listarFuncionariosDoBanco(supabase) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_alterdata_funcionarios")
        .select("*")
        .order("nome_completo", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback para o banco local JSON
    }
  }

  const localItems = lerBancoLocal();
  localItems.sort((a, b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));
  return localItems;
}

export async function obterFuncionarioPorEmail(supabase, email) {
  if (!email || typeof email !== "string") return null;
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return null;

  // 1. Consulta no Supabase primeiro
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_alterdata_funcionarios")
        .select("*")
        .ilike("email", emailNorm)
        .order("tem_contrato_ativo", { ascending: false })
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch (err) {
      console.warn("[alterdataStore] Falha consulta Supabase por email:", err.message);
    }
  }

  // 2. Fallback no banco local JSON
  const localItems = lerBancoLocal();
  const encontrados = localItems.filter(
    (item) => String(item.email || "").trim().toLowerCase() === emailNorm
  );

  if (encontrados.length === 0) return null;

  // Prioriza o contrato que estiver ativo
  const ativo = encontrados.find((i) => i.tem_contrato_ativo || i.status_atual === "Ativo");
  return ativo || encontrados[0];
}

export async function obterFuncionarioPorCodigo(supabase, codigo) {
  if (!codigo) return null;
  const codStr = String(codigo).trim();
  if (!codStr) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_alterdata_funcionarios")
        .select("*")
        .eq("codigo_contrato_vigente", codStr)
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch (err) {
      console.warn("[alterdataStore] Falha consulta Supabase por codigo:", err.message);
    }
  }

  const localItems = lerBancoLocal();
  return (
    localItems.find((i) => String(i.codigo_contrato_vigente || "").trim() === codStr) ||
    localItems.find((i) => String(i.codigos_resumo || "").includes(`#${codStr}`)) ||
    null
  );
}

export async function obterFuncionarioPorCpf(supabase, cpf) {
  if (!cpf) return null;
  const cpfLimpo = String(cpf).replace(/\D/g, "");
  if (!cpfLimpo) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_alterdata_funcionarios")
        .select("*")
        .or(`cpf.eq.${cpfLimpo},chave_unica.eq.CPF:${cpfLimpo}`)
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch (err) {
      console.warn("[alterdataStore] Falha consulta Supabase por CPF:", err.message);
    }
  }

  const localItems = lerBancoLocal();
  return (
    localItems.find((i) => String(i.cpf || "").replace(/\D/g, "") === cpfLimpo) ||
    localItems.find((i) => String(i.chave_unica || "").includes(cpfLimpo)) ||
    null
  );
}

/**
 * Sincronização direta do backend com a API do Alterdata (eContador / DP).
 * Faz a paginação completa, unifica os contratos e salva no Supabase e banco local.
 */
export async function sincronizarAlterdataDireto(
  supabase,
  {
    token,
    host = "https://dp.pack.alterdata.com.br",
    empresaId = "",
    apenasAtivos = true,
  } = {}
) {
  const apiToken = token || process.env.ALTERDATA_TOKEN;
  if (!apiToken || typeof apiToken !== "string" || !apiToken.trim()) {
    throw new Error("Token de autorização do Alterdata não informado (configure ALTERDATA_TOKEN ou envie no corpo).");
  }

  const limit = 100;
  let offset = 0;
  let todosRegistros = [];
  let temMaisPaginas = true;
  let paginaAtual = 1;

  console.log(`[alterdataSync] Iniciando download completo do Alterdata em ${host}...`);

  while (temMaisPaginas) {
    const params = new URLSearchParams();
    if (empresaId && String(empresaId).trim()) {
      params.append("filter[empresaId]", String(empresaId).trim());
    }
    params.append("page[limit]", String(limit));
    params.append("page[offset]", String(offset));

    const fullUrl = `${host.replace(/\/+$/, "")}/api/v1/funcionarios?${params.toString()}`;
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        Accept: "application/vnd.api+json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Erro na página ${paginaAtual} do Alterdata: HTTP ${res.status} - ${errText.slice(0, 200)}`);
    }

    const json = await res.json();
    const itensPagina = Array.isArray(json?.data) ? json.data : [];

    if (itensPagina.length === 0) {
      temMaisPaginas = false;
    } else {
      todosRegistros.push(...itensPagina);
      offset += limit;
      paginaAtual += 1;
      if (itensPagina.length < limit) {
        temMaisPaginas = false;
      }
    }
  }

  console.log(`[alterdataSync] Concluído download: ${todosRegistros.length} contratos baixados. Unificando...`);
  const unificados = unificarFuncionariosAlterdata(todosRegistros);
  console.log(`[alterdataSync] Unificados em ${unificados.length} colaboradores distintos. Salvando no Supabase...`);

  const resultado = await salvarFuncionariosNoBanco(supabase, unificados, apenasAtivos !== false);
  return {
    ok: true,
    totalContratosBaixados: todosRegistros.length,
    totalColaboradoresUnificados: unificados.length,
    ...resultado,
  };
}
