-- ============================================================
-- Trilha de Conhecimento — Schema Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Tabela principal: progresso acumulado por usuário
CREATE TABLE IF NOT EXISTS trilha_progresso (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL UNIQUE,
  nome                 TEXT,
  avatar_url           TEXT,
  xp_total             INTEGER NOT NULL DEFAULT 0,
  missoes_completas    INTEGER NOT NULL DEFAULT 0,
  trilhas_completas    INTEGER NOT NULL DEFAULT 0,
  ofensiva_dias        INTEGER NOT NULL DEFAULT 0,
  ultima_atividade     DATE,
  progresso_por_trilha JSONB NOT NULL DEFAULT '{}',
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de XP ganho (base do ranking semanal)
CREATE TABLE IF NOT EXISTS trilha_xp_historico (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  missao_id   TEXT NOT NULL,
  trilha_id   TEXT NOT NULL,
  xp_ganho    INTEGER NOT NULL,
  ganho_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para ranking semanal eficiente
CREATE INDEX IF NOT EXISTS idx_trilha_xp_historico_semana
  ON trilha_xp_historico (ganho_em, email);

-- Evita registrar a mesma missão duas vezes para o mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_trilha_xp_historico_unique
  ON trilha_xp_historico (email, missao_id);

-- Atualiza o campo atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_trilha_progresso_ts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_trilha_progresso_ts ON trilha_progresso;
CREATE TRIGGER trig_trilha_progresso_ts
  BEFORE UPDATE ON trilha_progresso
  FOR EACH ROW EXECUTE FUNCTION atualizar_trilha_progresso_ts();
