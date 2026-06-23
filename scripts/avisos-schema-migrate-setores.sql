-- Migração: novos slugs de setor em intranet_avisos (rodar se a tabela já existia com valores antigos)

-- Ajuste os UPDATEs abaixo se precisar mapear registros antigos de outra forma.



update public.intranet_avisos set setor = 'dp' where setor = 'dp-financeiro';

update public.intranet_avisos set setor = 'servicosgerais' where setor = 'servicos-gerais';

update public.intranet_avisos set setor = 'professores-faculdade' where setor = 'professores';



alter table public.intranet_avisos drop constraint if exists intranet_avisos_setor_check;



alter table public.intranet_avisos add constraint intranet_avisos_setor_check check (setor in (

  'institucional', 'direcao', 'secretaria', 'dp', 'financeiro', 'setape', 'disciplinar',

  'publicidade', 'servicosgerais', 'almoxarifado', 'biblioteca', 'faculdade', 'clat',

  'primeiros-socorros', 'professores-faculdade', 'professores-tecs', 'professores-regular'

));

