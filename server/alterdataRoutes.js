import {
  salvarFuncionariosNoBanco,
  listarFuncionariosDoBanco,
} from "./alterdataStore.js";

export function registerAlterdataRoutes(app, getSupabaseClient) {
  // Lista colaboradores unificados do nosso banco de dados (rápido, 0ms latency)
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

  // Salva lote de colaboradores unificados no nosso banco de dados
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
        mensagem: "Colaboradores unificados salvos no banco local com sucesso!",
        ...resultado,
      });
    } catch (err) {
      console.error("[alterdataRoutes] Erro ao salvar no banco:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}
