-- Painel de senhas - rodar UMA VEZ no Supabase: SQL Editor -> New query -> colar -> Run
-- Cria tabelas, RLS (aberto para testes), funcoes, Realtime, seed slug=demo
-- Ajuste VITE_SCHOOL_SLUG no .env para o mesmo slug da escola (padrao: demo)

create extension if not exists "pgcrypto";

create table if not exists public.painel_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  panel_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_queues (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.painel_schools (id) on delete cascade,
  name text not null,
  prefix text not null,
  description text,
  is_active boolean not null default true,
  priority_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_service_windows (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.painel_schools (id) on delete cascade,
  name text not null,
  number int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_tickets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.painel_schools (id) on delete cascade,
  queue_id uuid not null references public.painel_queues (id) on delete cascade,
  number int not null,
  ticket_code text not null,
  type text not null check (type in ('normal', 'priority')),
  status text not null check (status in ('waiting', 'called', 'attending', 'done', 'skipped')),
  called_at timestamptz,
  attended_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_calls (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.painel_schools (id) on delete cascade,
  ticket_id uuid not null references public.painel_tickets (id) on delete cascade,
  service_window_id uuid not null references public.painel_service_windows (id) on delete restrict,
  attendant_id uuid references auth.users (id) on delete set null,
  called_at timestamptz not null default now()
);

create table if not exists public.painel_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references public.painel_schools (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'attendant')),
  service_window_id uuid references public.painel_service_windows (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_painel_queues_school on public.painel_queues (school_id);
create index if not exists idx_painel_sw_school on public.painel_service_windows (school_id);
create index if not exists idx_painel_tickets_school on public.painel_tickets (school_id);
create index if not exists idx_painel_tickets_queue on public.painel_tickets (queue_id);
create index if not exists idx_painel_calls_school on public.painel_calls (school_id);
create index if not exists idx_painel_profiles_school on public.painel_profiles (school_id);

create or replace function public.get_next_ticket_number (p_queue_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select coalesce(max(number), 0) + 1
    into n
  from public.painel_tickets
  where queue_id = p_queue_id;
  return n;
end;
$$;

create or replace function public.painel_my_profile ()
returns setof public.painel_profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.painel_profiles where id = auth.uid();
$$;

grant execute on function public.get_next_ticket_number (uuid) to anon, authenticated;
grant execute on function public.painel_my_profile () to authenticated;

alter table public.painel_schools enable row level security;
alter table public.painel_queues enable row level security;
alter table public.painel_service_windows enable row level security;
alter table public.painel_tickets enable row level security;
alter table public.painel_calls enable row level security;
alter table public.painel_profiles enable row level security;

drop policy if exists "painel_schools_all" on public.painel_schools;
drop policy if exists "painel_queues_all" on public.painel_queues;
drop policy if exists "painel_service_windows_all" on public.painel_service_windows;
drop policy if exists "painel_tickets_all" on public.painel_tickets;
drop policy if exists "painel_calls_all" on public.painel_calls;
drop policy if exists "painel_profiles_all" on public.painel_profiles;

create policy "painel_schools_all" on public.painel_schools for all to anon, authenticated using (true) with check (true);
create policy "painel_queues_all" on public.painel_queues for all to anon, authenticated using (true) with check (true);
create policy "painel_service_windows_all" on public.painel_service_windows for all to anon, authenticated using (true) with check (true);
create policy "painel_tickets_all" on public.painel_tickets for all to anon, authenticated using (true) with check (true);
create policy "painel_calls_all" on public.painel_calls for all to anon, authenticated using (true) with check (true);
create policy "painel_profiles_all" on public.painel_profiles for all to authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.painel_schools to anon, authenticated;
grant select, insert, update, delete on public.painel_queues to anon, authenticated;
grant select, insert, update, delete on public.painel_service_windows to anon, authenticated;
grant select, insert, update, delete on public.painel_tickets to anon, authenticated;
grant select, insert, update, delete on public.painel_calls to anon, authenticated;
grant select, insert, update, delete on public.painel_profiles to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.painel_tickets;
exception
  when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.painel_calls;
exception
  when duplicate_object then null;
end;
$$;

insert into public.painel_schools (name, slug, panel_message)
values ('Escola (demo)', 'demo', 'Bem-vindo ao painel de senhas')
on conflict (slug) do nothing;

insert into public.painel_queues (school_id, name, prefix, description, is_active, priority_order)
select s.id, 'Atendimento Geral', 'A', 'Atendimento geral', true, 0
from public.painel_schools s
where s.slug = 'demo'
  and not exists (select 1 from public.painel_queues q where q.school_id = s.id and q.name = 'Atendimento Geral');

insert into public.painel_queues (school_id, name, prefix, description, is_active, priority_order)
select s.id, 'Documentos', 'D', 'Documentos', true, 1
from public.painel_schools s
where s.slug = 'demo'
  and not exists (select 1 from public.painel_queues q where q.school_id = s.id and q.name = 'Documentos');

insert into public.painel_service_windows (school_id, name, number, is_active)
select s.id, 'Guiche', 1, true
from public.painel_schools s
where s.slug = 'demo'
  and not exists (select 1 from public.painel_service_windows w where w.school_id = s.id and w.number = 1);
