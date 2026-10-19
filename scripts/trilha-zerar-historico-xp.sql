-- ============================================================
-- Trilha de Conhecimento — Zerar Histórico de Trilhas e XP
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Limpa todo o histórico de logs de XP ganho por usuários (ranking semanal e registros de missões)
TRUNCATE TABLE trilha_xp_historico;

-- 2. Zera o progresso acumulado de todos os colaboradores/usuários:
--    - Zera o XP total (0 XP)
--    - Zera o contador de missões completadas (0)
--    - Zera o contador de trilhas completadas (0)
--    - Zera os dias de ofensiva contínua (0)
--    - Limpa a última data de atividade
--    - Limpa o mapa de progresso por trilha (todas as missões e trilhas voltam a ficar não iniciadas)
UPDATE trilha_progresso
SET
  xp_total = 0,
  missoes_completas = 0,
  trilhas_completas = 0,
  ofensiva_dias = 0,
  ultima_atividade = NULL,
  progresso_por_trilha = '{}'::jsonb,
  atualizado_em = now();

-- Confirmação dos resultados
SELECT 
  COUNT(*) AS total_usuarios_resetados,
  COALESCE(SUM(xp_total), 0) AS soma_xp_total,
  COALESCE(SUM(missoes_completas), 0) AS soma_missoes,
  COALESCE(SUM(trilhas_completas), 0) AS soma_trilhas
FROM trilha_progresso;
