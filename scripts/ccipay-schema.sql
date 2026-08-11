-- Advance-CCI — módulo de adiantamentos, vales, bonificações, deduções e loja
-- Rodar no Supabase SQL Editor. Acesso via API Node (service_role).

create extension if not exists "pgcrypto";

-- Funcionários (Google Workspace + vínculo Alterdata)
create table if not exists public.ccipay_funcionarios (
  email text primary key,
  nome text not null default '',
  alterdata_codigo text,
  limite_adiantamento numeric(12, 2) not null default 500.00,
  limite_bonificacao numeric(12, 2),
  pix_padrao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ccipay_funcionarios_ativo_idx on public.ccipay_funcionarios (ativo);

-- Lojas
create table if not exists public.ccipay_lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Operadores vinculados à loja
create table if not exists public.ccipay_loja_usuarios (
  loja_id uuid not null references public.ccipay_lojas (id) on delete cascade,
  email text not null,
  nome text not null default '',
  primary key (loja_id, email)
);

create index if not exists ccipay_loja_usuarios_email_idx on public.ccipay_loja_usuarios (lower(email));

-- Lançadores autorizados (bonificação/dedução)
create table if not exists public.ccipay_lancadores (
  email text primary key,
  nome text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ledger unificado de movimentos
create table if not exists public.ccipay_movimentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('adiantamento', 'vale', 'bonificacao', 'deducao', 'compra_loja')),
  direcao text not null check (direcao in ('credito', 'debito')),
  valor numeric(12, 2) not null check (valor > 0),
  status text not null default 'pendente' check (
    status in ('pendente', 'aprovado', 'negado', 'pago', 'descontado_folha', 'cancelado')
  ),
  competencia text not null,
  funcionario_email text not null references public.ccipay_funcionarios (email),
  funcionario_nome text not null default '',
  loja_id uuid references public.ccipay_lojas (id) on delete set null,
  pedido_id uuid,
  criado_por text not null,
  aprovado_por text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ccipay_movimentos_funcionario_idx on public.ccipay_movimentos (lower(funcionario_email));
create index if not exists ccipay_movimentos_competencia_idx on public.ccipay_movimentos (competencia);
create index if not exists ccipay_movimentos_tipo_idx on public.ccipay_movimentos (tipo);
create index if not exists ccipay_movimentos_status_idx on public.ccipay_movimentos (status);
create index if not exists ccipay_movimentos_loja_idx on public.ccipay_movimentos (loja_id);

-- Catálogo por loja
create table if not exists public.ccipay_catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.ccipay_lojas (id) on delete cascade,
  nome text not null,
  descricao text not null default '',
  preco numeric(12, 2) not null check (preco >= 0),
  estoque integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ccipay_catalogo_loja_idx on public.ccipay_catalogo_itens (loja_id);

-- Pedidos da loja
create table if not exists public.ccipay_pedidos_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.ccipay_lojas (id) on delete restrict,
  funcionario_email text not null,
  funcionario_nome text not null default '',
  status text not null default 'pendente' check (
    status in ('pendente', 'confirmado', 'entregue', 'cancelado')
  ),
  valor_total numeric(12, 2) not null default 0,
  observacao text not null default '',
  confirmado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ccipay_pedidos_loja_loja_idx on public.ccipay_pedidos_loja (loja_id);
create index if not exists ccipay_pedidos_loja_funcionario_idx on public.ccipay_pedidos_loja (lower(funcionario_email));

create table if not exists public.ccipay_pedidos_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.ccipay_pedidos_loja (id) on delete cascade,
  item_id uuid references public.ccipay_catalogo_itens (id) on delete set null,
  nome text not null,
  quantidade integer not null default 1 check (quantidade > 0),
  preco_unitario numeric(12, 2) not null check (preco_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

create index if not exists ccipay_pedidos_itens_pedido_idx on public.ccipay_pedidos_itens (pedido_id);

alter table public.ccipay_movimentos
  drop constraint if exists ccipay_movimentos_pedido_id_fkey;

alter table public.ccipay_movimentos
  add constraint ccipay_movimentos_pedido_id_fkey
  foreign key (pedido_id) references public.ccipay_pedidos_loja (id) on delete set null;

alter table public.ccipay_funcionarios disable row level security;
alter table public.ccipay_lojas disable row level security;
alter table public.ccipay_loja_usuarios disable row level security;
alter table public.ccipay_lancadores disable row level security;
alter table public.ccipay_movimentos disable row level security;
alter table public.ccipay_catalogo_itens disable row level security;
alter table public.ccipay_pedidos_loja disable row level security;
alter table public.ccipay_pedidos_itens disable row level security;

grant select, insert, update, delete on table public.ccipay_funcionarios to service_role;
grant select, insert, update, delete on table public.ccipay_lojas to service_role;
grant select, insert, update, delete on table public.ccipay_loja_usuarios to service_role;
grant select, insert, update, delete on table public.ccipay_lancadores to service_role;
grant select, insert, update, delete on table public.ccipay_movimentos to service_role;
grant select, insert, update, delete on table public.ccipay_catalogo_itens to service_role;
grant select, insert, update, delete on table public.ccipay_pedidos_loja to service_role;
grant select, insert, update, delete on table public.ccipay_pedidos_itens to service_role;
