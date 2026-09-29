// ============================================================
// scripts/zerar-trilhas-progresso.js
// Executa o reset completo do histórico de trilhas e XP no Supabase
// Uso: node --env-file=server/.env scripts/zerar-trilhas-progresso.js
// ============================================================

import { createClient } from "@supabase/supabase-js";

const url = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
).trim();

const key = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  ""
).trim();

if (!url || !key) {
  console.error("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontrados no ambiente.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("🚀 Iniciando reset do histórico de trilhas e XP...");

  // 1. Limpa o histórico de XP (ranking semanal e registros de missões)
  const { error: errHist } = await supabase
    .from("trilha_xp_historico")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (errHist) {
    console.error("⚠️ Erro ao limpar trilha_xp_historico:", errHist.message);
  } else {
    console.log("✅ Histórico de XP (trilha_xp_historico) zerado com sucesso.");
  }

  // 2. Reseta o progresso acumulado de todos os usuários
  const { data: rows, error: errProg } = await supabase
    .from("trilha_progresso")
    .update({
      xp_total: 0,
      missoes_completas: 0,
      trilhas_completas: 0,
      ofensiva_dias: 0,
      ultima_atividade: null,
      progresso_por_trilha: {},
      atualizado_em: new Date().toISOString(),
    })
    .neq("email", "")
    .select("email");

  if (errProg) {
    console.error("⚠️ Erro ao resetar trilha_progresso:", errProg.message);
  } else {
    const qtd = rows?.length ?? 0;
    console.log(`✅ Progresso de ${qtd} usuário(s) em trilha_progresso zerado com sucesso!`);
  }

  console.log("\n🎉 Concluído: todo o histórico de trilhas e XP de todos os usuários está zerado!");
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
