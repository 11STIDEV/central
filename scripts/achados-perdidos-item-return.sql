-- Achados e Perdidos: registro de quem entregou/devolveu o item ao dono.
-- Rode no SQL Editor do projeto Supabase de Achados e Perdidos (vpqvgzjihadnhneznjmu).

alter table public.lf_items
  add column if not exists returned_by_email text;

alter table public.lf_items
  add column if not exists returned_by text;

alter table public.lf_items
  add column if not exists returned_at timestamptz;
