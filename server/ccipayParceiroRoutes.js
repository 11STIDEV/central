import {
  obterOperadorPorLogin,
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

  /** Admin: cadastrar operador com login + senha */
  app.post("/api/ccipay/parceiro/operadores/salvar", async (req, res) => {
    try {
      const { idToken, lojaId, login, senha, nome, acao } = req.body || {};
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
        if (!senha || String(senha).length < 6) {
          return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
        }
        const senhaHash = await hashSenha(String(senha));
        await vincularOperadorLoja(supabase, lojaId, {
          login: loginNorm,
          senhaHash,
          nome: nome || loginNorm,
        });
      }

      const usuarios = await listarUsuariosLoja(supabase, lojaId);
      return res.json({ ok: true, usuarios });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      return res.status(500).json({ error: e.message });
    }
  });

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
