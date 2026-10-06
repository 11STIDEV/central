import {
  obterOperadorPorLogin,
  obterOperadorPorLoginOuEmail,
  vincularOperadorLoja,
  redefinirSenhaOperador,
  desvincularOperadorLoja,
  listarUsuariosLoja,
} from "./ccipayStore.js";
import {
  hashSenha,
  loginValido,
  normalizarLogin,
  verificarSenha,
} from "./parceiroPassword.js";
import {
  encerrarSessaoParceiro,
  getParceiroFromRequest,
  getParceiroSessionIdFromRequest,
  iniciarSessaoParceiro,
  PARCEIRO_SESSION_HEADER,
} from "./parceiroSessionAuth.js";
import {
  consumirTokenRedefinicao,
  ehEmailRecuperacaoReal,
  enviarEmailRecuperacaoParceiro,
  validarTokenRedefinicao,
} from "./parceiroPasswordReset.js";

function obterBaseUrlParceiro(req) {
  if (process.env.PARCEIRO_PUBLIC_URL) {
    return process.env.PARCEIRO_PUBLIC_URL.replace(/\/+$/, "");
  }
  const origin = req.get("origin") || req.get("referer");
  if (origin) {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch {
      // continua para fallback
    }
  }
  const host = req.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return "http://localhost:8080";
  }
  return "https://parceiro.portalcci.com.br";
}

