import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  listarFuncionariosDoBanco,
  salvarFuncionariosNoBanco,
  extrairResumoColaborador,
} from "./alterdataStore.js";
import { unificarFuncionariosAlterdata } from "./alterdataDeduplication.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DATA_DIR = path.join(__dirname, "data");
const LOCAL_MUDANCAS_FILE = path.join(LOCAL_DATA_DIR, "alterdata_mudancas.json");

function garantirDiretorioLocal() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

export function lerMudancasLocais() {
  garantirDiretorioLocal();
  if (!fs.existsSync(LOCAL_MUDANCAS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(LOCAL_MUDANCAS_FILE, "utf-8");
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error("[alterdataMonitor] Erro ao ler mudancas locais:", err.message);
    return [];
  }
}

export function salvarMudancasLocais(itens) {
  garantirDiretorioLocal();
  try {
    fs.writeFileSync(LOCAL_MUDANCAS_FILE, JSON.stringify(itens, null, 2), "utf-8");
  } catch (err) {
    console.error("[alterdataMonitor] Erro ao salvar mudancas locais:", err.message);
  }
}

// Estado em memória do monitor
const estadoMonitor = {
  ativo: true,
  ultimaVerificacao: null,
  proximaVerificacao: null,
  emExecucao: false,
  ultimoResultado: null,
  historicoExecucoes: [],
};

export function calcularProximaVerificacao() {
  const agora = new Date();
  const hoje = new Date(agora);

  // Horários de verificação (08:00 e 14:00 no horário local)
  const hManha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 8, 0, 0);
  const hTarde = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 14, 0, 0);

  let proxima = null;
  if (agora < hManha) {
    proxima = hManha;
  } else if (agora < hTarde) {
    proxima = hTarde;
  } else {
    // Amanhã às 08:00
    proxima = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1, 8, 0, 0);
  }

  estadoMonitor.proximaVerificacao = proxima.toISOString();
  return proxima;
}

export function obterStatusMonitor() {
  if (!estadoMonitor.proximaVerificacao) {
    calcularProximaVerificacao();
  }
  return {
    ativo: estadoMonitor.ativo,
    emExecucao: estadoMonitor.emExecucao,
    ultimaVerificacao: estadoMonitor.ultimaVerificacao,
    proximaVerificacao: estadoMonitor.proximaVerificacao,
    ultimoResultado: estadoMonitor.ultimoResultado,
    horariosAgendados: ["08:00", "14:00"],
  };
}

/**
 * Registra mudanças no banco Supabase e no arquivo local.
 */
export async function registrarMudancas(supabase, mudancas) {
  if (!Array.isArray(mudancas) || mudancas.length === 0) return;

  // 1. Grava no arquivo local
  const historicoLocal = lerMudancasLocais();
  const atualizado = [...mudancas, ...historicoLocal].slice(0, 1000); // mantém últimos 1000
  salvarMudancasLocais(atualizado);

  // 2. Se Supabase disponível, tenta inserir na tabela intranet_alterdata_mudancas
  if (supabase) {
    try {
      const { error } = await supabase.from("intranet_alterdata_mudancas").insert(mudancas);
      if (error) {
        console.warn("[alterdataMonitor] Aviso ao gravar mudancas no Supabase (mantido local):", error.message);
      }
    } catch (err) {
      console.warn("[alterdataMonitor] Falha ao inserir mudancas no Supabase:", err.message);
    }
  }
}

/**
 * Lista histórico de mudanças detectadas (admissões e demissões).
 */
export async function listarHistoricoMudancas(supabase, limite = 100) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("intranet_alterdata_mudancas")
        .select("*")
        .order("detectado_em", { ascending: false })
        .limit(limite);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      /* fallback para arquivo local */
    }
  }

  return lerMudancasLocais().slice(0, limite);
}

/**
 * Compara a base atual do Supabase com o novo snapshot do Alterdata e detecta:
 * - Admissões: colaboradores novos ou que foram reativados
 * - Demissões: colaboradores que eram ativos e agora estão demitidos/inativos
 */
