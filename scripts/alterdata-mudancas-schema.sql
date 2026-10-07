-- ==============================================================================
-- SCHEMA: intranet_alterdata_mudancas
-- Histórico e auditoria de contratações e demissões detectadas nas verificações
-- periódicas do Alterdata para inclusão/exclusão automática no Supabase.
-- ==============================================================================

create table if not exists public.intranet_alterdata_mudancas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('admissao', 'demissao', 'alteracao_status')),
  funcionario_chave text not null,
  funcionario_nome text not null,
  funcionario_email text,
  funcionario_cpf text,
  funcionario_matricula text,
  cargo text,
  data_evento text,
  detalhes jsonb not null default '{}'::jsonb,
  detectado_em timestamptz not null default now()
);

-- Índices de consulta rápida
create index if not exists idx_alterdata_mudancas_data
  on public.intranet_alterdata_mudancas (detectado_em desc);

create index if not exists idx_alterdata_mudancas_tipo
  on public.intranet_alterdata_mudancas (tipo);

create index if not exists idx_alterdata_mudancas_email
  on public.intranet_alterdata_mudancas (lower(funcionario_email))
  where funcionario_email is not null;

-- Habilitar RLS
alter table public.intranet_alterdata_mudancas enable row level security;

-- Políticas de acesso
drop policy if exists "alterdata_mudancas_select_auth" on public.intranet_alterdata_mudancas;
create policy "alterdata_mudancas_select_auth"
  on public.intranet_alterdata_mudancas
  for select
  to authenticated
  using (true);

drop policy if exists "alterdata_mudancas_select_anon" on public.intranet_alterdata_mudancas;
create policy "alterdata_mudancas_select_anon"
  on public.intranet_alterdata_mudancas
  for select
  to anon
  using (true);

drop policy if exists "alterdata_mudancas_service_role_all" on public.intranet_alterdata_mudancas;
create policy "alterdata_mudancas_service_role_all"
  on public.intranet_alterdata_mudancas
  for all
  to service_role
  using (true)
  with check (true);
