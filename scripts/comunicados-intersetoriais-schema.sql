-- Schema para Tabela de Comunicados Intersetoriais no Supabase

CREATE TABLE IF NOT EXISTS intranet_comunicados_intersetoriais (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    setor_origem TEXT NOT NULL,
    setores_destino JSONB DEFAULT '[]'::jsonb,
    canais_divulgacao JSONB DEFAULT '[]'::jsonb,
    descricao TEXT NOT NULL,
    data_validade DATE,
    anexos_ou_links JSONB DEFAULT '[]'::jsonb,
    imagens JSONB DEFAULT '[]'::jsonb,
    criado_por_email TEXT NOT NULL,
    criado_por_nome TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    cientes JSONB DEFAULT '[]'::jsonb
);

-- Garantir que a coluna 'imagens' exista caso a tabela já tenha sido criada anteriormente:
ALTER TABLE intranet_comunicados_intersetoriais 
ADD COLUMN IF NOT EXISTS imagens JSONB DEFAULT '[]'::jsonb;

-- Índice para ordenação rápida por data de criação:
CREATE INDEX IF NOT EXISTS idx_comunicados_criado_em 
ON intranet_comunicados_intersetoriais(criado_em DESC);
