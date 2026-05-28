-- Migration: formulário de reivindicação com entrega (secretaria / sala de aula).
-- Rode no SQL Editor do projeto Supabase de Achados e Perdidos.

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
