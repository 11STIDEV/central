-- Achados e Perdidos - rodar no novo projeto Supabase dedicado.
-- Cria tabelas, índices, trigger de updated_at e RLS para:
--   - vitrine pública de itens disponíveis
--   - reivindicação pública de posse
--   - gestão interna de secretaria/admin

create extension if not exists "pgcrypto";

create table if not exists public.lf_items (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  title text not null,
  description text,
  category text,
  found_at timestamptz,
  found_location text,
  image_urls text[] not null default '{}',
  status text not null default 'available' check (status in ('available', 'claimed_pending', 'returned', 'archived')),
  created_by text,
  registered_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lf_items
  add column if not exists image_urls text[] not null default '{}';
alter table public.lf_items
  add column if not exists registered_by_email text;
alter table public.lf_items
  drop column if exists image_url;

create table if not exists public.lf_claim_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lf_items(id) on delete cascade,
  claimant_name text not null,
  claimant_email text,
  claimant_phone text,
  claim_reason text,
  delivery_method text check (delivery_method in ('secretaria', 'sala_aula')),
  student_name text,
  student_class text,
  school_period text check (school_period is null or school_period in ('matutino', 'vespertino')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);

alter table public.lf_claim_requests
  add column if not exists delivery_method text;
alter table public.lf_claim_requests
  add column if not exists student_name text;
alter table public.lf_claim_requests
  add column if not exists student_class text;
alter table public.lf_claim_requests
  add column if not exists school_period text;
alter table public.lf_claim_requests
  alter column claim_reason drop not null;

create table if not exists public.lf_item_status_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lf_items(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lf_items_school_status_created
  on public.lf_items (school_id, status, created_at desc);
create index if not exists idx_lf_claim_requests_item_created
  on public.lf_claim_requests (item_id, created_at desc);
create index if not exists idx_lf_claim_requests_status_created
  on public.lf_claim_requests (status, created_at desc);
create index if not exists idx_lf_history_item_created
  on public.lf_item_status_history (item_id, created_at desc);

create or replace function public.lf_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lf_items_set_updated_at on public.lf_items;
create trigger trg_lf_items_set_updated_at
before update on public.lf_items
for each row
execute function public.lf_set_updated_at();

create or replace function public.lf_log_item_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.lf_item_status_history(item_id, from_status, to_status, changed_by, reason)
    values (new.id, old.status, new.status, coalesce(new.created_by, old.created_by), null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lf_log_item_status_change on public.lf_items;
create trigger trg_lf_log_item_status_change
after update on public.lf_items
for each row
execute function public.lf_log_item_status_change();

alter table public.lf_items enable row level security;
alter table public.lf_claim_requests enable row level security;
alter table public.lf_item_status_history enable row level security;

drop policy if exists "lf_items_public_select_available" on public.lf_items;
create policy "lf_items_public_select_available"
on public.lf_items
for select
to anon, authenticated
using (status = 'available');

drop policy if exists "lf_items_public_select_returned" on public.lf_items;
create policy "lf_items_public_select_returned"
on public.lf_items
for select
to anon, authenticated
using (status = 'returned');

drop policy if exists "lf_items_admin_all" on public.lf_items;
create policy "lf_items_admin_all"
on public.lf_items
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "lf_claim_requests_public_insert" on public.lf_claim_requests;
create policy "lf_claim_requests_public_insert"
on public.lf_claim_requests
for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.lf_items i
    where i.id = item_id
      and i.status = 'available'
  )
);

drop policy if exists "lf_items_public_update_on_claim" on public.lf_items;
create policy "lf_items_public_update_on_claim"
on public.lf_items
for update
to anon, authenticated
using (status = 'available')
with check (status = 'claimed_pending');

drop policy if exists "lf_claim_requests_admin_select_update" on public.lf_claim_requests;
create policy "lf_claim_requests_admin_select_update"
on public.lf_claim_requests
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "lf_item_status_history_admin_select" on public.lf_item_status_history;
create policy "lf_item_status_history_admin_select"
on public.lf_item_status_history
for select
to anon, authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.lf_items to anon, authenticated;
grant insert on public.lf_claim_requests to anon, authenticated;
grant select, insert, update, delete on public.lf_items to anon, authenticated;
grant select, insert, update, delete on public.lf_claim_requests to anon, authenticated;
grant select on public.lf_item_status_history to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('lf-items', 'lf-items', true)
on conflict (id) do nothing;

drop policy if exists "lf_items_bucket_public_read" on storage.objects;
create policy "lf_items_bucket_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'lf-items');

drop policy if exists "lf_items_bucket_auth_upload" on storage.objects;
create policy "lf_items_bucket_auth_upload"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'lf-items');
