-- Avisos da intranet (Central) — rodar no Supabase SQL Editor

-- Acesso via API Node (service_role); não expor escrita direta com anon key.



create extension if not exists "pgcrypto";



create table if not exists public.intranet_avisos (

  id text primary key,

  titulo text not null,

  conteudo text not null default '',

  tipo text not null check (tipo in ('aviso', 'informativo', 'urgente', 'tutorial', 'atualizacao')),

  setor text not null check (setor in (

    'institucional', 'direcao', 'secretaria', 'dp', 'financeiro', 'setape', 'disciplinar',

    'publicidade', 'servicosgerais', 'almoxarifado', 'biblioteca', 'faculdade', 'clat',

    'primeiros-socorros', 'professores-faculdade', 'professores-tecs', 'professores-regular'

  )),

  autor text not null,

  autor_email text not null,

  data_publicacao text not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



create index if not exists intranet_avisos_created_at_idx

  on public.intranet_avisos (created_at desc);



create index if not exists intranet_avisos_setor_idx

  on public.intranet_avisos (setor);



create index if not exists intranet_avisos_tipo_idx

  on public.intranet_avisos (tipo);



alter table public.intranet_avisos disable row level security;



grant select, insert, update, delete on table public.intranet_avisos to service_role;

