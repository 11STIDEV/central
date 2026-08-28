import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DATA_DIR = path.join(__dirname, "data");
const LOCAL_JSON_FILE = path.join(LOCAL_DATA_DIR, "alterdata_funcionarios.json");

function garantirDiretorioLocal() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

function lerBancoLocal() {
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

function salvarBancoLocal(itens) {
  garantirDiretorioLocal();
  try {
    fs.writeFileSync(LOCAL_JSON_FILE, JSON.stringify(itens, null, 2), "utf-8");
  } catch (err) {
    console.error("[alterdataStore] Erro ao salvar JSON local:", err.message);
  }
}

export function formatarItemParaPersistencia(item) {
  const attrs = item.attributes || {};
  const unificado = item._unificado || {};

  const cpf = attrs.cpf || attrs.cpfcnpj || attrs.cpf_cnpj || null;
  const nomeCompleto = attrs.nome || attrs.nomecargo || attrs.nomeFantasia || "Sem Nome";
  const statusAtual = unificado.temContratoAtivo ? "Ativo" : "Inativo";
  const codigoVigente = attrs.codigo || attrs.codigoEmpresa || item.id || null;
  const primeiraAdmissao = unificado.primeiraAdmissao || attrs.dataadmissao || attrs.dataAdmissao || null;
  const admissaoAtual = unificado.admissaoAtual || attrs.dataadmissao || attrs.dataAdmissao || null;
  const demissaoMaisRecente = unificado.demissaoMaisRecente || attrs.datademissao || attrs.dataDemissao || null;
  const totalContratos = unificado.totalContratos || 1;
  const historicoContratos = unificado.historicoContratos || [];
  const codigosResumo = unificado.codigosResumo || "";
  const chaveUnica = unificado.chaveUnica || `ID:${item.id}`;

  const email =
    unificado.email ||
    attrs.email ||
    attrs.emailComercial ||
    attrs.emailPessoal ||
    attrs.email_corporativo ||
    attrs.emailcorporativo ||
    attrs.email_pessoal ||
    null;

  return {
    chave_unica: chaveUnica,
    id_alterdata_principal: String(item.id || "0"),
    cpf: cpf ? String(cpf) : null,
    nome_completo: String(nomeCompleto),
    email: email ? String(email).trim().toLowerCase() : null,
    status_atual: statusAtual,
    tem_contrato_ativo: Boolean(unificado.temContratoAtivo),
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

  // 2. Se Supabase estiver conectado, tenta sincronizar com a tabela no Supabase
  let supabaseStatus = { conectado: Boolean(supabase), sucesso: false, erro: null };

  if (supabase) {
    try {
      const { error } = await supabase
        .from("intranet_alterdata_funcionarios")
        .upsert(itensFormatados, { onConflict: "chave_unica", ignoreDuplicates: false });

      if (error) {
        console.warn("[alterdataStore/supabase] Aviso no upsert (mantido no banco local):", error.message);
        supabaseStatus.erro = error.message;
      } else {
        supabaseStatus.sucesso = true;
      }
    } catch (err) {
      console.warn("[alterdataStore/supabase] Erro ao sincronizar Supabase (mantido local):", err.message);
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
  // Tenta ler do Supabase primeiro se disponível
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

  // Fallback: Retorna do arquivo JSON local
  const localItems = lerBancoLocal();
  localItems.sort((a, b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));
  return localItems;
}
