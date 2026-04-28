-- Executar no Supabase SQL Editor (uma vez por ambiente).
-- Adiciona snapshots de atendente nas chamadas para relatórios em modo DB-only.

alter table if exists public.painel_calls
  add column if not exists attendant_name_snapshot text;

alter table if exists public.painel_calls
  add column if not exists attendant_email_snapshot text;

create index if not exists idx_painel_calls_attendant_email_snapshot
  on public.painel_calls (attendant_email_snapshot);
