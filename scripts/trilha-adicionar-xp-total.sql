-- ============================================================
-- Migração: Adicionar coluna xp_total em trilhas_conhecimento
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona a coluna xp_total caso ainda não exista
ALTER TABLE trilhas_conhecimento
  ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 50;

-- 2. Atualiza os valores padrão das 7 trilhas do sistema
UPDATE trilhas_conhecimento SET xp_total = 200 WHERE id = 'missao-visao-cci';
UPDATE trilhas_conhecimento SET xp_total = 150 WHERE id = 'google-drive';
UPDATE trilhas_conhecimento SET xp_total = 200 WHERE id = 'ischolar';
UPDATE trilhas_conhecimento SET xp_total = 200 WHERE id = 'plurall';
UPDATE trilhas_conhecimento SET xp_total = 200 WHERE id = 'taxonomia-bloom';
UPDATE trilhas_conhecimento SET xp_total = 200 WHERE id = 'espacos-escola';
UPDATE trilhas_conhecimento SET xp_total = 220 WHERE id = 'primeiros-socorros';

-- 3. Zera o xp_recompensa nas missões, pois o XP agora é exclusivo da trilha
UPDATE trilhas_missoes SET xp_recompensa = 0;

-- 4. Zera o histórico de XP e ranking semanal de todos os usuários
TRUNCATE TABLE trilha_xp_historico;

-- 5. Zera o histórico de trilhas concluídas e XP de todos os usuários
UPDATE trilha_progresso
SET
  xp_total = 0,
  missoes_completas = 0,
  trilhas_completas = 0,
  ofensiva_dias = 0,
  ultima_atividade = NULL,
  progresso_por_trilha = '{}'::jsonb,
  atualizado_em = now();

