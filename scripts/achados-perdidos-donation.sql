-- Achados e Perdidos: status de doação após 90 dias sem retirada.
-- Rode no SQL Editor do projeto Supabase de Achados e Perdidos.

alter table public.lf_items
  add column if not exists donated_at timestamptz;

alter table public.lf_items drop constraint if exists lf_items_status_check;
alter table public.lf_items add constraint lf_items_status_check
  check (status in ('available', 'claimed_pending', 'returned', 'archived', 'donation'));
