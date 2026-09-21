-- ==============================================================================
-- SCHEMA: intranet_alterdata_funcionarios
-- Centraliza os colaboradores consolidados do Alterdata no Supabase para
-- resolução instantânea (0-10ms) por e-mail no login e integração com módulos
-- internos como Advance-CCI, crachás, atestados e gestão de pessoas.
--
-- Execute no Supabase SQL Editor.
-- ==============================================================================

create table if not exists public.intranet_alterdata_funcionarios (
  chave_unica text primary key,
  id_alterdata_principal text not null default '0',
  cpf text,
  nome_completo text not null default '',
  email text,
  status_atual text not null default 'Ativo',
  tem_contrato_ativo boolean not null default true,
  codigo_contrato_vigente text,
  primeira_admissao text,
  admissao_atual text,
  demissao_mais_recente text,
  total_contratos integer not null default 1,
  historico_contratos jsonb not null default '[]'::jsonb,
  codigos_resumo text not null default '',
  atualizado_em timestamptz not null default now()
);

-- Índices de alta performance para busca e junção
create index if not exists idx_intranet_alterdata_funcionarios_email 
  on public.intranet_alterdata_funcionarios (lower(email)) 
  where email is not null;

create index if not exists idx_intranet_alterdata_funcionarios_cpf 
  on public.intranet_alterdata_funcionarios (cpf) 
  where cpf is not null;

create index if not exists idx_intranet_alterdata_funcionarios_codigo 
  on public.intranet_alterdata_funcionarios (codigo_contrato_vigente) 
  where codigo_contrato_vigente is not null;

create index if not exists idx_intranet_alterdata_funcionarios_status 
  on public.intranet_alterdata_funcionarios (tem_contrato_ativo, status_atual);

create index if not exists idx_intranet_alterdata_funcionarios_nome 
  on public.intranet_alterdata_funcionarios (nome_completo);

-- Habilitar RLS
alter table public.intranet_alterdata_funcionarios enable row level security;

-- Políticas de acesso:
-- 1. Leitura permitida para usuários autenticados da intranet
drop policy if exists "intranet_alterdata_funcionarios_select_auth" on public.intranet_alterdata_funcionarios;
create policy "intranet_alterdata_funcionarios_select_auth"
  on public.intranet_alterdata_funcionarios
  for select
  to authenticated
  using (true);

-- 2. Leitura anônima se necessário para APIs locais ou páginas públicas com controle
drop policy if exists "intranet_alterdata_funcionarios_select_anon" on public.intranet_alterdata_funcionarios;
create policy "intranet_alterdata_funcionarios_select_anon"
  on public.intranet_alterdata_funcionarios
  for select
  to anon
  using (true);

-- 3. Escrita, inserção e atualização apenas para service_role (backend Central)
drop policy if exists "intranet_alterdata_funcionarios_service_role_all" on public.intranet_alterdata_funcionarios;
create policy "intranet_alterdata_funcionarios_service_role_all"
  on public.intranet_alterdata_funcionarios
  for all
  to service_role
  using (true)
  with check (true);
