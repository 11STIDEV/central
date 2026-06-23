-- Chamados da intranet (Central) — rodar no Supabase SQL Editor
-- Acesso apenas via API Node (service_role); não expor escrita direta com anon key.

create extension if not exists "pgcrypto";

create table if not exists public.intranet_chamados (
  id text primary key,
  titulo text not null,
  solicitante text not null,
  solicitante_email text not null,
  papel_abertura text not null default 'usuario',
  categoria text not null,
  prioridade text not null check (prioridade in ('baixa', 'media', 'alta')),
  status text not null check (status in ('aberto', 'resolvido')),
  data_abertura text not null,
  descricao text not null default '',
  acompanhamentos jsonb not null default '[]'::jsonb,
  tarefas jsonb not null default '[]'::jsonb,
  solucao jsonb,
  -- Campos de solicitação de filmagem de câmera
  solicita_filmagem        boolean  not null default false,
  filmagem_data            text,
  filmagem_hora_inicio     text,
  filmagem_hora_fim        text,
  filmagem_termos_aceitos  boolean  not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intranet_chamados_solicitante_email_idx
  on public.intranet_chamados (lower(solicitante_email));

create index if not exists intranet_chamados_papel_abertura_idx
  on public.intranet_chamados (papel_abertura);

create index if not exists intranet_chamados_status_idx
  on public.intranet_chamados (status);

create index if not exists intranet_chamados_created_at_idx
  on public.intranet_chamados (created_at desc);

create index if not exists intranet_chamados_solicita_filmagem_idx
  on public.intranet_chamados (solicita_filmagem)
  where solicita_filmagem = true;

-- Sem RLS: leitura/escrita só pela API Node com SUPABASE_SERVICE_ROLE_KEY.
-- (RLS ativo sem políticas bloqueia até conexões que deveriam usar service_role em alguns ambientes.)
alter table public.intranet_chamados disable row level security;

grant select, insert, update, delete on table public.intranet_chamados to service_role;
