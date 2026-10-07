import {
  salvarFuncionariosNoBanco,
  listarFuncionariosDoBanco,
  obterFuncionarioPorEmail,
  obterFuncionarioPorCodigo,
  obterFuncionarioPorCpf,
  extrairResumoColaborador,
  sincronizarAlterdataDireto,
} from "./alterdataStore.js";
import {
  obterStatusMonitor,
  executarVerificacaoESincronizacao,
  listarHistoricoMudancas,
} from "./alterdataMonitor.js";
import { resolverSugestaoEmail } from "./alterdataEmailGenerator.js";
import { getContextoFromSessionRequest } from "./sessionAuth.js";

export function registerAlterdataRoutes(app, getSupabaseClient, options = {}) {
  const { resolverContextoFromRequest } = options;

  // Helper para obter o email do requisitante
  async function extrairEmailRequisitante(req) {
    const fromSession = getContextoFromSessionRequest(req);
    if (fromSession?.email) return fromSession.email;

    if (typeof resolverContextoFromRequest === "function") {
      try {
        const ctx = await resolverContextoFromRequest(req);
        if (ctx?.email) return ctx.email;
      } catch {
        /* sem autenticação */
      }
    }
    return null;
  }

  // Perfil Alterdata do usuário logado (0-10ms via Supabase / cache local)
  app.get("/api/alterdata/funcionario/me", async (req, res) => {
    try {
      const email = await extrairEmailRequisitante(req);
      if (!email) {
        return res.status(401).json({ ok: false, error: "Não autenticado." });
      }

      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      const funcionario = await obterFuncionarioPorEmail(supabase, email);

      if (!funcionario) {
        return res.status(404).json({
          ok: false,
          error: "Colaborador não localizado na base do Alterdata.",
          email,
        });
      }

      const resumo = extrairResumoColaborador(funcionario);
      return res.json({
        ok: true,
        funcionario,
        resumo,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro em /api/alterdata/funcionario/me:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Busca rápida de colaborador por email, CPF ou código
  app.get("/api/alterdata/funcionario/busca", async (req, res) => {
    try {
      const { email, cpf, codigo } = req.query || {};
      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;

      let funcionario = null;
      if (email) {
        funcionario = await obterFuncionarioPorEmail(supabase, String(email));
      } else if (cpf) {
        funcionario = await obterFuncionarioPorCpf(supabase, String(cpf));
      } else if (codigo) {
        funcionario = await obterFuncionarioPorCodigo(supabase, String(codigo));
      } else {
        return res.status(400).json({ ok: false, error: "Informe ?email=, ?cpf= ou ?codigo= para buscar." });
      }

      if (!funcionario) {
        return res.status(404).json({ ok: false, error: "Colaborador não encontrado." });
      }

      const resumo = extrairResumoColaborador(funcionario);
      return res.json({ ok: true, funcionario, resumo });
    } catch (err) {
      console.error("[alterdataRoutes] Erro em /api/alterdata/funcionario/busca:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Lista todos os colaboradores consolidados do banco (com resumo rápido)
  app.get("/api/alterdata/banco-funcionarios", async (req, res) => {
    try {
      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      const colaboradores = await listarFuncionariosDoBanco(supabase);

      return res.json({
        ok: true,
        total: colaboradores.length,
        data: colaboradores,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro ao listar do banco:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Salva lote pré-unificado de colaboradores enviado pelo frontend
  app.post("/api/alterdata/salvar-banco", async (req, res) => {
    try {
      const { funcionarios, apenasAtivos } = req.body || {};

      if (!Array.isArray(funcionarios) || funcionarios.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Envie um array 'funcionarios' com a lista unificada para salvar.",
        });
      }

      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      const resultado = await salvarFuncionariosNoBanco(supabase, funcionarios, apenasAtivos !== false);

      return res.json({
        ok: true,
        mensagem: "Colaboradores unificados salvos no Supabase com sucesso!",
        ...resultado,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro ao salvar no banco:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Dispara sincronização direta do backend com a API do Alterdata
  app.post("/api/alterdata/sincronizar", async (req, res) => {
    try {
      const { token, host, empresaId, apenasAtivos } = req.body || {};
      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;

      const resultado = await sincronizarAlterdataDireto(supabase, {
        token,
        host,
        empresaId,
        apenasAtivos: apenasAtivos !== false,
      });

      return res.json({
        ok: true,
        mensagem: "Sincronização com Alterdata finalizada com sucesso!",
        ...resultado,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro ao sincronizar Alterdata:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- Monitor Periódico de Admissões e Demissões ---

  // Status do monitor (última verificação, próxima verificação e agendamentos)
  app.get("/api/alterdata/monitor/status", (req, res) => {
    try {
      const status = obterStatusMonitor();
      return res.json({ ok: true, status });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Disparo manual para verificar agora
  app.post("/api/alterdata/monitor/verificar-agora", async (req, res) => {
    try {
      const { token, host, empresaId } = req.body || {};
      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;

      const resultado = await executarVerificacaoESincronizacao(supabase, {
        token,
        host,
        empresaId,
      });

      return res.json({
        ok: true,
        mensagem: "Verificação e sincronização concluídas com sucesso!",
        ...resultado,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro em verificar-agora:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Histórico de mudanças (admissões e demissões detectadas)
  app.get("/api/alterdata/monitor/mudancas", async (req, res) => {
    try {
      const limite = Number(req.query?.limite) || 100;
      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      const mudancas = await listarHistoricoMudancas(supabase, limite);

      return res.json({
        ok: true,
        total: mudancas.length,
        mudancas,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro ao listar mudanças:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Sugestões inteligentes de e-mail corporativo com prevenção de colisões
  app.get("/api/alterdata/monitor/sugestoes-email", async (req, res) => {
    try {
      const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      const todosColaboradores = await listarFuncionariosDoBanco(supabase);

      const ativosSemEmail = todosColaboradores.filter(
        (f) => (f.tem_contrato_ativo || f.status_atual === "Ativo") && (!f.email || !f.email.trim())
      );

      const sugestoes = ativosSemEmail.map((f) => {
        const resolucao = resolverSugestaoEmail(f.nome_completo, todosColaboradores);
        return {
          funcionario: {
            chave_unica: f.chave_unica,
            nome_completo: f.nome_completo,
            codigo_contrato_vigente: f.codigo_contrato_vigente,
            cpf: f.cpf,
            admissao_atual: f.admissao_atual || f.primeira_admissao,
            cargo: f.dados_brutos?.attributes?.nomecargo || f.dados_brutos?.cargo || null,
          },
          sugestao: resolucao,
        };
      });

      return res.json({
        ok: true,
        totalSemEmail: ativosSemEmail.length,
        sugestoes,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro ao gerar sugestões de e-mail:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}
