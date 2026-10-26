import {
  isCcipayAdmin,
  isCcipayDp,
  isCcipayLancador,
  isCcipayModuloLiberado,
  isOperadorLoja,
  isOperadorParceiro,
  lojasDoLogin,
  lojasDoUsuario,
} from "./ccipayAccess.js";
import {
  registrarOuAtualizarFuncionario,
  obterFuncionario,
  buscarColaboradorAlterdataPorEmail,
  sincronizarFuncionarioComAlterdata,
  listarFuncionarios,
  atualizarFuncionarioAdmin,
  sincronizarFuncionariosAdvanceComAlterdata,
  somarAdiantamentosCompetencia,
  saldoBonificacao,
  saldoConvenioDisponivel,
  criarMovimento,
  listarMovimentos,
  obterMovimento,
  atualizarMovimentoStatus,
  montarResumoFuncionario,
  listarLojas,
  criarLoja,
  atualizarLoja,
  excluirLoja,
  listarUsuariosLoja,
  vincularUsuarioLoja,
  desvincularUsuarioLoja,
  listarLancadores,
  salvarLancador,
  removerLancador,
  listarCatalogo,
  salvarCatalogoItem,
  criarPedido,
  listarPedidos,
  obterPedidoCompleto,
  atualizarPedidoStatus,
  relatorioDpMovimentos,
  relatorioResumoPorFuncionario,
  relatorioLojaPedidos,
  validarCreditoBonificacao,
  validarDebitoBonificacao,
  CcipayBonificacaoError,
  criarVendaQr,
  obterVendaPorToken,
  obterVendaPorId,
  listarVendasQr,
  resumoVendasParceiro,
  atualizarVendaQr,
} from "./ccipayStore.js";
import {
  listarRepassesLoja,
  registrarRepasseLoja,
  excluirRepasseLoja,
} from "./ccipayRepassesStore.js";
import { randomBytes } from "node:crypto";
import { notificarEmailCcipay } from "./ccipayEmail.js";
import { getParceiroFromRequest } from "./parceiroSessionAuth.js";
import { competenciaAtual } from "./ccipayAccess.js";
import { enviarMovimentoFolhaParaAlterdata } from "./alterdataMovimentos.js";
import { inserirChamado } from "./chamadosStore.js";

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function registerCcipayRoutes(app, helpers) {
  const {
    getSupabaseAdmin,
    mensagemSupabaseNaoConfigurado,
    resolverContextoFromRequest,
    respostaErroIdToken,
  } = helpers;

  async function ctxFromRequest(req) {
    return resolverContextoFromRequest(req);
  }

  function responderErroCcipay(e, res) {
    if (e instanceof CcipayBonificacaoError || e?.status === 400) {
      return res.status(400).json({ error: e.message });
    }
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }

  app.use("/api/ccipay", async (req, res, next) => {
    if (req.path.startsWith("/parceiro")) return next();
    try {
      const parceiro = getParceiroFromRequest(req);
      if (parceiro) return next();
      const ctx = await ctxFromRequest(req);
      if (!isCcipayModuloLiberado(ctx.papeis)) {
        return res.status(403).json({
          error: "Advance-CCI em revisão. Acesso liberado apenas para administradores de papéis.",
        });
      }
      next();
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  async function ctxOrParceiro(req) {
    const parceiro = getParceiroFromRequest(req);
    if (parceiro) return parceiro;
    return ctxFromRequest(req);
  }

  async function podeAcessarLoja(supabase, ctx, lojaId) {
    if (ctx.tipo === "parceiro") {
      return isOperadorParceiro(supabase, ctx.login, lojaId);
    }
    if (isCcipayAdmin(ctx.papeis) || isCcipayDp(ctx.papeis)) return true;
    return isOperadorLoja(supabase, ctx.email, lojaId, ctx.papeis);
  }

  function identificadorCtx(ctx) {
    return ctx.tipo === "parceiro" ? ctx.login : ctx.email;
  }

  function supabaseOr503(res) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });
      return null;
    }
    return supabase;
  }

  async function ensureFuncionario(supabase, ctx) {
    let f = await sincronizarFuncionarioComAlterdata(supabase, ctx.email);
    if (!f) {
      f = await registrarOuAtualizarFuncionario(supabase, {
        email: ctx.email,
        nome: ctx.nome,
      });
    }
    return f;
  }

  // --- Perfil / extrato ---

  app.post("/api/ccipay/me", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      await ensureFuncionario(supabase, ctx);
      const resumo = await montarResumoFuncionario(supabase, ctx.email);
      return res.json({ ok: true, ...resumo });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Erro /api/ccipay/me:", msg);
      return res.status(500).json({ error: msg });
    }
  });

  // --- Adiantamentos ---

  app.post("/api/ccipay/adiantamentos/criar", async (req, res) => {
    try {
      const { idToken, pix, valor, tipoPix } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const func = await ensureFuncionario(supabase, ctx);
      if (!func.ativo) {
        return res.status(403).json({ error: "Seu cadastro Advance-CCI está inativo." });
      }

      const valorNum = Number(valor);
      if (!pix || !String(pix).trim() || Number.isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ error: "Informe Pix válido e valor maior que zero." });
      }

      const comp = competenciaAtual();
      const usado = await somarAdiantamentosCompetencia(supabase, ctx.email, comp);
      const disponivel = Math.max(0, func.limiteAdiantamento - usado);

      const mov = await criarMovimento(supabase, {
        tipo: "adiantamento",
        direcao: "debito",
        valor: valorNum,
        status: "pendente",
        competencia: comp,
        funcionarioEmail: ctx.email,
        funcionarioNome: ctx.nome,
        criadoPor: ctx.email,
        metadata: {
          pix: String(pix).trim(),
          tipoPix: tipoPix ? String(tipoPix).trim() : null,
          limiteDisponivelMomento: disponivel,
        },
      });

      notificarEmailCcipay("adiantamento_criado", { mov, destinatario: ctx.email });

      return res.json({ ok: true, movimento: mov });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Erro /api/ccipay/adiantamentos/criar:", msg);
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ccipay/adiantamentos/listar", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const dp = isCcipayDp(ctx.papeis);
      const movimentos = await listarMovimentos(supabase, {
        tipos: ["adiantamento", "vale"],
        ...(dp ? {} : { funcionarioEmail: ctx.email }),
      });
      return res.json({ ok: true, movimentos });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ccipay/adiantamentos/aprovar", async (req, res) => {
    try {
      const { idToken, movimentoId, acao, justificativa } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayDp(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão para aprovar adiantamentos." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const mov = await obterMovimento(supabase, movimentoId);
      if (!mov) return res.status(404).json({ error: "Movimento não encontrado." });

      // ==============================================================
      // CASO 1: DEPOSITAR (Ação do Financeiro)
      // Muda status para "pago" (Depositado) e aí sim envia para o Alterdata via API!
      // ==============================================================
      if (acao === "depositar" || acao === "marcar_depositado") {
        if (mov.status !== "aprovado" && mov.status !== "pendente") {
          return res.status(400).json({ error: "Apenas vales pendentes ou aprovados podem ser marcados como depositados." });
        }
        let atualizado = await atualizarMovimentoStatus(supabase, movimentoId, {
          status: "pago",
          aprovadoPor: ctx.email,
        });

        // Agora que foi depositado pelo Financeiro, envia para a folha pela API do Alterdata!
        let alterdataEnvio = null;
        const { token: tokenBody } = req.body || {};
        try {
          alterdataEnvio = await enviarMovimentoFolhaParaAlterdata({
            supabase,
            movimento: atualizado,
            tokenParam: tokenBody,
            ctx,
          });
          atualizado = (await obterMovimento(supabase, movimentoId)) || atualizado;
        } catch (errAlt) {
          console.error("[ccipay] Erro ao integrar com Alterdata no depósito:", errAlt);
        }

        notificarEmailCcipay("adiantamento_depositado", {
          mov: atualizado,
          destinatario: mov.funcionarioEmail,
        });
        return res.json({ ok: true, movimento: atualizado, alterdata: alterdataEnvio });
      }

      // ==============================================================
      // CASO 2: APROVAR / NEGAR (Ação do DP)
      // Se aprovado pelo DP, fica com status "aprovado" ("Aprovado aguardando recurso").
      // NÃO envia para a folha aqui; aguarda o financeiro realizar o depósito!
      // ==============================================================
      if (mov.status !== "pendente") {
        return res.status(400).json({ error: "Somente movimentos pendentes podem ser analisados." });
      }

      const aprovar = acao === "aprovar";
      let atualizado = await atualizarMovimentoStatus(supabase, movimentoId, {
        status: aprovar ? "aprovado" : "negado",
        aprovadoPor: ctx.email,
        metadataPatch: aprovar ? {} : { justificativaNegacao: String(justificativa || "").trim() },
      });

      notificarEmailCcipay(aprovar ? "adiantamento_aprovado" : "adiantamento_negado", {
        mov: atualizado,
        destinatario: mov.funcionarioEmail,
      });

      return res.json({ ok: true, movimento: atualizado });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  // --- Bonificações / deduções ---

  app.post("/api/ccipay/bonificacoes/lancar", async (req, res) => {
    try {
      const { idToken, funcionarioEmail, valor, descricao } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      if (!(await isCcipayLancador(supabase, ctx.email, ctx.papeis))) {
        return res.status(403).json({ error: "Sem permissão para lançar bonificações." });
      }

      const alvo = String(funcionarioEmail || "").toLowerCase();
      const valorNum = Number(valor);
      if (!alvo.includes("@") || Number.isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ error: "Informe funcionário e valor válidos." });
      }

      const func = await obterFuncionario(supabase, alvo);
      if (!func) {
        return res.status(404).json({ error: "Funcionário não cadastrado no Advance-CCI." });
      }

      const comp = competenciaAtual();
      await validarCreditoBonificacao(supabase, func, alvo, comp, valorNum);

      const mov = await criarMovimento(supabase, {
        tipo: "bonificacao",
        direcao: "credito",
        valor: valorNum,
        status: "aprovado",
        competencia: comp,
        funcionarioEmail: alvo,
        funcionarioNome: func.nome,
        criadoPor: ctx.email,
        aprovadoPor: ctx.email,
        metadata: { descricao: String(descricao || "").trim() },
      });

      notificarEmailCcipay("bonificacao_lancada", { mov, destinatario: alvo });
      return res.json({ ok: true, movimento: mov });
    } catch (e) {
      if (e instanceof CcipayBonificacaoError) return responderErroCcipay(e, res);
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/deducoes/lancar", async (req, res) => {
    try {
      const { idToken, funcionarioEmail, valor, descricao } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      if (!(await isCcipayLancador(supabase, ctx.email, ctx.papeis))) {
        return res.status(403).json({ error: "Sem permissão para lançar deduções." });
      }

      const alvo = String(funcionarioEmail || "").toLowerCase();
      const valorNum = Number(valor);
      if (!alvo.includes("@") || Number.isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ error: "Informe funcionário e valor válidos." });
      }

      const func = await obterFuncionario(supabase, alvo);
      if (!func) {
        return res.status(404).json({ error: "Funcionário não cadastrado no Advance-CCI." });
      }

      const comp = competenciaAtual();
      await validarDebitoBonificacao(supabase, alvo, comp, valorNum);

      const mov = await criarMovimento(supabase, {
        tipo: "deducao",
        direcao: "debito",
        valor: valorNum,
        status: "aprovado",
        competencia: comp,
        funcionarioEmail: alvo,
        funcionarioNome: func.nome,
        criadoPor: ctx.email,
        aprovadoPor: ctx.email,
        metadata: { descricao: String(descricao || "").trim() },
      });

      notificarEmailCcipay("deducao_lancada", { mov, destinatario: alvo });
      return res.json({ ok: true, movimento: mov });
    } catch (e) {
      if (e instanceof CcipayBonificacaoError) return responderErroCcipay(e, res);
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Funcionários admin ---

  app.post("/api/ccipay/funcionarios/listar", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayDp(ctx.papeis) && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      const funcionarios = await listarFuncionarios(supabase);
      return res.json({ ok: true, funcionarios });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/funcionarios/atualizar", async (req, res) => {
    try {
      const { idToken, email, patch } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayDp(ctx.papeis) && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      const funcionario = await atualizarFuncionarioAdmin(supabase, email, patch || {});
      return res.json({ ok: true, funcionario });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/funcionarios/sincronizar-alterdata", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayDp(ctx.papeis) && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const resultado = await sincronizarFuncionariosAdvanceComAlterdata(supabase);
      const funcionarios = await listarFuncionarios(supabase);
      return res.json({ ok: true, ...resultado, funcionarios });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Lojas ---

  app.post("/api/ccipay/lojas/listar", async (req, res) => {
    try {
      const { idToken, apenasAtivas } = req.body || {};
      const parceiro = getParceiroFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      if (parceiro) {
        const lojas = await lojasDoLogin(supabase, parceiro.login);
        return res.json({ ok: true, lojas: lojas.filter((l) => !apenasAtivas || l.ativa) });
      }

      const ctx = await ctxFromRequest(req);
      if (isCcipayAdmin(ctx.papeis) || isCcipayDp(ctx.papeis)) {
        const lojas = await listarLojas(supabase, { apenasAtivas: Boolean(apenasAtivas) });
        return res.json({ ok: true, lojas });
      }

      const lojas = await lojasDoUsuario(supabase, ctx.email);
      return res.json({ ok: true, lojas });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/lojas/salvar", async (req, res) => {
    try {
      const { idToken, loja } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Somente admin Advance-CCI." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      const saved = loja?.id
        ? await atualizarLoja(supabase, loja.id, loja)
        : await criarLoja(supabase, loja);
      return res.json({ ok: true, loja: saved });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/lojas/excluir", async (req, res) => {
    try {
      const { idToken, lojaId } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Somente admin Advance-CCI." });
      }
      if (!lojaId) {
        return res.status(400).json({ error: "ID da loja não informado." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      await excluirLoja(supabase, lojaId);
      return res.json({ ok: true, lojaId });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/lojas/usuarios", async (req, res) => {
    try {
      const { idToken, lojaId, acao, email, nome, login, senha } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Somente admin Advance-CCI." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      if (acao === "listar" || (!login && !email && acao !== "remover")) {
        const usuarios = await listarUsuariosLoja(supabase, lojaId);
        return res.json({ ok: true, usuarios });
      }

      if (login) {
        const { hashSenha, loginValido, normalizarLogin } = await import("./parceiroPassword.js");
        const { vincularOperadorLoja, desvincularOperadorLoja } = await import("./ccipayStore.js");
        const loginNorm = normalizarLogin(login);
        if (!loginValido(loginNorm)) {
          return res.status(400).json({ error: "Login inválido. Use um nome de usuário (ex.: lanchonete) ou um e-mail válido." });
        }
        if (acao === "remover") {
          await desvincularOperadorLoja(supabase, lojaId, loginNorm);
        } else {
          let senhaHash = undefined;
          if (senha) {
            if (String(senha).length < 6) {
              return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
            }
            senhaHash = await hashSenha(String(senha));
          } else {
            const opAtual = await (await import("./ccipayStore.js")).obterOperadorPorLogin(supabase, loginNorm);
            if (!opAtual?.senhaHash) {
              return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
            }
          }
          await vincularOperadorLoja(supabase, lojaId, {
            login: loginNorm,
            senhaHash,
            nome: nome || loginNorm,
            email: email ? String(email).trim() : undefined,
          });
        }
      } else if (acao === "remover") {
        await desvincularUsuarioLoja(supabase, lojaId, email);
      } else {
        await vincularUsuarioLoja(supabase, lojaId, email, nome);
      }

      const usuarios = await listarUsuariosLoja(supabase, lojaId);
      return res.json({ ok: true, usuarios });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Lançadores ---

  app.post("/api/ccipay/lancadores/listar", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      const lancadores = await listarLancadores(supabase);
      return res.json({ ok: true, lancadores });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/lancadores/salvar", async (req, res) => {
    try {
      const { idToken, email, nome, ativo, acao } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      if (acao === "remover") {
        await removerLancador(supabase, email);
      } else {
        await salvarLancador(supabase, email, nome, ativo !== false);
      }
      const lancadores = await listarLancadores(supabase);
      return res.json({ ok: true, lancadores });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Catálogo ---

  app.post("/api/ccipay/catalogo/listar", async (req, res) => {
    try {
      const { idToken, lojaId, apenasAtivos } = req.body || {};
      await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      const itens = await listarCatalogo(supabase, lojaId, { apenasAtivos: Boolean(apenasAtivos) });
      return res.json({ ok: true, itens });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/catalogo/salvar", async (req, res) => {
    try {
      const { idToken, item } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      const ok = await isOperadorLoja(supabase, ctx.email, item?.lojaId, ctx.papeis);
      if (!ok && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão para editar catálogo." });
      }
      const saved = await salvarCatalogoItem(supabase, item);
      return res.json({ ok: true, item: saved });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Pedidos ---

  app.post("/api/ccipay/pedidos/criar", async (req, res) => {
    try {
      const { idToken, lojaId, itens, observacao } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;
      await ensureFuncionario(supabase, ctx);

      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: "Informe ao menos um item." });
      }

      let valorTotal = 0;
      const linhas = [];
      for (const i of itens) {
        const qtd = Number(i.quantidade) || 1;
        const preco = Number(i.precoUnitario);
        if (Number.isNaN(preco) || preco < 0) {
          return res.status(400).json({ error: "Preço inválido no pedido." });
        }
        const subtotal = qtd * preco;
        valorTotal += subtotal;
        linhas.push({
          itemId: i.itemId ?? null,
          nome: i.nome,
          quantidade: qtd,
          precoUnitario: preco,
          subtotal,
        });
      }

      const pedido = await criarPedido(
        supabase,
        {
          lojaId,
          funcionarioEmail: ctx.email,
          funcionarioNome: ctx.nome,
          valorTotal,
          observacao: observacao || "",
        },
        linhas,
      );

      notificarEmailCcipay("pedido_criado", { pedido, destinatario: ctx.email });
      return res.json({ ok: true, pedido });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/pedidos/listar", async (req, res) => {
    try {
      const { idToken, lojaId, status } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const operador = lojaId && (await isOperadorLoja(supabase, ctx.email, lojaId, ctx.papeis));
      const dp = isCcipayDp(ctx.papeis) || isCcipayAdmin(ctx.papeis);

      const pedidos = await listarPedidos(supabase, {
        lojaId: operador || dp ? lojaId : undefined,
        funcionarioEmail: operador || dp ? undefined : ctx.email,
        status,
      });
      return res.json({ ok: true, pedidos });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/pedidos/confirmar", async (req, res) => {
    try {
      const { idToken, pedidoId, acao } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const pedido = await obterPedidoCompleto(supabase, pedidoId);
      if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });

      const ok = await isOperadorLoja(supabase, ctx.email, pedido.lojaId, ctx.papeis);
      if (!ok && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      if (acao === "cancelar") {
        const atualizado = await atualizarPedidoStatus(supabase, pedidoId, "cancelado", ctx.email);
        return res.json({ ok: true, pedido: atualizado });
      }

      const comp = competenciaAtual();
      await validarDebitoBonificacao(supabase, pedido.funcionarioEmail, comp, pedido.valorTotal);

      const atualizado = await atualizarPedidoStatus(supabase, pedidoId, "entregue", ctx.email);

      await criarMovimento(supabase, {
        tipo: "compra_loja",
        direcao: "debito",
        valor: pedido.valorTotal,
        status: "descontado_folha",
        competencia: comp,
        funcionarioEmail: pedido.funcionarioEmail,
        funcionarioNome: pedido.funcionarioNome,
        lojaId: pedido.lojaId,
        pedidoId: pedido.id,
        criadoPor: ctx.email,
        aprovadoPor: ctx.email,
        metadata: { observacao: pedido.observacao },
      });

      notificarEmailCcipay("pedido_entregue", { pedido: atualizado, destinatario: pedido.funcionarioEmail });
      return res.json({ ok: true, pedido: atualizado });
    } catch (e) {
      if (e instanceof CcipayBonificacaoError) return responderErroCcipay(e, res);
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Relatórios ---

  app.post("/api/ccipay/relatorios/dp", async (req, res) => {
    try {
      const { idToken, competencia, exportarCsv, status, tipo } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayDp(ctx.papeis) && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const comp = competencia || competenciaAtual();
      const movimentos = await relatorioDpMovimentos(supabase, {
        competencia: comp,
        status: status || undefined,
        tipo: tipo || undefined,
      });
      const resumoPorFuncionario = await relatorioResumoPorFuncionario(supabase, comp);
      const funcionarios = await listarFuncionarios(supabase);
      const mapaFunc = Object.fromEntries(funcionarios.map((f) => [f.email.toLowerCase(), f]));

      if (exportarCsv) {
        const header =
          "codigo_referencia,nome,email,tipo,valor,competencia,status,descricao";
        const linhas = movimentos.map((m) => {
          const f = mapaFunc[m.funcionarioEmail.toLowerCase()] || {};
          const desc = m.metadata?.descricao || m.metadata?.pix || "";
          return [
            csvEscape(f.alterdataCodigo),
            csvEscape(m.funcionarioNome),
            csvEscape(m.funcionarioEmail),
            csvEscape(m.tipo),
            csvEscape(m.valor.toFixed(2)),
            csvEscape(m.competencia),
            csvEscape(m.status),
            csvEscape(desc),
          ].join(",");
        });
        return res.json({
          ok: true,
          csv: [header, ...linhas].join("\n"),
          movimentos,
          resumoPorFuncionario,
        });
      }

      return res.json({ ok: true, movimentos, funcionarios, resumoPorFuncionario });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/relatorios/loja", async (req, res) => {
    try {
      const { idToken, lojaId, de, ate, competencia, status } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await isOperadorLoja(supabase, ctx.email, lojaId, ctx.papeis);
      if (!ok && !isCcipayAdmin(ctx.papeis) && !isCcipayDp(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      let dataInicio = de;
      let dataFim = ate;

      if (competencia && !de && !ate) {
        const partes = competencia.split("-").map(Number);
        if (partes.length === 2 && !Number.isNaN(partes[0]) && !Number.isNaN(partes[1])) {
          dataInicio = `${competencia}-01T00:00:00.000Z`;
          const ultimoDia = new Date(partes[0], partes[1], 0).getDate();
          dataFim = `${competencia}-${String(ultimoDia).padStart(2, "0")}T23:59:59.999Z`;
        }
      }

      const [pedidos, vendasQr, repasses, todosRepassesLoja] = await Promise.all([
        relatorioLojaPedidos(supabase, { lojaId, de: dataInicio, ate: dataFim }),
        listarVendasQr(supabase, { lojaId, status, de: dataInicio, ate: dataFim }),
        listarRepassesLoja(supabase, lojaId, { competencia, de: dataInicio, ate: dataFim }),
        listarRepassesLoja(supabase, lojaId),
      ]);

      const vendasPagas = vendasQr.filter((v) => v.status === "pago");
      const valorVendasQr = vendasPagas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
      const valorPedidos = pedidos.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);
      const valorVendasTotal = valorPedidos + valorVendasQr;

      const totalRepassadoPeriodo = repasses.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
      const totalRepassadoHistorico = todosRepassesLoja.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);

      // Mapeia todas as vendas e pedidos já vinculados a algum repasse
      const repassePorVendaId = new Map();
      const repassePorPedidoId = new Map();

      for (const rep of todosRepassesLoja) {
        if (Array.isArray(rep.vendaIds)) {
          for (const vId of rep.vendaIds) {
            repassePorVendaId.set(vId, rep);
          }
        }
        if (Array.isArray(rep.pedidoIds)) {
          for (const pId of rep.pedidoIds) {
            repassePorPedidoId.set(pId, rep);
          }
        }
      }

      const vendasQrEnriquecidas = vendasQr.map((v) => {
        const rep = repassePorVendaId.get(v.id);
        return {
          ...v,
          repasseId: rep ? rep.id : null,
          repassadoEm: rep ? rep.dataPagamento : null,
          repasseForma: rep ? rep.formaPagamento : null,
        };
      });

      const pedidosEnriquecidos = pedidos.map((p) => {
        const rep = repassePorPedidoId.get(p.id);
        return {
          ...p,
          repasseId: rep ? rep.id : null,
          repassadoEm: rep ? rep.dataPagamento : null,
          repasseForma: rep ? rep.formaPagamento : null,
        };
      });

      const vendasPagasNaoRepassadas = vendasQrEnriquecidas.filter((v) => v.status === "pago" && !v.repasseId);
      const pedidosNaoRepassados = pedidosEnriquecidos.filter((p) => !p.repasseId && p.status !== "cancelado");
      const valorVendasPendentes =
        vendasPagasNaoRepassadas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0) +
        pedidosNaoRepassados.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);

      let totalVendasHistorico = valorVendasTotal;
      if (dataInicio || dataFim || competencia) {
        const [todasVendas, todosPeds] = await Promise.all([
          listarVendasQr(supabase, { lojaId, status: "pago" }),
          relatorioLojaPedidos(supabase, { lojaId }),
        ]);
        const somaVendas = todasVendas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
        const somaPeds = todosPeds.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);
        totalVendasHistorico = somaVendas + somaPeds;
      }

      const saldoDevendoGeral = Math.max(0, totalVendasHistorico - totalRepassadoHistorico);
      const saldoDevendoPeriodo = Math.max(0, valorVendasTotal - totalRepassadoPeriodo);

      const totais = {
        pedidos: pedidos.length,
        entregues: pedidos.filter((p) => p.status === "entregue").length,
        vendasQrTotal: vendasQr.length,
        vendasQrPagas: vendasPagas.length,
        vendasQrRepassadas: vendasQrEnriquecidas.filter((v) => v.status === "pago" && v.repasseId).length,
        vendasQrPendentesRepasse: vendasPagasNaoRepassadas.length,
        valorPedidos,
        valorVendasQr,
        valorTotal: valorVendasTotal,
        totalRepassado: totalRepassadoPeriodo,
        totalRepassadoHistorico,
        totalVendasHistorico,
        saldoDevendo: saldoDevendoGeral,
        saldoDevendoPeriodo,
        valorVendasPendentes,
      };

      return res.json({ ok: true, pedidos: pedidosEnriquecidos, vendasQr: vendasQrEnriquecidas, repasses, totais });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/repasses/registrar", async (req, res) => {
    try {
      const {
        idToken,
        lojaId,
        valor,
        competencia,
        dataPagamento,
        formaPagamento,
        comprovante,
        observacao,
        vendaIds,
        pedidoIds,
      } = req.body || {};

      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis) && !isCcipayDp(ctx.papeis)) {
        return res.status(403).json({ error: "Apenas administradores e DP podem registrar repasses para lojas." });
      }

      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const repasse = await registrarRepasseLoja(supabase, {
        lojaId,
        valor,
        competencia,
        dataPagamento,
        formaPagamento,
        comprovante,
        observacao,
        vendaIds: Array.isArray(vendaIds) ? vendaIds : [],
        pedidoIds: Array.isArray(pedidoIds) ? pedidoIds : [],
        criadoPor: ctx.email,
      });

      return res.json({ ok: true, repasse });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/repasses/excluir", async (req, res) => {
    try {
      const { idToken, id } = req.body || {};
      const ctx = await ctxFromRequest(req);
      if (!isCcipayAdmin(ctx.papeis) && !isCcipayDp(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      const supabase = supabaseOr503(res);
      if (!supabase) return;

      await excluirRepasseLoja(supabase, id);
      return res.json({ ok: true });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Vendas QR (portal parceiro) ---

  const VENDA_QR_TTL_MIN = 30;

  function vendaExpirada(venda) {
    const exp = venda.expiresAt ?? venda.expires_at;
    return venda.status === "pendente" && new Date(exp).getTime() < Date.now();
  }

  async function ensureVendaAtiva(supabase, venda) {
    if (!venda) return null;
    if (vendaExpirada(venda)) {
      return atualizarVendaQr(supabase, venda.id, { status: "expirado" });
    }
    return venda;
  }

  app.post("/api/ccipay/vendas/criar", async (req, res) => {
    try {
      const { idToken, lojaId, valor, descricao } = req.body || {};
      const ctx = await ctxOrParceiro(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await podeAcessarLoja(supabase, ctx, lojaId);
      if (!ok) {
        return res.status(403).json({ error: "Sem permissão para esta loja." });
      }

      const valorNum = Number(valor);
      if (!lojaId || Number.isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ error: "Informe loja e valor válidos." });
      }

      const token = randomBytes(12).toString("hex");
      const expiresAt = new Date(Date.now() + VENDA_QR_TTL_MIN * 60 * 1000).toISOString();
      const venda = await criarVendaQr(supabase, {
        lojaId,
        valor: valorNum,
        descricao: String(descricao || "").trim(),
        criadoPor: identificadorCtx(ctx),
        token,
        expiresAt,
      });

      return res.json({ ok: true, venda, token });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  function buildRegexAcentos(termo) {
    const mapa = {
      a: "[aàáâãä]",
      e: "[eèéêë]",
      i: "[iìíîï]",
      o: "[oòóôõö]",
      u: "[uùúûü]",
      c: "[cç]",
    };
    return String(termo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split("")
      .map((ch) => mapa[ch] || ch)
      .join("");
  }

  // --- Venda sem celular: busca colaborador por matrícula, CPF ou e-mail ---
  app.post("/api/ccipay/vendas/buscar-colaborador", async (req, res) => {
    try {
      const { lojaId, termo } = req.body || {};
      const ctx = await ctxOrParceiro(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await podeAcessarLoja(supabase, ctx, lojaId);
      if (!ok) {
        return res.status(403).json({ error: "Sem permissão para esta loja." });
      }

      const t = String(termo || "").trim();
      if (!t || t.length < 2) {
        return res.status(400).json({ error: "Informe matrícula, CPF ou e-mail para busca." });
      }

      const digitsOnly = t.replace(/\D/g, "");
      const digitsNoZero = digitsOnly.replace(/^0+/, "");
      const digitsPadded11 = digitsOnly.padStart(11, "0");

      let encontrados = [];

      // 1. Tenta buscar no Alterdata por CPF
      if (digitsOnly.length >= 7 && digitsOnly.length <= 11) {
        const cpfVariants = Array.from(
          new Set([digitsOnly, digitsNoZero, digitsPadded11, t].filter(Boolean))
        );

        const { data: listaCpf } = await supabase
          .from("intranet_alterdata_funcionarios")
          .select("cpf, nome_completo, email, codigo_contrato_vigente, tem_contrato_ativo")
          .in("cpf", cpfVariants)
          .order("tem_contrato_ativo", { ascending: false })
          .limit(10);

        if (listaCpf && listaCpf.length > 0) {
          encontrados.push(...listaCpf);
        }
      }

      // 2. Tenta por matrícula (código do contrato no Alterdata)
      if (digitsOnly.length > 0 && digitsOnly.length <= 8) {
        const matVariants = Array.from(
          new Set([
            digitsOnly,
            digitsNoZero,
            digitsOnly.padStart(6, "0"),
            digitsOnly.padStart(7, "0"),
            t,
          ].filter(Boolean))
        );

        const { data: listaMat } = await supabase
          .from("intranet_alterdata_funcionarios")
          .select("cpf, nome_completo, email, codigo_contrato_vigente, tem_contrato_ativo")
          .in("codigo_contrato_vigente", matVariants)
          .order("tem_contrato_ativo", { ascending: false })
          .limit(10);

        if (listaMat && listaMat.length > 0) {
          encontrados.push(...listaMat);
        }
      }

      // 3. Tenta por e-mail ou nome no Alterdata (se não foi CPF exato de 11 dígitos)
      if (digitsOnly.length !== 11) {
        if (t.includes("@")) {
          const { data: listaEmail } = await supabase
            .from("intranet_alterdata_funcionarios")
            .select("cpf, nome_completo, email, codigo_contrato_vigente, tem_contrato_ativo")
            .ilike("email", t.toLowerCase())
            .order("tem_contrato_ativo", { ascending: false })
            .limit(25);
          if (listaEmail && listaEmail.length > 0) {
            encontrados.push(...listaEmail);
          }
        } else {
          const palavras = t.trim().split(/\s+/).filter(Boolean);
          if (palavras.length > 0) {
            let q = supabase
              .from("intranet_alterdata_funcionarios")
              .select("cpf, nome_completo, email, codigo_contrato_vigente, tem_contrato_ativo")
              .order("tem_contrato_ativo", { ascending: false })
              .limit(30);

            for (const p of palavras) {
              const reg = buildRegexAcentos(p);
              q = q.filter("nome_completo", "imatch", reg);
            }

            const { data: listaNome } = await q;
            if (listaNome && listaNome.length > 0) {
              encontrados.push(...listaNome);
            }
          }
        }
      }

      // 4. Complementa ou busca na tabela ccipay_funcionarios caso não tenha achado
      if (encontrados.length === 0) {
        let qCcipay = supabase
          .from("ccipay_funcionarios")
          .select("email, nome, alterdata_codigo, ativo")
          .order("ativo", { ascending: false })
          .limit(30);

        if (digitsOnly.length > 0) {
          const matVariants = Array.from(
            new Set([digitsOnly, digitsNoZero, digitsOnly.padStart(6, "0"), t].filter(Boolean))
          );
          qCcipay = qCcipay.or(`email.ilike.%${t}%,nome.ilike.%${t}%,alterdata_codigo.in.(${matVariants.join(",")})`);
        } else {
          const palavras = t.trim().split(/\s+/).filter(Boolean);
          for (const p of palavras) {
            const reg = buildRegexAcentos(p);
            qCcipay = qCcipay.filter("nome", "imatch", reg);
          }
        }

        const { data: listaCcipay } = await qCcipay;
        if (listaCcipay && listaCcipay.length > 0) {
          for (const c of listaCcipay) {
            encontrados.push({
              email: c.email,
              nome_completo: c.nome,
              codigo_contrato_vigente: c.alterdata_codigo,
              cpf: null,
              tem_contrato_ativo: c.ativo,
            });
          }
        }
      }

      // Deduplicação preservando a prioridade dos ativos e sem mesclar homônimos com matrículas diferentes
      const mapa = new Map();
      for (const item of encontrados) {
        const chave = [
          item.codigo_contrato_vigente || "",
          item.cpf || "",
          item.email || "",
          item.nome_completo || "",
        ].join("_").toLowerCase().trim();
        if (chave && !mapa.has(chave)) {
          mapa.set(chave, item);
        }
      }
      const unicos = Array.from(mapa.values());

      if (unicos.length === 0) {
        return res.status(404).json({ error: "Colaborador não encontrado com os dados informados." });
      }

      const comp = competenciaAtual();
      const colaboradores = await Promise.all(
        unicos.slice(0, 20).map(async (func) => {
          const email = func.email ? func.email.toLowerCase() : null;
          let saldo = 0;
          if (email) {
            try {
              const infoSaldo = await saldoConvenioDisponivel(supabase, email, comp);
              saldo = infoSaldo.disponivelFolha;
            } catch (err) {
              console.warn("[buscar-colaborador] erro ao consultar saldo:", err?.message);
            }
          }

          let cpfFormatado = null;
          if (func.cpf) {
            const dig = func.cpf.replace(/\D/g, "").padStart(11, "0");
            cpfFormatado = `***.${dig.slice(3, 6)}.${dig.slice(6, 9)}-**`;
          }

          return {
            email: email || "",
            nome: func.nome_completo || func.nome || "Colaborador",
            matricula: func.codigo_contrato_vigente || func.alterdata_codigo || "—",
            cpfMascarado: cpfFormatado,
            saldoDisponivel: saldo,
            ativo: func.tem_contrato_ativo !== false && func.ativo !== false,
          };
        })
      );

      return res.json({
        ok: true,
        colaborador: colaboradores[0] || null,
        colaboradores,
        total: colaboradores.length,
      });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Venda sem celular: lançamento direto debitando convênio do colaborador ---
  app.post("/api/ccipay/vendas/lancar-direta", async (req, res) => {
    try {
      const { lojaId, funcionarioEmail, valor, descricao } = req.body || {};
      const ctx = await ctxOrParceiro(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await podeAcessarLoja(supabase, ctx, lojaId);
      if (!ok) {
        return res.status(403).json({ error: "Sem permissão para esta loja." });
      }

      const valorNum = Number(valor);
      if (!lojaId || !funcionarioEmail || Number.isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ error: "Dados da venda incompletos ou valor inválido." });
      }

      const emailAlvo = String(funcionarioEmail).trim().toLowerCase();
      let func = await obterFuncionario(supabase, emailAlvo);
      if (!func) {
        func = await sincronizarFuncionarioComAlterdata(supabase, emailAlvo);
      }
      if (!func || !func.ativo) {
        return res.status(400).json({ error: "Colaborador inativo ou não cadastrado no Advance-CCI." });
      }

      const comp = competenciaAtual();
      await validarDebitoBonificacao(supabase, emailAlvo, comp, valorNum);

      const identificador = identificadorCtx(ctx);
      const descFinal = String(descricao || "").trim() || "Compra no convênio (sem celular)";

      // Cria movimento unificado no ledger
      const mov = await criarMovimento(supabase, {
        tipo: "compra_loja",
        direcao: "debito",
        valor: valorNum,
        status: "descontado_folha",
        competencia: comp,
        funcionarioEmail: emailAlvo,
        funcionarioNome: func.nome,
        lojaId,
        criadoPor: identificador,
        aprovadoPor: identificador,
        metadata: {
          modo: "venda_direta_sem_celular",
          descricao: descFinal,
          operador: ctx.nome || ctx.login || ctx.email,
          lojaId,
        },
      });

      // Registra na tabela ccipay_vendas_qr com status pago para constar no extrato da loja parceira
      const token = randomBytes(12).toString("hex");
      const venda = await criarVendaQr(supabase, {
        lojaId,
        valor: valorNum,
        descricao: descFinal,
        criadoPor: identificador,
        token,
        expiresAt: new Date().toISOString(),
      });

      const atualizada = await atualizarVendaQr(supabase, venda.id, {
        status: "pago",
        funcionarioEmail: emailAlvo,
        funcionarioNome: func.nome,
        movimentoId: mov.id,
        pagoEm: new Date().toISOString(),
      });

      notificarEmailCcipay("venda_direta_realizada", {
        venda: atualizada,
        mov,
        destinatario: emailAlvo,
        operador: identificador,
      });

      return res.json({ ok: true, venda: atualizada, movimento: mov });
    } catch (e) {
      if (e instanceof CcipayBonificacaoError) return responderErroCcipay(e, res);
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/vendas/listar", async (req, res) => {
    try {
      const { idToken, lojaId, status, de, ate } = req.body || {};
      const ctx = await ctxOrParceiro(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await podeAcessarLoja(supabase, ctx, lojaId);
      if (!ok) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      const vendas = await listarVendasQr(supabase, { lojaId, status, de, ate });
      return res.json({ ok: true, vendas });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/vendas/resumo", async (req, res) => {
    try {
      const { idToken, lojaId } = req.body || {};
      const ctx = await ctxOrParceiro(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await podeAcessarLoja(supabase, ctx, lojaId);
      if (!ok) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      const [resumo, repasses] = await Promise.all([
        resumoVendasParceiro(supabase, lojaId),
        listarRepassesLoja(supabase, lojaId),
      ]);
      const totalRepassado = repasses.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
      const saldoDevendo = Math.max(0, (resumo.aReceber || 0) - totalRepassado);
      return res.json({ ok: true, ...resumo, totalRepassado, saldoDevendo, repasses });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/vendas/obter", async (req, res) => {
    try {
      const { idToken, token } = req.body || {};
      await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      let venda = await obterVendaPorToken(supabase, token);
      venda = await ensureVendaAtiva(supabase, venda);
      if (!venda) return res.status(404).json({ error: "Venda não encontrada." });

      return res.json({ ok: true, venda });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/vendas/pagar", async (req, res) => {
    try {
      const { idToken, token, metodoPagamento = "adiantamento" } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      let venda = await obterVendaPorToken(supabase, token);
      venda = await ensureVendaAtiva(supabase, venda);
      if (!venda) return res.status(404).json({ error: "Venda não encontrada." });
      if (venda.status !== "pendente") {
        return res.status(400).json({ error: "Esta venda já foi processada ou expirou." });
      }

      const func = await ensureFuncionario(supabase, ctx);
      if (!func.ativo) {
        return res.status(403).json({ error: "Seu cadastro Advance-CCI está inativo." });
      }

      const comp = competenciaAtual();
      const isBonificacao = metodoPagamento === "bonificacao";

      if (isBonificacao) {
        const saldoBon = await saldoBonificacao(supabase, ctx.email, comp);
        if (venda.valor > saldoBon) {
          return res.status(400).json({
            error: `Saldo de bonificação insuficiente. Disponível: R$ ${saldoBon.toFixed(2)}.`,
          });
        }
      } else {
        await validarDebitoBonificacao(supabase, ctx.email, comp, venda.valor);
      }

      const mov = await criarMovimento(supabase, {
        tipo: "compra_loja",
        direcao: "debito",
        valor: venda.valor,
        status: isBonificacao ? "pago" : "descontado_folha",
        competencia: comp,
        funcionarioEmail: ctx.email,
        funcionarioNome: ctx.nome,
        lojaId: venda.lojaId,
        criadoPor: ctx.email,
        aprovadoPor: venda.criadoPor,
        metadata: {
          descricao: venda.descricao || (isBonificacao ? "Compra QR (Bonificação)" : "Venda QR"),
          vendaQrToken: venda.token,
          metodoPagamento: isBonificacao ? "bonificacao" : "adiantamento",
        },
      });

      const atualizada = await atualizarVendaQr(supabase, venda.id, {
        status: "pago",
        funcionarioEmail: ctx.email,
        funcionarioNome: ctx.nome,
        movimentoId: mov.id,
        pagoEm: new Date().toISOString(),
      });

      notificarEmailCcipay("venda_qr_paga", { venda: atualizada, mov, destinatario: venda.criadoPor });

      return res.json({ ok: true, venda: atualizada, movimento: mov });
    } catch (e) {
      if (e instanceof CcipayBonificacaoError) return responderErroCcipay(e, res);
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ccipay/vendas/cancelar", async (req, res) => {
    try {
      const { idToken, vendaId } = req.body || {};
      const ctx = await ctxOrParceiro(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      let venda = await obterVendaPorId(supabase, vendaId);
      venda = await ensureVendaAtiva(supabase, venda);
      if (!venda) return res.status(404).json({ error: "Venda não encontrada." });

      const ok = await podeAcessarLoja(supabase, ctx, venda.lojaId);
      if (!ok) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      if (venda.status !== "pendente") {
        return res.status(400).json({ error: "Somente vendas pendentes podem ser canceladas." });
      }

      const atualizada = await atualizarVendaQr(supabase, venda.id, { status: "cancelado" });
      return res.json({ ok: true, venda: atualizada });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Solicitação de Aumento de Limite nos Convênios (Notifica DP) ---
  // --- Solicitação de Aumento de Limite nos Convênios (Fila de Operação DP) ---
  app.post("/api/ccipay/limite/solicitar-aumento", async (req, res) => {
    try {
      const { idToken, novoLimite, motivo } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const novoLimiteNum = Number(novoLimite);
      if (Number.isNaN(novoLimiteNum) || novoLimiteNum <= 0) {
        return res.status(400).json({ error: "Informe um valor de limite válido maior que zero." });
      }

      const func = (await obterFuncionario(supabase, ctx.email)) || {
        email: ctx.email,
        nome: ctx.email,
        limiteAdiantamento: 300,
      };

      const limiteAtual = func.limiteAdiantamento ?? 300;
      const idChamado = `LIM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

      const payload = {
        limiteAnterior: limiteAtual,
        novoLimite: novoLimiteNum,
        motivo: String(motivo || "").trim(),
        decisao: "pendente",
        solicitadoEm: new Date().toISOString(),
      };

      const row = {
        id: idChamado,
        titulo: `Solicitação de Aumento de Limite nos Convênios — ${func.nome || ctx.email}`,
        setor_destino: "dp",
        solicitante: func.nome || ctx.email,
        solicitante_email: ctx.email,
        papel_abertura: "usuario",
        categoria: "Advance-CCI / Aumento de Limite",
        prioridade: "media",
        status: "aberto",
        data_abertura: new Date().toLocaleDateString("pt-BR"),
        descricao: JSON.stringify(payload),
      };

      const { data, error } = await supabase.from("intranet_chamados").insert(row).select().single();
      if (error) {
        throw new Error(`Falha ao registrar solicitação: ${error.message}`);
      }

      notificarEmailCcipay("solicitacao_aumento_limite", {
        solicitante: ctx.email,
        nome: func.nome,
        limiteAtual,
        novoLimite: novoLimiteNum,
        motivo,
        chamadoId: idChamado,
      });

      return res.json({
        ok: true,
        mensagem: "Solicitação de aumento de limite enviada com sucesso para a Gestão de Vales e Limites do DP.",
        chamadoId: idChamado,
      });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ccipay/limite/listar", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      if (!isCcipayDp(ctx.papeis) && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão para gerenciar solicitações de limite." });
      }

      const { data, error } = await supabase
        .from("intranet_chamados")
        .select("*")
        .eq("categoria", "Advance-CCI / Aumento de Limite")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const solicitacoes = (data || []).map((c) => {
        let meta = {};
        try {
          meta = JSON.parse(c.descricao || "{}");
        } catch {
          meta = { motivo: c.descricao };
        }
        const solucao = c.solucao && typeof c.solucao === "object" ? c.solucao : {};
        const statusFinal =
          solucao.decisao || meta.decisao || (c.status === "aberto" ? "pendente" : "aprovado");

        return {
          id: c.id,
          tipo: "solicitacao_limite",
          direcao: "credito",
          valor: Number(meta.novoLimite || 0),
          status: statusFinal,
          competencia: "",
          funcionarioEmail: c.solicitante_email,
          funcionarioNome: c.solicitante,
          criadoPor: c.solicitante_email,
          aprovadoPor: solucao.resolvidoPor || null,
          metadata: {
            limiteAnterior: Number(meta.limiteAnterior ?? 300),
            motivo: meta.motivo || "",
            valorAprovado: solucao.valorAprovado != null ? Number(solucao.valorAprovado) : undefined,
            justificativaDp: solucao.justificativa || meta.justificativaDp || "",
            analisadoEm: solucao.resolvidoEm || null,
          },
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        };
      });

      return res.json({ ok: true, solicitacoes });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ccipay/limite/analisar", async (req, res) => {
    try {
      const { idToken, movimentoId, acao, valorAprovado, justificativa } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      if (!isCcipayDp(ctx.papeis) && !isCcipayAdmin(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão para analisar solicitações de limite." });
      }

      const { data: chamado, error: errChamado } = await supabase
        .from("intranet_chamados")
        .select("*")
        .eq("id", movimentoId)
        .maybeSingle();

      if (errChamado || !chamado) {
        return res.status(404).json({ error: "Solicitação de limite não encontrada." });
      }

      let meta = {};
      try {
        meta = JSON.parse(chamado.descricao || "{}");
      } catch {
        meta = { motivo: chamado.descricao };
      }

      if (chamado.status !== "aberto" && meta.decisao && meta.decisao !== "pendente") {
        return res.status(400).json({ error: "Apenas solicitações pendentes podem ser analisadas." });
      }

      if (acao === "aprovar") {
        const valorFinal = Number(
          valorAprovado != null && !Number.isNaN(Number(valorAprovado))
            ? valorAprovado
            : meta.novoLimite || 300,
        );
        if (valorFinal <= 0) {
          return res.status(400).json({ error: "Valor aprovado inválido." });
        }

        const solucaoObj = {
          decisao: "aprovado",
          valorAprovado: valorFinal,
          justificativa: String(justificativa || "").trim() || "Aprovado pelo DP.",
          resolvidoPor: ctx.email,
          resolvidoEm: new Date().toISOString(),
        };

        meta.decisao = "aprovado";
        meta.valorAprovado = valorFinal;
        meta.justificativaDp = solucaoObj.justificativa;

        await supabase
          .from("intranet_chamados")
          .update({
            status: "resolvido",
            solucao: solucaoObj,
            descricao: JSON.stringify(meta),
            updated_at: new Date().toISOString(),
          })
          .eq("id", movimentoId);

        // Atualiza o limite de adiantamento do colaborador imediatamente
        await atualizarFuncionarioAdmin(supabase, chamado.solicitante_email, {
          limiteAdiantamento: valorFinal,
        });

        notificarEmailCcipay("limite_analisado", {
          chamadoId: movimentoId,
          acao: "aprovado",
          novoLimite: valorFinal,
          destinatario: chamado.solicitante_email,
        });

        return res.json({ ok: true, novoLimite: valorFinal });
      }

      if (acao === "negar" || acao === "recusar") {
        const solucaoObj = {
          decisao: "recusado",
          justificativa: String(justificativa || "").trim() || "Recusado pelo DP.",
          resolvidoPor: ctx.email,
          resolvidoEm: new Date().toISOString(),
        };

        meta.decisao = "recusado";
        meta.justificativaDp = solucaoObj.justificativa;

        await supabase
          .from("intranet_chamados")
          .update({
            status: "resolvido",
            solucao: solucaoObj,
            descricao: JSON.stringify(meta),
            updated_at: new Date().toISOString(),
          })
          .eq("id", movimentoId);

        notificarEmailCcipay("limite_analisado", {
          chamadoId: movimentoId,
          acao: "recusado",
          destinatario: chamado.solicitante_email,
        });

        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "Ação inválida (use 'aprovar' ou 'negar')." });
    } catch (e) {
      if (e.status) return respostaErroIdToken(res, e);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });
}
