-- Achados e Perdidos: rastreamento de edições de conteúdo do item.
-- Rode no SQL Editor do projeto Supabase de Achados e Perdidos.

alter table public.lf_items
  add column if not exists was_edited boolean not null default false;

alter table public.lf_items
  add column if not exists edited_at timestamptz;

alter table public.lf_items
  add column if not exists edited_by text;
