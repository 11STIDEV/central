-- Migração: adiciona colunas de solicitação de filmagem de câmera à tabela intranet_chamados
-- Rodar no Supabase SQL Editor (projeto Central).
-- É seguro executar múltiplas vezes — usa ADD COLUMN IF NOT EXISTS.

alter table public.intranet_chamados
  add column if not exists solicita_filmagem   boolean  not null default false,
  add column if not exists filmagem_data        text,
  add column if not exists filmagem_hora_inicio text,
  add column if not exists filmagem_hora_fim    text,
  add column if not exists filmagem_termos_aceitos boolean not null default false;

-- Índice para facilitar consultas por chamados de filmagem
create index if not exists intranet_chamados_solicita_filmagem_idx
  on public.intranet_chamados (solicita_filmagem)
  where solicita_filmagem = true;
