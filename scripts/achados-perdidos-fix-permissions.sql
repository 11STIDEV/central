-- Correção rápida: permissões para o frontend (chave anon/publishable).
-- Rode no SQL Editor do projeto Supabase de Achados e Perdidos.

alter table public.lf_items
  add column if not exists registered_by_email text;

alter table public.lf_items
  add column if not exists image_urls text[] not null default '{}';

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

drop policy if exists "lf_items_public_update_on_claim" on public.lf_items;
create policy "lf_items_public_update_on_claim"
on public.lf_items
for update
to anon, authenticated
using (status = 'available')
with check (status = 'claimed_pending');

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

-- Trigger de histórico precisa bypassar RLS (anon não tem insert em lf_item_status_history).
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