export function compararSnapshotsAlterdata(colaboradoresAtuais, colaboradoresNovos) {
  const mapaAtuais = new Map(colaboradoresAtuais.map((c) => [c.chave_unica, c]));
  const mapaNovos = new Map(colaboradoresNovos.map((c) => [c.chave_unica, c]));

  const agoraIso = new Date().toISOString();
  const mudancas = [];

  // 1. Detecta ADMISSÕES (presentes no novo snapshot como ativos que não eram ativos antes)
  for (const novo of colaboradoresNovos) {
    const atual = mapaAtuais.get(novo.chave_unica);
    const novoAtivo = Boolean(novo.tem_contrato_ativo || novo.status_atual === "Ativo");

    if (novoAtivo) {
      const atualEraAtivo = atual && Boolean(atual.tem_contrato_ativo || atual.status_atual === "Ativo");
      if (!atual || !atualEraAtivo) {
        const resumo = extrairResumoColaborador(novo);
        mudancas.push({
          tipo: "admissao",
          funcionario_chave: novo.chave_unica,
          funcionario_nome: novo.nome_completo,
          funcionario_email: novo.email,
          funcionario_cpf: novo.cpf,
          funcionario_matricula: novo.codigo_contrato_vigente,
          cargo: resumo?.cargo || null,
          data_evento: novo.admissao_atual || novo.primeira_admissao || agoraIso.split("T")[0],
          detalhes: {
            novoRegistro: true,
            codigoVigente: novo.codigo_contrato_vigente,
            cargo: resumo?.cargo,
            departamento: resumo?.departamento,
            email: novo.email,
          },
          detectado_em: agoraIso,
        });
      }
    }
  }

  // 2. Detecta DEMISSÕES (eram ativos no Supabase e agora estão inativos ou não aparecem como ativos)
  for (const atual of colaboradoresAtuais) {
    const atualEraAtivo = Boolean(atual.tem_contrato_ativo || atual.status_atual === "Ativo");
    if (atualEraAtivo) {
      const novo = mapaNovos.get(atual.chave_unica);
      const novoAindaAtivo = novo && Boolean(novo.tem_contrato_ativo || novo.status_atual === "Ativo");

      if (!novoAindaAtivo) {
        const resumo = extrairResumoColaborador(atual);
        mudancas.push({
          tipo: "demissao",
          funcionario_chave: atual.chave_unica,
          funcionario_nome: atual.nome_completo,
          funcionario_email: atual.email,
          funcionario_cpf: atual.cpf,
          funcionario_matricula: atual.codigo_contrato_vigente,
          cargo: resumo?.cargo || null,
          data_evento: novo?.demissao_mais_recente || agoraIso.split("T")[0],
          detalhes: {
            desligado: true,
            ultimoCodigo: atual.codigo_contrato_vigente,
            cargo: resumo?.cargo,
            email: atual.email,
            statusAnterior: atual.status_atual,
            statusNovo: novo ? novo.status_atual : "Removido do DP",
          },
          detectado_em: agoraIso,
        });
      }
    }
  }

  return mudancas;
}

/**
 * Consulta a API do Alterdata e baixa todos os registros de contratos.
 */
