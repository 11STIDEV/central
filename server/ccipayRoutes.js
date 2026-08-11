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
  listarFuncionarios,
  atualizarFuncionarioAdmin,
  somarAdiantamentosCompetencia,
  saldoBonificacao,
  criarMovimento,
  listarMovimentos,
  obterMovimento,
  atualizarMovimentoStatus,
  montarResumoFuncionario,
  listarLojas,
  criarLoja,
  atualizarLoja,
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
import { randomBytes } from "node:crypto";
import { notificarEmailCcipay } from "./ccipayEmail.js";
import { getParceiroFromRequest } from "./parceiroSessionAuth.js";
import { competenciaAtual } from "./ccipayAccess.js";

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
    let f = await obterFuncionario(supabase, ctx.email);
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
      const { idToken, pix, valor } = req.body || {};
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
      const disponivel = func.limiteAdiantamento - usado;
      if (valorNum > disponivel) {
        return res.status(400).json({
          error: `Valor excede o limite disponível (R$ ${disponivel.toFixed(2)}).`,
        });
      }

      const mov = await criarMovimento(supabase, {
        tipo: "adiantamento",
        direcao: "debito",
        valor: valorNum,
        status: "pendente",
        competencia: comp,
        funcionarioEmail: ctx.email,
        funcionarioNome: ctx.nome,
        criadoPor: ctx.email,
        metadata: { pix: String(pix).trim() },
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
      if (mov.status !== "pendente") {
        return res.status(400).json({ error: "Somente movimentos pendentes podem ser analisados." });
      }

      const aprovar = acao === "aprovar";
      const atualizado = await atualizarMovimentoStatus(supabase, movimentoId, {
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
          return res.status(400).json({ error: "Login inválido." });
        }
        if (acao === "remover") {
          await desvincularOperadorLoja(supabase, lojaId, loginNorm);
        } else {
          if (!senha || String(senha).length < 6) {
            return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
          }
          await vincularOperadorLoja(supabase, lojaId, {
            login: loginNorm,
            senhaHash: await hashSenha(String(senha)),
            nome: nome || loginNorm,
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
      const { idToken, lojaId, de, ate } = req.body || {};
      const ctx = await ctxFromRequest(req);
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const ok = await isOperadorLoja(supabase, ctx.email, lojaId, ctx.papeis);
      if (!ok && !isCcipayAdmin(ctx.papeis) && !isCcipayDp(ctx.papeis)) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      const pedidos = await relatorioLojaPedidos(supabase, { lojaId, de, ate });
      const totais = {
        pedidos: pedidos.length,
        valorTotal: pedidos.reduce((a, p) => a + p.valorTotal, 0),
        entregues: pedidos.filter((p) => p.status === "entregue").length,
      };
      return res.json({ ok: true, pedidos, totais });
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

      const resumo = await resumoVendasParceiro(supabase, lojaId);
      return res.json({ ok: true, ...resumo });
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
      const { idToken, token } = req.body || {};
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
      await validarDebitoBonificacao(supabase, ctx.email, comp, venda.valor);

      const mov = await criarMovimento(supabase, {
        tipo: "compra_loja",
        direcao: "debito",
        valor: venda.valor,
        status: "descontado_folha",
        competencia: comp,
        funcionarioEmail: ctx.email,
        funcionarioNome: ctx.nome,
        lojaId: venda.lojaId,
        criadoPor: ctx.email,
        aprovadoPor: venda.criadoPor,
        metadata: { descricao: venda.descricao || "Venda QR", vendaQrToken: venda.token },
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
}
