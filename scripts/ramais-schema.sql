-- ==============================================================================
-- SCHEMA E CARGA INICIAL: RAMAIS TELEFÔNICOS DA CENTRAL
-- ==============================================================================

-- 1. Criação da tabela
create table if not exists public.intranet_ramais (
  id text primary key,
  nome text not null,
  ramal text not null,
  setor text not null,
  ordem integer default 0,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- 2. Habilitação de Segurança por Linha (RLS)
alter table public.intranet_ramais enable row level security;

-- Remove políticas antigas se existirem para evitar duplicidade
drop policy if exists "Permitir leitura de ramais para todos" on public.intranet_ramais;
drop policy if exists "Permitir inserção e atualização de ramais" on public.intranet_ramais;
drop policy if exists "Permitir exclusão de ramais" on public.intranet_ramais;

-- Política de leitura: pública / qualquer usuário autenticado ou anônimo pode consultar
create policy "Permitir leitura de ramais para todos"
  on public.intranet_ramais for select
  using (true);

-- Política de inserção e atualização
create policy "Permitir inserção e atualização de ramais"
  on public.intranet_ramais for insert
  with check (true);

create policy "Permitir atualização de ramais"
  on public.intranet_ramais for update
  using (true)
  with check (true);

-- Política de exclusão
create policy "Permitir exclusão de ramais"
  on public.intranet_ramais for delete
  using (true);

-- 3. Carga Inicial de Todos os Contatos de Ramais
insert into public.intranet_ramais (id, nome, ramal, setor, ordem) values
  ('ramal-1', 'Clayton', '213', 'Direção', 1),
  ('ramal-2', 'Ademilton', '212', 'Direção', 2),
  ('ramal-3', 'Valquíria/Renata', '211', 'Direção', 3),
  ('ramal-4', 'Valquíria', '210', 'Direção', 4),
  ('ramal-5', 'Atendente 1', '203', 'Secretaria de atendimento', 5),
  ('ramal-6', 'Atendente 2', '204', 'Secretaria de atendimento', 6),
  ('ramal-7', 'Atendente 3', '205', 'Secretaria de atendimento', 7),
  ('ramal-8', 'Atendente 4', '209', 'Secretaria de atendimento', 8),
  ('ramal-9', 'Atendente 5', '208', 'Secretaria de atendimento', 9),
  ('ramal-10', 'Katrleen', '207', 'Secretaria de atendimento', 10),
  ('ramal-11', 'Vanessa', '206', 'Secretaria de atendimento', 11),
  ('ramal-12', 'Atendente 1', '240', 'Faculdade CCI', 12),
  ('ramal-13', 'Atendente 2', '241', 'Faculdade CCI', 13),
  ('ramal-14', 'Valéria/Jesiel', '244', 'Faculdade CCI', 14),
  ('ramal-15', 'Giovanna/Renato/Rodrigo', '250', 'NegoCCIe', 15),
  ('ramal-16', 'Leandra', '251', 'NegoCCIe', 16),
  ('ramal-17', 'Michel', '215', 'Coordenação', 17),
  ('ramal-18', 'Stephanie', '216', 'Coordenação', 18),
  ('ramal-19', 'Luzimar', '218', 'Coordenação', 19),
  ('ramal-20', 'Aldeni', '219', 'Coordenação', 20),
  ('ramal-21', 'Andresa', '220', 'Coordenação', 21),
  ('ramal-22', 'Thaisa', '221', 'Coordenação', 22),
  ('ramal-23', 'Mábia', '222', 'Coordenação', 23),
  ('ramal-24', 'Flávia', '223', 'Coordenação', 24),
  ('ramal-25', 'Kátia', '224', 'Coordenação', 25),
  ('ramal-26', 'Isabel', '225', 'Coordenação', 26),
  ('ramal-27', 'Rafael', '226', 'Coordenação', 27),
  ('ramal-28', 'Félix', '227', 'Coordenação', 28),
  ('ramal-29', 'Francianne', '239', 'Coordenação', 29),
  ('ramal-30', 'Francisco', '237', 'Departamento pessoal e financeiro', 30),
  ('ramal-31', 'Mirla', '238', 'Departamento pessoal e financeiro', 31),
  ('ramal-32', 'Michelle', '263', 'Departamento pessoal e financeiro', 32),
  ('ramal-33', 'Leane/Nathalia', '264', 'Departamento pessoal e financeiro', 33),
  ('ramal-34', 'Jediael/Thiago', '232', 'Setape', 34),
  ('ramal-35', 'Hugo/Pedro/Yuri', '235', 'Setape', 35),
  ('ramal-36', 'Ângela', '228', 'Coordenação infantil ao 1º EF', 36),
  ('ramal-37', 'Regina', '229', 'Coordenação infantil ao 1º EF', 37),
  ('ramal-38', 'Ivete', '230', 'Coordenação infantil ao 1º EF', 38),
  ('ramal-39', 'Joyce', '231', 'Enfermaria', 39),
  ('ramal-40', 'Bárbara', '253', 'Publicidade', 40),
  ('ramal-41', 'Sirlene/Edivanete', '233', 'Biblioteca', 41),
  ('ramal-42', 'Fabrício', '246', 'Xerox', 42),
  ('ramal-43', 'Alessandra', '260', 'Clat', 43),
  ('ramal-44', 'Geração saúde', '214', 'Lanchonetes', 44),
  ('ramal-45', 'Delícia de sabor', '248', 'Lanchonetes', 45)
on conflict (id) do update set
  nome = excluded.nome,
  ramal = excluded.ramal,
  setor = excluded.setor,
  ordem = excluded.ordem,
  atualizado_em = now();