async function baixarSnapshotApiAlterdata(token, host = "https://dp.pack.alterdata.com.br", empresaId = "") {
  const limit = 100;
  let offset = 0;
  let todosRegistros = [];
  let temMaisPaginas = true;

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
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/vnd.api+json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Erro na API do Alterdata (offset ${offset}): HTTP ${res.status} - ${errText.slice(0, 150)}`);
    }

    const json = await res.json();
    const itensPagina = Array.isArray(json?.data) ? json.data : [];

    if (itensPagina.length === 0) {
      temMaisPaginas = false;
    } else {
      todosRegistros.push(...itensPagina);
      offset += limit;
      if (itensPagina.length < limit) {
        temMaisPaginas = false;
      }
    }
  }

  return unificarFuncionariosAlterdata(todosRegistros);
}

/**
 * Executa a rotina completa de verificação, comparação e sincronização no Supabase.
 */
export async function executarVerificacaoESincronizacao(supabase, options = {}) {
  if (estadoMonitor.emExecucao) {
    throw new Error("Uma verificação já está em andamento no momento.");
  }

  estadoMonitor.emExecucao = true;
  const inicio = Date.now();

  try {
    const token = options.token || process.env.ALTERDATA_TOKEN;
    if (!token || typeof token !== "string" || !token.trim()) {
      throw new Error(
        "Token de autorização do Alterdata não informado (configure ALTERDATA_TOKEN no servidor ou informe na verificação)."
      );
    }

    console.log("[alterdataMonitor] Iniciando verificação programada do Alterdata...");

    // 1. Carrega colaboradores atuais do banco
    const colaboradoresAtuais = await listarFuncionariosDoBanco(supabase);
    console.log(`[alterdataMonitor] Registros atuais no Supabase: ${colaboradoresAtuais.length}`);

    // 2. Consulta o Alterdata e unifica
    const colaboradoresNovos = await baixarSnapshotApiAlterdata(
      token,
      options.host || "https://dp.pack.alterdata.com.br",
      options.empresaId || ""
    );
    console.log(`[alterdataMonitor] Registros obtidos no Alterdata: ${colaboradoresNovos.length}`);

    // 3. Compara os snapshots
    const mudancasDetectadas = compararSnapshotsAlterdata(colaboradoresAtuais, colaboradoresNovos);
    console.log(`[alterdataMonitor] Mudanças detectadas: ${mudancasDetectadas.length}`);

    const admissoes = mudancasDetectadas.filter((m) => m.tipo === "admissao");
    const demissoes = mudancasDetectadas.filter((m) => m.tipo === "demissao");

    console.log(`   - Novas admissões: ${admissoes.length}`);
    console.log(`   - Demissões detectadas: ${demissoes.length}`);

    // 4. Salva a nova base consolidada no Supabase (atualiza todos os registros e status)
    await salvarFuncionariosNoBanco(supabase, colaboradoresNovos, false);

    // 5. Atualiza o módulo Advance-CCI (ccipay_funcionarios)
    if (supabase) {
      try {
        // Inativa os demitidos no Advance-CCI
        for (const dem of demissoes) {
          if (dem.funcionario_email) {
            await supabase
              .from("ccipay_funcionarios")
              .update({ ativo: false, updated_at: new Date().toISOString() })
              .eq("email", dem.funcionario_email.trim().toLowerCase());
          }
        }

        // Ativa/insere os admitidos no Advance-CCI
        const now = new Date().toISOString();
        for (const adm of admissoes) {
          if (adm.funcionario_email) {
            await supabase
              .from("ccipay_funcionarios")
              .upsert(
                {
                  email: adm.funcionario_email.trim().toLowerCase(),
                  nome: adm.funcionario_nome,
                  alterdata_codigo: adm.funcionario_matricula,
                  limite_adiantamento: 500.0,
                  limite_bonificacao: null,
                  ativo: true,
                  updated_at: now,
                },
                { onConflict: "email" }
              );
          }
        }
      } catch (errCcipay) {
        console.warn("[alterdataMonitor] Aviso ao atualizar Advance-CCI:", errCcipay.message);
      }
    }

    // 6. Registra as mudanças na tabela de auditoria
    if (mudancasDetectadas.length > 0) {
      await registrarMudancas(supabase, mudancasDetectadas);
    }

    const tempoMs = Date.now() - inicio;
    const resultado = {
      ok: true,
      dataHora: new Date().toISOString(),
      duracaoMs: tempoMs,
      totalContratosAlterdata: colaboradoresNovos.length,
      mudancasTotal: mudancasDetectadas.length,
      admissoesCount: admissoes.length,
      demissoesCount: demissoes.length,
      admissoes,
      demissoes,
    };

    estadoMonitor.ultimaVerificacao = resultado.dataHora;
    estadoMonitor.ultimoResultado = resultado;
    calcularProximaVerificacao();

    console.log(`[alterdataMonitor] Verificação finalizada em ${tempoMs}ms com sucesso.`);
    return resultado;
  } finally {
    estadoMonitor.emExecucao = false;
  }
}

/**
 * Inicia o temporizador contínuo para verificar às 08:00 e 14:00 nos dias úteis.
 */
export function iniciarAgendadorAlterdata(getSupabaseClient) {
  calcularProximaVerificacao();
  console.log(
    `[alterdataMonitor] Agendador ativo. Próxima verificação calculada para: ${estadoMonitor.proximaVerificacao}`
  );

  // Intervalo de verificação a cada 60 segundos para checar se atingiu o horário
  const INTERVALO_CHECAGEM_MS = 60 * 1000;

  setInterval(async () => {
    try {
      const agora = new Date();
      // Não roda nos fins de semana (0 = Domingo, 6 = Sábado)
      const diaSemana = agora.getDay();
      if (diaSemana === 0 || diaSemana === 6) return;

      const horas = agora.getHours();
      const minutos = agora.getMinutes();

      // Checa exatamente na janela das 08:00 e 14:00 (no primeiro minuto)
      const ehHorarioManha = horas === 8 && minutos === 0;
      const ehHorarioTarde = horas === 14 && minutos === 0;

      if ((ehHorarioManha || ehHorarioTarde) && !estadoMonitor.emExecucao) {
        console.log(`[alterdataMonitor] ⏰ Disparando verificação agendada (${horas}:00)...`);
        const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
        await executarVerificacaoESincronizacao(supabase);
      }
    } catch (err) {
      console.error("[alterdataMonitor] Erro na execução agendada:", err.message);
    }
  }, INTERVALO_CHECAGEM_MS);
}
