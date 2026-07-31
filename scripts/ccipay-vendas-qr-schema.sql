-- Advance-CCI — vendas via QR (portal parceiro)
-- Rodar no Supabase SQL Editor após ccipay-schema.sql

create table if not exists public.ccipay_vendas_qr (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  loja_id uuid not null references public.ccipay_lojas (id) on delete restrict,
  valor numeric(12, 2) not null check (valor > 0),
  descricao text not null default '',
  status text not null default 'pendente' check (
    status in ('pendente', 'pago', 'expirado', 'cancelado')
  ),
  funcionario_email text,
  funcionario_nome text,
  movimento_id uuid references public.ccipay_movimentos (id) on delete set null,
  criado_por text not null,
  expires_at timestamptz not null,
  pago_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ccipay_vendas_qr_loja_idx on public.ccipay_vendas_qr (loja_id);
create index if not exists ccipay_vendas_qr_token_idx on public.ccipay_vendas_qr (token);
create index if not exists ccipay_vendas_qr_status_idx on public.ccipay_vendas_qr (status);
create index if not exists ccipay_vendas_qr_created_idx on public.ccipay_vendas_qr (created_at desc);

alter table public.ccipay_vendas_qr disable row level security;

grant select, insert, update, delete on table public.ccipay_vendas_qr to service_role;
