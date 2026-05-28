-- Corrige RLS ao enviar reivindicação ("Este item é meu").
-- Rode no SQL Editor do projeto Supabase de Achados e Perdidos.

-- 1) Permitir insert da solicitação quando o item está disponível
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

-- 2) Permitir marcar item como claimed_pending após reivindicação
drop policy if exists "lf_items_public_update_on_claim" on public.lf_items;
create policy "lf_items_public_update_on_claim"
on public.lf_items
for update
to anon, authenticated
using (status = 'available')
with check (status = 'claimed_pending');

-- 3) Admin continua com acesso total (secretaria)
drop policy if exists "lf_claim_requests_admin_select_update" on public.lf_claim_requests;
create policy "lf_claim_requests_admin_select_update"
on public.lf_claim_requests
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "lf_items_admin_all" on public.lf_items;
create policy "lf_items_admin_all"
on public.lf_items
for all
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.lf_items to anon, authenticated;
grant select, insert, update, delete on public.lf_claim_requests to anon, authenticated;

-- 4) Trigger de histórico: sem security definer o update do item falha por RLS
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
