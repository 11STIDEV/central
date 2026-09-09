-- Schema para Ramais na Central
create table if not exists public.intranet_ramais (
  id text primary key,
  nome text not null,
  ramal text not null,
  setor text not null,
  ordem integer default 0,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- RLS (Row Level Security)
alter table public.intranet_ramais enable row level security;

-- Política de leitura: permitir a todos
create policy "Permitir leitura de ramais para todos"
  on public.intranet_ramais for select
  using (true);

-- Política de escrita: service_role / autenticados
create policy "Permitir inserção e atualização de ramais"
  on public.intranet_ramais for all
  using (true)
  with check (true);
