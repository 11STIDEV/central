/**
 * Integração com API Alterdata ePlugin — Inclusão de valores na Folha de Pagamento
 * Endpoint oficial: POST /api/v1/movimentos
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HOST = "https://dp.pack.alterdata.com.br";

export async function enviarMovimentoAlterdata({
  token,
  host = DEFAULT_HOST,
  funcionarioId,
  empresaId = "1",
  tipoMovimentoId = "4", // 4 = Adiantamento, 1 = Folha
  eventoId = "2",
  valor,
  inicio,
  fim,
  comentario = "Adiantamento Advance-CCI",
}) {
  if (!token) {
    throw new Error("Token do Alterdata (eContador / ePlugin) não informado.");
  }
  if (!funcionarioId) {
    throw new Error("ID do funcionário no Alterdata é obrigatório.");
  }
  if (!empresaId) {
    throw new Error("ID da empresa no Alterdata é obrigatório.");
  }
  if (!valor || Number(valor) <= 0) {
    throw new Error("Valor do movimento deve ser maior que zero.");
  }
  if (!inicio || !fim) {
    throw new Error("Datas de início e fim do período são obrigatórias.");
  }

  // Formata o valor com 2 casas decimais
  const valorFormatado = Number(valor).toFixed(2);

  // Garante formato ISO com timezone se for apenas data YYYY-MM-DD
  const inicioIso = inicio.includes("T") ? inicio : `${inicio}T03:00:00Z`;
  const fimIso = fim.includes("T") ? fim : `${fim}T03:00:00Z`;

  const payload = {
    data: {
      type: "movimentos",
      attributes: {
        valor: String(valorFormatado),
        inicio: inicioIso,
        fim: fimIso,
        created: new Date().toISOString(),
        horaquantidade: null,
        comentario: comentario || null,
      },
      relationships: {
        funcionario: {
          data: {
            id: String(funcionarioId),
            type: "funcionarios",
          },
        },
        empresa: {
          data: {
            id: String(empresaId),
            type: "empresas",
          },
        },
        tipomovimento: {
          data: {
            id: String(tipoMovimentoId),
            type: "tipos-movimento",
          },
        },
        evento: {
          data: {
            id: String(eventoId),
            type: "eventos",
          },
        },
      },
    },
  };

  const url = `${host.replace(/\/+$/, "")}/api/v1/movimentos`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get("content-type") || "";
  let data;
  if (contentType.includes("json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }
  }

  if (!res.ok) {
    const errorDetails = data?.errors?.[0]?.detail || data?.message || res.statusText;
    const err = new Error(`Alterdata HTTP ${res.status}: ${errorDetails}`);
    err.status = res.status;
    err.details = data;
    throw err;
  }

  return { ok: true, status: res.status, data, payloadEnviado: payload };
}

export async function enviarMovimentoFolhaParaAlterdata({
  supabase,
  movimento,
  tokenParam,
  ctx,
  empresaIdParam,
  tipoMovimentoIdParam,
  eventoIdParam,
}) {
  const token = tokenParam || process.env.ALTERDATA_TOKEN;
  if (!token) {
    const errObj = {
      sucesso: false,
      erro: "Token do Alterdata não configurado no .env nem informado na requisição.",
      alterdataMeta: {
        status: "erro",
        mensagem: "Token do Alterdata não configurado no .env nem informado na requisição.",
        tentadoEm: new Date().toISOString(),
      },
    };
    if (supabase && movimento?.id) {
      await supabase
        .from("ccipay_movimentos")
        .update({
          metadata: {
            ...(movimento.metadata || {}),
            alterdata: errObj.alterdataMeta,
            alterdataLancado: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", movimento.id);
    }
    return errObj;
  }

  // 1. Resolve ID do funcionário no Alterdata
  let funcionarioId = null;
  const funcEmail = movimento.funcionario_email || movimento.funcionarioEmail;
  if (supabase && funcEmail) {
    const { data: alt } = await supabase
      .from("intranet_alterdata_funcionarios")
      .select("id_alterdata_principal, historico_contratos")
      .ilike("email", String(funcEmail).trim().toLowerCase())
      .maybeSingle();

    if (alt) {
      funcionarioId = alt.id_alterdata_principal;
      if (Array.isArray(alt.historico_contratos)) {
        const ativo = alt.historico_contratos.find((c) => c.status === "Ativo");
        if (ativo?.id) funcionarioId = ativo.id;
      }
    }
  }

  if (!funcionarioId) {
    const errObj = {
      sucesso: false,
      erro: `Funcionário (${funcEmail}) não possui cadastro correspondente na base do Alterdata.`,
      alterdataMeta: {
        status: "erro",
        mensagem: `Funcionário (${funcEmail}) não possui cadastro no Alterdata.`,
        tentadoEm: new Date().toISOString(),
      },
    };
    if (supabase && movimento?.id) {
      await supabase
        .from("ccipay_movimentos")
        .update({
          metadata: {
            ...(movimento.metadata || {}),
            alterdata: errObj.alterdataMeta,
            alterdataLancado: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", movimento.id);
    }
    return errObj;
  }

  // 2. Calcula período da competência (ex: "2026-09" -> 2026-09-01 até 2026-09-30)
  const comp = movimento.competencia || new Date().toISOString().slice(0, 7);
  const [anoStr, mesStr] = comp.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1));
  const ultimoDia = new Date(Date.UTC(ano, mes, 0));
  const inicio = primeiroDia.toISOString().split("T")[0];
  const fim = ultimoDia.toISOString().split("T")[0];

  let empresaId = empresaIdParam;
  if (!empresaId && funcionarioId) {
    try {
      const resEmp = await fetch(`https://dp.pack.alterdata.com.br/api/v1/funcionarios/${funcionarioId}/empresa`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: "application/vnd.api+json",
        },
      });
      if (resEmp.ok) {
        const dataEmp = await resEmp.json();
        if (dataEmp?.data?.id) {
          empresaId = String(dataEmp.data.id);
        }
      }
    } catch (eEmp) {
      console.warn("Falha ao obter empresa do funcionário no Alterdata:", eEmp?.message);
    }
  }
  if (!empresaId) {
    empresaId = process.env.ALTERDATA_EMPRESA_ID || "6";
  }

  const tipoMovimentoId = tipoMovimentoIdParam || process.env.ALTERDATA_TIPO_MOVIMENTO_ID || "4"; // 4 = Adiantamento
  const eventoId = eventoIdParam || process.env.ALTERDATA_EVENTO_VALE_ID || "1"; // 1 = Vale (adiantamento)

  try {
    const resAlterdata = await enviarMovimentoAlterdata({
      token,
      funcionarioId,
      empresaId,
      tipoMovimentoId,
      eventoId,
      valor: movimento.valor,
      inicio,
      fim,
      comentario: `Vale Advance-CCI — ${comp}`,
    });

    const alterdataMeta = {
      status: "sucesso",
      statusCode: resAlterdata.status,
      movimentoId: resAlterdata.data?.data?.id || null,
      enviadoEm: new Date().toISOString(),
      enviadoPor: ctx?.email || "sistema",
      resposta: resAlterdata.data,
      payloadEnviado: resAlterdata.payloadEnviado,
    };

    if (supabase && movimento.id) {
      await supabase
        .from("ccipay_movimentos")
        .update({
          status: "descontado_folha",
          metadata: {
            ...(movimento.metadata || {}),
            alterdata: alterdataMeta,
            alterdataLancado: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", movimento.id);
    }

    return {
      sucesso: true,
      data: resAlterdata.data,
      alterdataMeta,
    };
  } catch (err) {
    const alterdataMeta = {
      status: "erro",
      statusCode: err.status || 500,
      mensagem: err.message,
      detalhes: err.details || null,
      tentadoEm: new Date().toISOString(),
      tentadoPor: ctx?.email || "sistema",
    };

    if (supabase && movimento.id) {
      await supabase
        .from("ccipay_movimentos")
        .update({
          metadata: {
            ...(movimento.metadata || {}),
            alterdata: alterdataMeta,
            alterdataLancado: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", movimento.id);
    }

    return {
      sucesso: false,
      erro: err.message,
      alterdataMeta,
    };
  }
}

export function registerAlterdataMovimentosRoutes(app, helpers) {
  const { getSupabaseAdmin, resolverContextoFromRequest, respostaErroIdToken } = helpers;

  app.post("/api/alterdata/movimentos", async (req, res) => {
    try {
      let ctx = null;
      try {
        ctx = await resolverContextoFromRequest(req);
      } catch {
        // Se for requisição direta de teste com token no body
      }

      const {
        token: tokenParam,
        funcionarioEmail,
        funcionarioId: funcionarioIdParam,
        empresaId: empresaIdParam,
        tipoMovimentoId = "4",
        eventoId = "1",
        valor,
        inicio: inicioParam,
        fim: fimParam,
        comentario,
        movimentoId,
      } = req.body || {};

      const token = tokenParam || process.env.ALTERDATA_TOKEN;
      if (!token) {
        return res.status(400).json({
          error: "Token do Alterdata não configurado no .env nem informado na requisição.",
        });
      }

      const supabase = getSupabaseAdmin();

      // Se passou movimentoId, usa o fluxo centralizado
      if (movimentoId && supabase) {
        const { data: mov } = await supabase
          .from("ccipay_movimentos")
          .select("*")
          .eq("id", movimentoId)
          .maybeSingle();

        if (mov) {
          const resultado = await enviarMovimentoFolhaParaAlterdata({
            supabase,
            movimento: mov,
            tokenParam: token,
            ctx,
            empresaIdParam: empresaIdParam,
            tipoMovimentoIdParam: tipoMovimentoId,
            eventoIdParam: eventoId,
          });

          if (!resultado.sucesso) {
            return res.status(400).json({
              error: resultado.erro,
              alterdata: resultado.alterdataMeta,
            });
          }

          return res.json({
            ok: true,
            ...resultado,
          });
        }
      }

      let funcionarioId = funcionarioIdParam;

      // Se passou e-mail em vez de ID, resolve pelo Supabase
      if (!funcionarioId && funcionarioEmail && supabase) {
        const { data: alt } = await supabase
          .from("intranet_alterdata_funcionarios")
          .select("id_alterdata_principal, historico_contratos")
          .ilike("email", String(funcionarioEmail).trim().toLowerCase())
          .maybeSingle();

        if (alt) {
          funcionarioId = alt.id_alterdata_principal;
          if (Array.isArray(alt.historico_contratos)) {
            const ativo = alt.historico_contratos.find((c) => c.status === "Ativo");
            if (ativo?.id) funcionarioId = ativo.id;
          }
        }
      }

      if (!funcionarioId) {
        return res.status(400).json({
          error: "Não foi possível identificar o ID do funcionário no Alterdata. Forneça funcionarioId ou funcionarioEmail cadastrado.",
        });
      }

      // Calcula período padrão (mês atual) se não informado
      let inicio = inicioParam;
      let fim = fimParam;
      if (!inicio || !fim) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        inicio = firstDay.toISOString().split("T")[0];
        fim = lastDay.toISOString().split("T")[0];
      }

      let empresaIdResolvida = empresaIdParam;
      if (!empresaIdResolvida && funcionarioId) {
        try {
          const resEmp = await fetch(`https://dp.pack.alterdata.com.br/api/v1/funcionarios/${funcionarioId}/empresa`, {
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              Accept: "application/vnd.api+json",
            },
          });
          if (resEmp.ok) {
            const dataEmp = await resEmp.json();
            if (dataEmp?.data?.id) empresaIdResolvida = String(dataEmp.data.id);
          }
        } catch {
          // fallback
        }
      }
      if (!empresaIdResolvida) empresaIdResolvida = process.env.ALTERDATA_EMPRESA_ID || "6";

      const resultado = await enviarMovimentoAlterdata({
        token,
        funcionarioId,
        empresaId: empresaIdResolvida,
        tipoMovimentoId,
        eventoId,
        valor,
        inicio,
        fim,
        comentario: comentario || (ctx ? `Lançado por ${ctx.nome || ctx.email}` : "Advance-CCI"),
      });

      return res.json({
        ok: true,
        ...resultado,
      });
    } catch (e) {
      console.error("Erro /api/alterdata/movimentos:", e);
      return res.status(e.status || 500).json({
        error: e.message,
        details: e.details || null,
      });
    }
  });

  const getStatusHandler = async (req, res) => {
    return res.json({
      ok: true,
      hasEnvToken: Boolean(process.env.ALTERDATA_TOKEN && process.env.ALTERDATA_TOKEN.trim().length > 0),
      empresaId: process.env.ALTERDATA_EMPRESA_ID || "6",
      tipoMovimentoId: process.env.ALTERDATA_TIPO_MOVIMENTO_ID || "4",
      eventoId: process.env.ALTERDATA_EVENTO_VALE_ID || "1",
    });
  };

  app.get("/api/alterdata/status", getStatusHandler);
  app.post("/api/alterdata/status", getStatusHandler);

  app.post("/api/alterdata/config-token", async (req, res) => {
    try {
      const { token } = req.body || {};
      const tokenLimpo = String(token || "").trim();
      if (!tokenLimpo) {
        return res.status(400).json({ error: "Token não pode ser vazio." });
      }

      // Atualiza variável em memória
      process.env.ALTERDATA_TOKEN = tokenLimpo;

      // Salva no server/.env se o arquivo existir
      try {
        const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env");
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, "utf-8");
          if (envContent.includes("ALTERDATA_TOKEN=")) {
            envContent = envContent.replace(/^ALTERDATA_TOKEN=.*$/m, `ALTERDATA_TOKEN=${tokenLimpo}`);
          } else {
            envContent += `\nALTERDATA_TOKEN=${tokenLimpo}\n`;
          }
          fs.writeFileSync(envPath, envContent, "utf-8");
        }
      } catch (errSave) {
        console.warn("Não foi possível salvar o token no arquivo server/.env:", errSave.message);
      }

      return res.json({ ok: true, hasEnvToken: true, message: "Token configurado com sucesso!" });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}
