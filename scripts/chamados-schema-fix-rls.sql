-- Corrige erro: "new row violates row-level security policy for table intranet_chamados"
-- Rode no Supabase SQL Editor se a tabela já existir com RLS ativo sem políticas.
--
-- A autorização fica na API Node (Google ID token); a tabela não é acessada pelo front com anon key.

alter table public.intranet_chamados disable row level security;

grant select, insert, update, delete on table public.intranet_chamados to service_role;