export function registerCcipayParceiroRoutes(app, helpers) {
  const { getSupabaseAdmin, mensagemSupabaseNaoConfigurado, resolverContextoFromRequest } = helpers;

  function supabaseOr503(res) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });
      return null;
    }
    return supabase;
  }

  app.post("/api/ccipay/parceiro/auth/login", async (req, res) => {
    try {
      const { login, senha } = req.body || {};
      const loginNorm = normalizarLogin(login);
      if (!loginValido(loginNorm) || !senha) {
        return res.status(400).json({ error: "Informe usuário e senha válidos." });
      }

      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const op = await obterOperadorPorLogin(supabase, loginNorm);
      if (!op?.senhaHash || !op.loja?.ativa) {
        return res.status(401).json({ error: "Usuário ou senha inválidos." });
      }

      const ok = await verificarSenha(String(senha), op.senhaHash);
      if (!ok) {
        return res.status(401).json({ error: "Usuário ou senha inválidos." });
      }

      const session = iniciarSessaoParceiro(res, {
        login: loginNorm,
        nome: op.nome,
        lojaId: op.lojaId,
        lojaNome: op.loja.nome,
      });

      return res.json({
        ok: true,
        sessionId: session.id,
        operador: {
          login: loginNorm,
          nome: op.nome,
          lojaId: op.lojaId,
          lojaNome: op.loja.nome,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  app.get("/api/ccipay/parceiro/auth/me", async (req, res) => {
    const ctx = getParceiroFromRequest(req);
    if (!ctx) {
      return res.status(401).json({ error: "Sessão expirada." });
    }
    return res.json({
      ok: true,
      sessionId: getParceiroSessionIdFromRequest(req),
      operador: {
        login: ctx.login,
        nome: ctx.nome,
        lojaId: ctx.lojaId,
        lojaNome: ctx.lojaNome,
      },
    });
  });

  app.post("/api/ccipay/parceiro/auth/logout", async (req, res) => {
    encerrarSessaoParceiro(req, res);
    return res.json({ ok: true });
  });

  /** Solicitação de redefinição de senha iniciada pelo parceiro */
  app.post("/api/ccipay/parceiro/auth/esqueci-senha", async (req, res) => {
    try {
      const { loginOuEmail } = req.body || {};
      const termo = String(loginOuEmail || "").trim();
      if (!termo) {
        return res.status(400).json({ error: "Informe seu usuário ou e-mail cadastrado." });
      }

      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const op = await obterOperadorPorLoginOuEmail(supabase, termo);
      if (!op) {
        return res.status(404).json({
          error: "Nenhum operador parceiro encontrado com este usuário ou e-mail.",
        });
      }

      if (!op.email || !ehEmailRecuperacaoReal(op.email)) {
        return res.status(400).json({
          error: "Este usuário parceiro ainda não possui um e-mail de recuperação cadastrado. Solicite à equipe de TI da Central que cadastre seu e-mail.",
          semEmailReal: true,
        });
      }

      const baseUrl = obterBaseUrlParceiro(req);
      const resultado = await enviarEmailRecuperacaoParceiro({ operador: op, baseUrl });

      return res.json({
        ok: true,
        emailMascarado: resultado.emailMascarado,
        mensagem: `E-mail de redefinição enviado com sucesso para ${resultado.emailMascarado}.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  /** Validação do token de recuperação de senha pelo frontend */
  app.post("/api/ccipay/parceiro/auth/validar-token", (req, res) => {
    const { token } = req.body || {};
    const item = validarTokenRedefinicao(token);
    if (!item) {
      return res.status(400).json({
        ok: false,
        error: "O link de redefinição é inválido ou já expirou. Solicite um novo link.",
      });
    }
    return res.json({
      ok: true,
      login: item.login,
      nome: item.nome,
      lojaNome: item.lojaNome,
    });
  });

  /** Definição da nova senha com token de recuperação */
  app.post("/api/ccipay/parceiro/auth/redefinir-senha", async (req, res) => {
    try {
      const { token, novaSenha } = req.body || {};
      if (!novaSenha || String(novaSenha).length < 6) {
        return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres." });
      }

      const item = consumirTokenRedefinicao(token);
      if (!item) {
        return res.status(400).json({
          error: "O link de redefinição é inválido ou já expirou. Solicite um novo link.",
        });
      }

      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const novoHash = await hashSenha(String(novaSenha));
      await redefinirSenhaOperador(supabase, item.login, novoHash);

      return res.json({
        ok: true,
        mensagem: "Senha alterada com sucesso! Você já pode fazer login com sua nova senha.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  /** Admin TI: Enviar e-mail de redefinição de senha para um operador diretamente pelo painel */
  app.post("/api/ccipay/parceiro/operadores/enviar-email-redefinicao", async (req, res) => {
    try {
      const { login } = req.body || {};
      const ctx = await resolverContextoFromRequest(req);
      if (!ctx.papeis?.includes("admin") && !ctx.papeis?.includes("ccipay_admin")) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const loginNorm = normalizarLogin(login);
      const op = await obterOperadorPorLogin(supabase, loginNorm);
      if (!op) {
        return res.status(404).json({ error: "Operador não encontrado." });
      }

      if (!op.email || !ehEmailRecuperacaoReal(op.email)) {
        return res.status(400).json({
          error: `O operador "${loginNorm}" não possui um e-mail de recuperação válido cadastrado. Atualize o cadastro do operador informando um e-mail.`,
        });
      }

      const baseUrl = obterBaseUrlParceiro(req);
      const resultado = await enviarEmailRecuperacaoParceiro({ operador: op, baseUrl });

      return res.json({
        ok: true,
        email: op.email,
        emailMascarado: resultado.emailMascarado,
        mensagem: `E-mail de redefinição enviado com sucesso para ${op.email}!`,
      });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      return res.status(500).json({ error: e.message });
    }
  });

  /** Admin TI: cadastrar ou editar operador com login + senha + e-mail opcional */
  app.post("/api/ccipay/parceiro/operadores/salvar", async (req, res) => {
    try {
      const { idToken, lojaId, login, senha, nome, email, acao } = req.body || {};
      const ctx = await resolverContextoFromRequest(req);
      if (!ctx.papeis?.includes("admin") && !ctx.papeis?.includes("ccipay_admin")) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const loginNorm = normalizarLogin(login);
      if (!loginValido(loginNorm)) {
        return res.status(400).json({ error: "Login inválido (3–32 caracteres: a-z, 0-9, _, -)." });
      }

      if (acao === "remover") {
        await desvincularOperadorLoja(supabase, lojaId, loginNorm);
      } else {
        let senhaHash = null;
        if (senha) {
          if (String(senha).length < 6) {
            return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
          }
          senhaHash = await hashSenha(String(senha));
        } else {
          // Se não passou senha, verifica se o operador já existe
          const opExistente = await obterOperadorPorLogin(supabase, loginNorm);
          if (!opExistente?.senhaHash) {
            return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres para novos operadores." });
          }
        }

        await vincularOperadorLoja(supabase, lojaId, {
          login: loginNorm,
          senhaHash,
          nome: nome || loginNorm,
          email: email ? String(email).trim() : undefined,
        });
      }

      const usuarios = await listarUsuariosLoja(supabase, lojaId);
      return res.json({ ok: true, usuarios });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      return res.status(500).json({ error: e.message });
    }
  });

  /** Admin TI: redefinir senha do operador diretamente pelo painel */
  app.post("/api/ccipay/parceiro/operadores/redefinir-senha", async (req, res) => {
    try {
      const { idToken, login, senha } = req.body || {};
      const ctx = await resolverContextoFromRequest(req);
      if (!ctx.papeis?.includes("admin") && !ctx.papeis?.includes("ccipay_admin")) {
        return res.status(403).json({ error: "Sem permissão." });
      }
      const supabase = supabaseOr503(res);
      if (!supabase) return;

      const loginNorm = normalizarLogin(login);
      if (!loginValido(loginNorm) || !senha || String(senha).length < 6) {
        return res.status(400).json({ error: "Informe login e senha válidos (mín. 6 caracteres)." });
      }

      await redefinirSenhaOperador(supabase, loginNorm, await hashSenha(String(senha)));
      return res.json({ ok: true });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      return res.status(500).json({ error: e.message });
    }
  });
}

export { getParceiroFromRequest, PARCEIRO_SESSION_HEADER };
