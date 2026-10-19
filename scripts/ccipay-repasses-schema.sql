-- Advance-CCI — Controle de repasses financeiros para lojas parceiras
-- Rodar no Supabase SQL Editor

create table if not exists public.ccipay_repasses_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.ccipay_lojas (id) on delete cascade,
  valor numeric(12, 2) not null check (valor > 0),
  competencia text,
  data_pagamento timestamptz not null default now(),
  forma_pagamento text not null default 'pix',
  comprovante text not null default '',
  observacao text not null default '',
  criado_por text not null,
  created_at timestamptz not null default now()
);

create index if not exists ccipay_repasses_loja_loja_idx on public.ccipay_repasses_loja (loja_id);
create index if not exists ccipay_repasses_loja_data_idx on public.ccipay_repasses_loja (data_pagamento desc);

alter table public.ccipay_repasses_loja disable row level security;
grant select, insert, update, delete on table public.ccipay_repasses_loja to service_role;
