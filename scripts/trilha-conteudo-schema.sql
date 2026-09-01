-- ============================================================
-- Trilha de Conhecimento — Schema de Conteúdo (Supabase)
-- Execute após trilha-schema.sql
-- ============================================================

-- Trilhas cadastradas pelo admin
CREATE TABLE IF NOT EXISTS trilhas_conhecimento (
  id              TEXT PRIMARY KEY,
  titulo          TEXT NOT NULL,
  descricao       TEXT NOT NULL DEFAULT '',
  categoria       TEXT NOT NULL DEFAULT '',
  icone           TEXT NOT NULL DEFAULT '📚',
  cor             TEXT NOT NULL DEFAULT 'from-indigo-500 to-blue-600',
  dificuldade     TEXT NOT NULL DEFAULT 'iniciante',
  setor_restrito  TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  ordem           INTEGER NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Missões de cada trilha
CREATE TABLE IF NOT EXISTS trilhas_missoes (
  id                 TEXT PRIMARY KEY,
  trilha_id          TEXT NOT NULL REFERENCES trilhas_conhecimento(id) ON DELETE CASCADE,
  ordem              INTEGER NOT NULL DEFAULT 1,
  titulo             TEXT NOT NULL,
  descricao          TEXT NOT NULL DEFAULT '',
  conteudo           TEXT NOT NULL DEFAULT '',
  link_externo       TEXT,
  xp_recompensa      INTEGER NOT NULL DEFAULT 5,
  tempo_estimado_min INTEGER NOT NULL DEFAULT 10,
  quiz               JSONB NOT NULL DEFAULT '[]',
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trilhas_missoes_trilha_id
  ON trilhas_missoes (trilha_id, ordem);

-- Auto-timestamp
CREATE OR REPLACE FUNCTION atualizar_trilha_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_trilhas_conhecimento_ts ON trilhas_conhecimento;
CREATE TRIGGER trig_trilhas_conhecimento_ts
  BEFORE UPDATE ON trilhas_conhecimento
  FOR EACH ROW EXECUTE FUNCTION atualizar_trilha_ts();

DROP TRIGGER IF EXISTS trig_trilhas_missoes_ts ON trilhas_missoes;
CREATE TRIGGER trig_trilhas_missoes_ts
  BEFORE UPDATE ON trilhas_missoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_trilha_ts();

-- Desativa RLS para permitir acesso de leitura/escrita com chave de API
ALTER TABLE trilhas_conhecimento DISABLE ROW LEVEL SECURITY;
ALTER TABLE trilhas_missoes DISABLE ROW LEVEL SECURITY;

