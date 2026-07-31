-- Advance-CCI — login simples para operadores do portal parceiro
-- Rodar após ccipay-schema.sql e ccipay-vendas-qr-schema.sql

alter table public.ccipay_loja_usuarios
  add column if not exists login text,
  add column if not exists senha_hash text;

create unique index if not exists ccipay_loja_usuarios_login_unique
  on public.ccipay_loja_usuarios (lower(login))
  where login is not null;
