-- Tabela de Agendamentos de Massoterapia e Relaxamento (Programa de Bem-Estar CCI)
CREATE TABLE IF NOT EXISTS public.intranet_massoterapia (
    id TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    email TEXT NOT NULL,
    setor TEXT DEFAULT '',
    data TEXT NOT NULL, -- Identificador ou texto da data do evento
    horario TEXT NOT NULL, -- Formato HH:mm
    duracao_minutos INTEGER DEFAULT 15,
    observacoes TEXT DEFAULT '',
    status TEXT DEFAULT 'agendado', -- 'agendado', 'cancelado', 'realizado'
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    cancelado_por TEXT,
    cancelado_em TIMESTAMPTZ
);

-- Tabela de Configuração do Evento Ativo
CREATE TABLE IF NOT EXISTS public.intranet_massoterapia_config (
    id TEXT PRIMARY KEY DEFAULT 'config_principal',
    titulo TEXT DEFAULT 'Programa de Bem-Estar CCI',
    data_evento_texto TEXT DEFAULT 'Data a ser definida pelo DP',
    data_evento_ymd TEXT DEFAULT 'evento-atual',
    descricao TEXT DEFAULT '',
    ativo BOOLEAN DEFAULT TRUE,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_massoterapia_data ON public.intranet_massoterapia (data);
CREATE INDEX IF NOT EXISTS idx_massoterapia_email ON public.intranet_massoterapia (email);

COMMENT ON TABLE public.intranet_massoterapia IS 'Inscrições e agendamentos do Programa de Massoterapia e Bem-Estar CCI';
COMMENT ON TABLE public.intranet_massoterapia_config IS 'Configurações e data ativa do evento de massoterapia gerenciado pelo DP';
