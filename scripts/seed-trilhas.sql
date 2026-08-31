-- ============================================================
-- SEED: Trilhas de Conhecimento e Missões Padrão
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Trilha: Missão, Princípios e Visão do CCI
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('missao-visao-cci', 'Missão, Princípios e Visão do CCI', 'Conheça as instituições do Grupo Educacional CCI, sua missão, valores, visão e estrutura de credenciamento.', 'Institucional', '🏫', 'from-amber-500 to-orange-600', 'iniciante', NULL, true, 1)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('mvc-m1', 'missao-visao-cci', 1, 'Instituições do Grupo CCI', 'Unidades educacionais, endereços e empresas mantenedoras.', '## Instituições de Ensino do Grupo Educacional CCI

### CCI — Centro de Criatividade Infantojuvenil
- Oferta: Educação Infantil ao 5º ano
- Mantenedoras: Soc Educ Braga e Elói Ltda e Soc Educ CCI Sênior Ltda
- Endereço: QN 401 conjunto B lote 03, Samambaia/DF — CEP 72319-502

### Centro Educacional CCI Sênior
- Oferta: 6º ano ao Ensino Médio e cursos técnicos (CED CCI Sênior)
- Mantenedoras: Soc Educ CCI Sênior Ltda e Soc Educ Tecs CCI Eireli
- Endereço: QN 401 conjunto D lotes 1-2, Samambaia/DF — CEP 72319-504

### Faculdade CCI
- Oferta: cursos superiores e pós-graduação
- Mantenedora: Soc Educ Tecs CCI Eireli
- Endereço: QN 401 conjunto D lote 3, Samambaia/DF — CEP 72319-504

### Empresas vinculadas
- **Hotel Fazenda CLAT** — passeios, treinamentos e educação ambiental
- **ClimedCCI** — clínica popular (atividades suspensas)
- A escola técnica TecsCCI é sub-unidade do CCI Sênior; documentos oficiais usam o cabeçalho **Centro Educacional CCI Sênior**', 'https://docs.google.com/document/d/1cOFHBtOWxIjBA7b4yuskJ2XWs4fNjeqHcLBQ1vks6Sk/edit?usp=sharing', 60, 8, '[{"id":"mvc-m1-q1","texto":"Qual instituição oferece da Educação Infantil ao 5º ano?","opcoes":["Faculdade CCI","CCI Sênior","CCI — Centro de Criatividade Infantojuvenil","Escola Técnica isolada"],"respostaCorreta":2,"explicacao":"O CCI (Centro de Criatividade Infantojuvenil) atende da Ed. Infantil ao 5º ano em Samambaia."},{"id":"mvc-m1-q2","texto":"Onde ficam os cursos técnicos vinculados ao CED CCI Sênior?","opcoes":["Na Faculdade CCI","No Centro Educacional CCI Sênior","Apenas no CLAT","Na Educação Infantil"],"respostaCorreta":1,"explicacao":"Os cursos técnicos são ofertados pelo Centro Educacional CCI Sênior."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('mvc-m2', 'missao-visao-cci', 2, 'Missão, Princípios e Visão', 'Propósito institucional e valores que orientam decisões da equipe.', '## Missão do CCI
Oferecer **Educação de Qualidade** através do trabalho voltado para o aperfeiçoamento sociocultural, humano e solidário em ambiente acolhedor e ético.

## Propósito
**Formar agentes da PAZ e do BEM.**

## Princípios
1. Respeito
2. Incentivo à autonomia, à inovação e à criatividade
3. Formação de Agentes da Paz e do Bem, baseada nos valores éticos e cristãos
4. Qualificação constante das equipes
5. Preocupação e ação com a sustentabilidade do Planeta
6. Excelência na formação, valorização da cultura e história da humanidade
7. Eficiência dos resultados

## Valores (ordem de decisão da equipe)
1. Respeito (solidariedade, ética, empatia)
2. Aprendizagem (ciência, pesquisa, conhecimento)
3. Autonomia
4. Excelência
5. Inovação (criatividade, pesquisa, renovação)
6. Eficiência (prosperidade, resultado)

## Visão
Ser reconhecido no DF por sua **excelência nos serviços educacionais**, transformador da comunidade.', NULL, 70, 10, '[{"id":"mvc-m2-q1","texto":"Qual é o Propósito do Grupo Educacional CCI?","opcoes":["Maximizar lucro das mantenedoras","Formar agentes da PAZ e do BEM","Expandir apenas cursos técnicos","Substituir o ensino presencial"],"respostaCorreta":1,"explicacao":"O propósito institucional é formar agentes da Paz e do Bem."},{"id":"mvc-m2-q2","texto":"Qual valor aparece em primeiro lugar na ordem de decisão da equipe?","opcoes":["Eficiência","Inovação","Respeito","Autonomia"],"respostaCorreta":2,"explicacao":"Respeito é o primeiro valor na ordem de decisão, seguido de Aprendizagem, Autonomia, Excelência, Inovação e Eficiência."},{"id":"mvc-m2-q3","texto":"A Visão do CCI aponta para qual reconhecimento?","opcoes":["Ser a maior rede privada do Brasil","Excelência nos serviços educacionais no DF","Liderança em vendas de material didático","Expansão internacional imediata"],"respostaCorreta":1,"explicacao":"A visão é ser reconhecido no DF pela excelência nos serviços educacionais e transformação da comunidade."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('mvc-m3', 'missao-visao-cci', 3, 'Unidades no iScholar e Credenciamentos', 'Como as unidades aparecem no sistema e panorama de atos autorizativos.', '## Unidades no Sistema iScholar
- **CCI** — Ed. Infantil ao 5º ano
- **CCI Sênior** — 6º ano ao Ensino Médio
- **Escola Técnica** — Cursos técnicos
- **Faculdade** — Cursos superiores
- **Pós-Graduação** — Cursos de pós

## Credenciamentos e autorizações (resumo)
As instituições possuem atos de recredenciamento, aprovação de proposta pedagógica, regimento e autorizações de cursos superiores publicados em portarias MEC/SEEDF.

Exemplos relevantes:
- **CCI Infantojuvenil**: recredenciamento com validade documentada; processos de renovação em andamento quando aplicável
- **CCI Sênior**: recredenciamento, proposta pedagógica e regimento aprovados
- **Faculdade CCI**: recredenciamento MEC, autorizações e reconhecimentos de cursos (Pedagogia, Enfermagem, Administração, ADS, Psicologia, Direito, entre outros)

> Consulte o livro de atos e autorizações institucional para datas e portarias vigentes.', NULL, 70, 8, '[{"id":"mvc-m3-q1","texto":"No iScholar, qual unidade corresponde ao Ensino Médio?","opcoes":["CCI (Infantil ao 5º)","CCI Sênior","Pós-Graduação","Biblioteca"],"respostaCorreta":1,"explicacao":"O CCI Sênior abrange do 6º ano ao Ensino Médio no sistema de gestão."},{"id":"mvc-m3-q2","texto":"Por que é importante conhecer os atos de credenciamento?","opcoes":["Apenas para marketing","Para entender a regularidade e oferta legal de cada instituição","Só interessa ao setor de TI","Não tem relevância operacional"],"respostaCorreta":1,"explicacao":"Os atos garantem a base legal da oferta educacional de cada unidade do grupo."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

-- Trilha: Google Drive — Drives Compartilhados
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('google-drive', 'Google Drive — Drives Compartilhados', 'Aprenda a usar os Drives compartilhados do Google Workspace no dia a dia do CCI.', 'Ferramentas', '📁', 'from-blue-500 to-cyan-600', 'iniciante', NULL, true, 2)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('gd-m1', 'google-drive', 1, 'Drives compartilhados vs. Meu Drive', 'Entenda a diferença e quando usar cada um.', '## O que são Drives compartilhados?

No Google Workspace do CCI, os **Drives compartilhados** (Shared Drives) são espaços de arquivos que pertencem à **equipe ou setor**, não a uma pessoa específica.

### Meu Drive (pessoal)
- Arquivos ficam vinculados à **sua conta**
- Se você sair da instituição, o acesso aos arquivos pessoais pode ser perdido pela equipe
- Indicado para rascunhos pessoais e trabalho temporário

### Drive compartilhado (equipe)
- Arquivos pertencem ao **setor/projeto**
- Membros do drive mantêm acesso conforme permissões do grupo
- Indicado para documentos oficiais, modelos, atas, POPs e materiais do CCI

### No CCI usamos drives compartilhados para:
- Documentos pedagógicos e administrativos por setor
- Modelos padronizados (comunicados, planos, relatórios)
- Arquivos que precisam sobreviver à troca de colaboradores', NULL, 50, 6, '[{"id":"gd-m1-q1","texto":"Qual a principal vantagem do Drive compartilhado?","opcoes":["Arquivos pertencem a uma pessoa só","Arquivos pertencem à equipe/setor e permanecem com o grupo","Não permite compartilhamento","Só funciona no celular"],"respostaCorreta":1,"explicacao":"Em drives compartilhados, os arquivos pertencem ao time, não ao indivíduo que os criou."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('gd-m2', 'google-drive', 2, 'Boas práticas no CCI', 'Organização, nomenclatura e permissões.', '## Boas práticas nos Drives compartilhados

### Organização
- Use **pastas por ano, setor ou projeto** (ex.: `2026/Secretaria/Comunicados`)
- Nomeie arquivos de forma clara: `AAAA-MM-DD_assunto_responsavel`
- Evite duplicar o mesmo documento em vários lugares

### Permissões
- **Leitor**: quem só precisa consultar
- **Comentador**: revisão sem editar
- **Colaborador**: edição no dia a dia
- **Gerente de conteúdo**: organiza pastas e permissões (use com parcimônia)

### Segurança institucional
- Não mova arquivos oficiais para o Meu Drive pessoal
- Não compartilhe links publicamente sem autorização
- Dados de alunos e colaboradores exigem cuidado extra (LGPD)

### Colaboração
- Use **comentários** e **sugestões** no Google Docs/Sheets
- Prefira **um documento vivo** a várias cópias por e-mail
- Verifique se está no drive **correto do seu setor** antes de salvar', NULL, 50, 7, '[{"id":"gd-m2-q1","texto":"Onde devem ficar documentos oficiais do setor?","opcoes":["No Meu Drive pessoal","No Drive compartilhado do setor","No e-mail","Na área de trabalho do PC"],"respostaCorreta":1,"explicacao":"Documentos oficiais devem ficar no drive compartilhado do setor para continuidade e governança."},{"id":"gd-m2-q2","texto":"Qual permissão permite editar arquivos no dia a dia?","opcoes":["Leitor","Comentador","Colaborador","Nenhuma"],"respostaCorreta":2,"explicacao":"Colaborador permite editar; leitor só visualiza e comentador só comenta."},{"id":"gd-m2-q3","texto":"Por que evitar várias cópias do mesmo arquivo?","opcoes":["Ocupa menos espaço visual","Gera versões conflitantes e perda de rastreabilidade","É mais rápido para o Google","Não há problema em duplicar"],"respostaCorreta":1,"explicacao":"Múltiplas cópias geram confusão sobre qual é a versão oficial e dificultam o trabalho em equipe."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

-- Trilha: iScholar — Gestão Escolar
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('ischolar', 'iScholar — Gestão Escolar', 'Conheça o sistema de gestão usado no CCI para rotinas acadêmicas e administrativas.', 'Sistemas', '🎓', 'from-indigo-500 to-violet-600', 'intermediario', NULL, true, 3)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('is-m1', 'ischolar', 1, 'Introdução ao iScholar', 'O que é o sistema e como as unidades do CCI estão organizadas.', '## O que é o iScholar?

O **iScholar** é o sistema de **gestão escolar** utilizado pelo Grupo Educacional CCI para centralizar rotinas acadêmicas, administrativas e financeiras.

### Unidades no sistema
- **CCI** — Educação Infantil ao 5º ano
- **CCI Sênior** — 6º ano ao Ensino Médio
- **Escola Técnica** — Cursos técnicos
- **Faculdade** — Graduação
- **Pós-Graduação**

### Central de Ajuda
A documentação oficial está em [ajuda.ischolar.com.br](https://ajuda.ischolar.com.br/pt-BR/), com artigos por área: Administração, Coordenação, Secretaria, Financeiro, Catraca, Biblioteca e mais.

### Por que dominar o iScholar?
- Registros oficiais de alunos, turmas e ocorrências
- Comunicação e histórico padronizado
- Integração entre setores (secretaria, coordenação, financeiro)', 'https://ajuda.ischolar.com.br/pt-BR/', 60, 7, '[{"id":"is-m1-q1","texto":"O iScholar é usado principalmente para:","opcoes":["Jogos educativos","Gestão escolar integrada","Edição de vídeos","Redes sociais"],"respostaCorreta":1,"explicacao":"O iScholar é o sistema de gestão escolar do CCI."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('is-m2', 'ischolar', 2, 'Módulos por setor', 'Secretaria, Coordenação, Financeiro e demais áreas.', '## Principais módulos (Central de Ajuda)

### Secretaria
Matrículas, documentos, cadastros, rotinas de atendimento a famílias e registros acadêmicos.

### Coordenação
Acompanhamento pedagógico, turmas, planejamentos e apoio à gestão de aprendizagem.

### Financeiro
Mensalidades, boletos, inadimplência e rotinas de cobrança (conforme perfil de acesso).

### Administração
Configurações gerais, usuários, parâmetros e governança do sistema.

### Outros módulos
- **Catraca** — controle de acesso
- **Biblioteca** — empréstimos e acervo
- **Mensagens** — comunicação institucional

> Cada colaborador enxerga apenas o que seu perfil permite. Em dúvida, consulte a TI ou o responsável do setor.', NULL, 70, 10, '[{"id":"is-m2-q1","texto":"Qual módulo costuma tratar de matrículas e documentos de alunos?","opcoes":["Catraca","Secretaria","Biblioteca","Publicidade"],"respostaCorreta":1,"explicacao":"A Secretaria concentra rotinas de matrícula, cadastro e documentação."},{"id":"is-m2-q2","texto":"Onde encontrar tutoriais oficiais do sistema?","opcoes":["Somente no WhatsApp","Na Central de Ajuda iScholar (ajuda.ischolar.com.br)","Apenas em vídeos do YouTube aleatórios","Não há documentação"],"respostaCorreta":1,"explicacao":"A Central de Ajuda oficial reúne artigos por módulo e perfil de uso."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('is-m3', 'ischolar', 3, 'Registros e boas práticas', 'Como registrar ocorrências e manter dados confiáveis.', '## Boas práticas no iScholar

### Registros oficiais
- Primeiros socorros, ocorrências disciplinares e comunicados relevantes devem ser registrados no sistema quando aplicável
- Descreva **o que aconteceu**, **quando**, **quem foi envolvido** e **ações tomadas**
- Alinhe o registro com mensagens enviadas às famílias (ex.: Trusty)

### Qualidade dos dados
- Confira unidade e turma corretas antes de salvar
- Evite abreviações que ninguém mais entenderá
- Não compartilhe login — cada colaborador usa sua conta Google institucional

### Suporte
- Dúvidas de processo: responsável do setor
- Dúvidas técnicas: equipe de TI (Setape)
- Tutoriais: Central de Ajuda iScholar', NULL, 70, 8, '[{"id":"is-m3-q1","texto":"Um registro de ocorrência no iScholar deve ser:","opcoes":["Vago e sem data","Claro, datado e alinhado aos fatos","Opcional em qualquer caso","Feito só por e-mail"],"respostaCorreta":1,"explicacao":"Registros oficiais precisam ser claros, datados e coerentes com o que foi comunicado."},{"id":"is-m3-q2","texto":"Quem deve usar a conta no iScholar?","opcoes":["Qualquer pessoa com a senha compartilhada","Cada colaborador com seu próprio acesso institucional","Apenas diretores","Não é necessário login"],"respostaCorreta":1,"explicacao":"Cada colaborador deve usar seu próprio acesso para rastreabilidade e segurança."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

-- Trilha: Plurall — Ambiente Virtual
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('plurall', 'Plurall — Ambiente Virtual', 'Plataforma digital para professores e coordenadores publicarem conteúdos e atividades online.', 'Pedagógico', '💻', 'from-emerald-500 to-teal-600', 'intermediario', NULL, true, 4)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('pl-m1', 'plurall', 1, 'O que é o Plurall?', 'Plataforma, público e papel do Maestro.', '## Plurall — plataforma digital educacional

O [Plurall](https://www.plurall.net/) é a plataforma da **SOMOS Educação** que conecta professores, alunos, gestores e famílias. No CCI, professores e coordenadores usam o Plurall como **Ambiente Virtual de Aprendizagem** para postar conteúdos e atividades online.

### Para quem é?
- Professores de todas as disciplinas (inclusive sem material nativo no Plurall)
- Coordenadores e gestores pedagógicos
- Alunos e famílias (conforme perfil)

### Maestro — módulo do professor
- Criar e enviar **atividades** e materiais
- Usar **banco de questões**
- Acompanhar **relatórios** de desempenho e participação
- Corrigir questões dissertativas

Professores de música, informática, teatro e outras disciplinas sem material próprio também podem usar o Maestro para aulas digitais quando vinculados à escola parceira.', 'https://ajuda.plurall.net/hc/pt-br', 60, 8, '[{"id":"pl-m1-q1","texto":"O Plurall é usado no CCI principalmente para:","opcoes":["Folha de pagamento","Ensino-aprendizagem digital (conteúdos e atividades)","Controle de catraca","Gestão de estoque do almoxarifado"],"respostaCorreta":1,"explicacao":"O Plurall é o ambiente virtual para conteúdos, atividades e acompanhamento pedagógico."},{"id":"pl-m1-q2","texto":"Qual módulo o professor usa para criar e enviar atividades?","opcoes":["Trusty","Maestro","iScholar","Google Drive"],"respostaCorreta":1,"explicacao":"O Maestro é o módulo pedagógico do professor no Plurall."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('pl-m2', 'plurall', 2, 'Atividades e correção no Maestro', 'Publicar, corrigir dissertativas e acompanhar turmas.', '## Atividades no Maestro

### Tipos de questões
- **Objetivas**: corrigidas automaticamente pelo gabarito após o envio do aluno
- **Dissertativas**: exigem correção manual do professor

### Corrigir atividades — dois caminhos

**1. Correção Pendente**
- Maestro → Correção pendente
- Expanda turma/disciplina → ícone de lápis
- Atribua % de acerto, comente e envie

**2. Minhas Turmas**
- Maestro → Minhas turmas
- Filtre ano/série, turma e disciplina
- Abra a atividade e a questão → corrija por aluno

### Atenção
A opção **Selecionar Todos** aplica a mesma correção a todos — desmarque para corrigir **aluno a aluno**.

### Assistente Inteligente (Plu)
Coordenadores e professores podem gerar **planos de aula** com o assistente, escolhendo material, capítulo, duração e tema.', 'https://ajuda.plurall.net/hc/pt-br/articles/29138945506331-Como-corrigir-as-atividades-dos-alunos-no-Maestro', 70, 12, '[{"id":"pl-m2-q1","texto":"Questões dissertativas no Maestro são corrigidas:","opcoes":["Automaticamente pelo sistema","Pelo professor manualmente","Pelos pais","Pela secretaria"],"respostaCorreta":1,"explicacao":"Dissertativas dependem da correção do professor; objetivas usam gabarito automático."},{"id":"pl-m2-q2","texto":"Para corrigir um aluno específico, você deve:","opcoes":["Manter ''Selecionar Todos'' marcado","Desmarcar ''Selecionar Todos'' e corrigir individualmente","Não é possível corrigir individualmente","Enviar por e-mail externo"],"respostaCorreta":1,"explicacao":"Desmarque ''Selecionar Todos'' para atribuir nota e feedback por aluno."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('pl-m3', 'plurall', 3, 'Quiz final — Plurall no CCI', 'Consolide o que aprendeu sobre o ambiente virtual.', '## Resumo para o dia a dia

1. Acesse o Plurall pelo navegador com seu perfil de professor/coordenador
2. Use o **Maestro** para criar, enviar e corrigir atividades
3. Acompanhe participação e desempenho nos relatórios
4. Consulte a [Central de Ajuda do Plurall](https://ajuda.plurall.net/hc/pt-br) para tutoriais atualizados
5. Em dúvidas técnicas, acione a TI ou suporte indicado pela coordenação', NULL, 70, 5, '[{"id":"pl-m3-q1","texto":"Onde o professor encontra tutoriais oficiais do Plurall?","opcoes":["ajuda.plurall.net","Apenas no Facebook","No iScholar","Não existem tutoriais"],"respostaCorreta":0,"explicacao":"A Central de Ajuda em ajuda.plurall.net reúne artigos e passo a passo."},{"id":"pl-m3-q2","texto":"Professor de informática sem material Plurall nativo pode usar a plataforma?","opcoes":["Não, nunca","Sim, via Maestro e Biblioteca de Conteúdos, se vinculado à escola parceira","Só alunos podem acessar","Apenas diretores"],"respostaCorreta":1,"explicacao":"Professores de disciplinas sem material nativo podem criar atividades e usar o Maestro normalmente."},{"id":"pl-m3-q3","texto":"Relatórios de desempenho ficam disponíveis no:","opcoes":["Maestro","Almoxarifado","Catraca física","Portal de vales"],"respostaCorreta":0,"explicacao":"O Maestro oferece relatórios de participação e desempenho nas atividades."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

-- Trilha: Taxonomia de Bloom no CCI
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('taxonomia-bloom', 'Taxonomia de Bloom no CCI', 'Estrutura pedagógica que orienta planejamentos e operações mentais nas aulas.', 'Pedagógico', '🧠', 'from-purple-500 to-fuchsia-600', 'intermediario', NULL, true, 5)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('tb-m1', 'taxonomia-bloom', 1, 'Fundamentos e níveis iniciais', 'Lembrança, Entendimento e Aplicação.', '## Taxonomias no Grupo Educacional CCI

O CCI orienta docentes a planejarem aulas com **intencionalidade**: partir do processo mental esperado do estudante.

### Níveis cognitivos (visão geral)
1. **Lembrança** — recuperar informação da memória
2. **Entendimento** — dar significado ao conteúdo
3. **Aplicação** — usar procedimentos em situações
4. **Análise** — relacionar partes e o todo
5. **Avaliação** — julgar com critérios
6. **Elaboração de Propostas** — criar algo novo
7. **Intercessão** — articular argumentos, mediar, intervir

### 1. Lembrança
Exemplos: reconhecer, identificar, responder V/F, citar, reproduzir fórmulas.

### 2. Entendimento
Exemplos: interpretar, exemplificar, classificar, resumir, comparar, explicar.

### 3. Aplicação
Exemplos: executar procedimentos (cálculos, experimentos, revisões de texto, orçamentos).

> Planos de aula devem explicitar **qual operação mental** se espera provocar.', 'https://docs.google.com/document/d/1VETws3Rc8XvlnRCEHR7aK40MxGDNUNNaKZcwtwHTSgU/edit?usp=sharing', 65, 10, '[{"id":"tb-m1-q1","texto":"O nível ''Lembrança'' envolve principalmente:","opcoes":["Criar projetos inéditos","Recuperar informação da memória","Mediar conflitos","Julgar com critérios externos"],"respostaCorreta":1,"explicacao":"Lembrança é buscar e trazer informação da memória (reconhecer, citar, reproduzir)."},{"id":"tb-m1-q2","texto":"Interpretar um enunciado e convertê-lo em equação é exemplo de:","opcoes":["Lembrança","Entendimento","Intercessão","Avaliação"],"respostaCorreta":1,"explicacao":"Interpretar e dar significado ao material é característica do nível Entendimento."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('tb-m2', 'taxonomia-bloom', 2, 'Níveis avançados e Intercessão', 'Análise, Avaliação, Elaboração e Intercessão — foco CCI.', '### 4. Análise
Diferenciar informações relevantes, organizar dados, atribuir motivações.

### 5. Avaliação
Verificar coerência, criticar com rubricas, escolher melhores métodos.

### 6. Elaboração de Propostas
Gerar hipóteses, planejar projetos, produzir textos, construir soluções — propor inovações a partir de problemas.

### 7. Intercessão (ênfase CCI)
Articula argumentos para **mediar** conflitos, **intervir** em crises, **apaziguar** e exercer **diplomacia** (negociar, representar, defender).

## Por que provocar tarefas mais complexas?
O mercado valoriza pensamento analítico, criatividade, resiliência, liderança, alfabetização tecnológica e aprendizado contínuo. Aulas que param na lembrança não preparam para essas demandas.

**Meta pedagógica CCI:** provocar operações mentais cada vez mais complexas, incluindo propor e interceder.', NULL, 65, 12, '[{"id":"tb-m2-q1","texto":"Propor inovações a partir de um problema é nível de:","opcoes":["Lembrança","Elaboração de Propostas","Entendimento","Aplicação"],"respostaCorreta":1,"explicacao":"Elaboração de Propostas envolve gerar, planejar e produzir soluções novas."},{"id":"tb-m2-q2","texto":"Mediar conflitos entre estudantes relaciona-se ao nível:","opcoes":["Intercessão","Lembrança","Aplicação","Entendimento"],"respostaCorreta":0,"explicacao":"Intercessão inclui mediar, intervir, apaziguar e argumentar diplomaticamente."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('tb-m3', 'taxonomia-bloom', 3, 'Quiz final — Bloom na prática', 'Aplique a taxonomia ao planejar aulas.', '## Checklist do planejamento

- [ ] Defini qual operação mental quero provocar
- [ ] A atividade exige mais que memorizar?
- [ ] Há momento de análise, avaliação ou criação?
- [ ] Promovo intercessão (debate, mediação, defesa de ideias)?
- [ ] Alinho com a Proposta Pedagógica do CCI', NULL, 70, 6, '[{"id":"tb-m3-q1","texto":"Corrigir trabalhos com rubrica e julgar qualidade é nível de:","opcoes":["Avaliação","Lembrança","Entendimento","Intercessão"],"respostaCorreta":0,"explicacao":"Avaliação envolve julgamentos baseados em critérios e padrões."},{"id":"tb-m3-q2","texto":"No CCI, os planos de aula devem começar por:","opcoes":["A quantidade de cópias no xerox","A intenção do processo mental esperado do estudante","O horário do intervalo apenas","A cor do material didático"],"respostaCorreta":1,"explicacao":"A taxonomia orienta planejar a partir da operação mental que se deseja provocar."},{"id":"tb-m3-q3","texto":"Separar dados relevantes de irrelevantes em um problema é:","opcoes":["Análise","Lembrança","Intercessão","Entendimento"],"respostaCorreta":0,"explicacao":"Diferenciar e organizar informações faz parte do nível Análise."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

-- Trilha: Espaços da Escola — O que acontece aqui?
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('espacos-escola', 'Espaços da Escola — O que acontece aqui?', 'Conheça os ambientes pedagógicos e administrativos do campus e sua finalidade.', 'Institucional', '🏛️', 'from-rose-500 to-orange-500', 'iniciante', NULL, true, 6)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('ee-m1', 'espacos-escola', 1, 'Propósito e espaços pedagógicos', 'Parques, salas de aula, biblioteca e laboratórios.', '## O que acontece aqui?

Documento institucional aplicado nas paredes dos espaços para que todos saibam a **proposta de cada ambiente**.

### Parque / Quadras
Brincadeiras, esportes (futsal, vôlei, basquete), socialização, disciplina, respeito e saúde física.

### Piscina Infantil / Aqua
Coordenação motora, natação, regras de convivência, concentração e fortalecimento físico.

### Salas de Aula (Ed. Infantil, 1º–5º, 6º–EM)
Aulas ativas, taxonomias, formação de **agentes da Paz e do Bem**, projetos, avaliações e convivência.

### Biblioteca e Brinquedoteca
Leitura, pesquisa, empréstimos, jogos educativos e estimulação lúdica.

### Laboratórios (Informática, Biologia, Química/Física, Saúde)
Experimentos, práticas tecnológicas e científicas alinhadas à proposta pedagógica.

### Salas especiais
Robótica, Maker, Música, Dança, Estimulação, Oratório — desenvolvimento de habilidades específicas.', 'https://docs.google.com/document/d/16n93eG1RrAITvCsJDeMrR3tbEbVtIi_8Evn9d7wEK-A/edit?usp=sharing', 65, 10, '[{"id":"ee-m1-q1","texto":"Qual o objetivo do documento ''O que acontece aqui?''","opcoes":["Decorar paredes sem função","Deixar transparente a proposta de cada espaço","Substituir o regimento escolar","Listar apenas telefones"],"respostaCorreta":1,"explicacao":"O documento comunica a todos o que se propõe em cada ambiente escolar."},{"id":"ee-m1-q2","texto":"Nas salas de aula, os professores são descritos como:","opcoes":["Apenas aplicadores de provas","Formadores de agentes da Paz e do Bem","Somente vigilantes","Técnicos de TI"],"respostaCorreta":1,"explicacao":"O documento enfatiza a formação de agentes da Paz e do Bem nas salas de aula."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('ee-m2', 'espacos-escola', 2, 'Coordenação, SOE e espaços administrativos', 'Orientação educacional, direção, secretaria e SETAPE.', '### Coordenação
Atende pais, orienta professores e alunos, supervisiona planejamentos, acompanha aprendizagem e eventos.

### SOE — Serviço de Orientação Educacional
Integração família-escola, estudos de desempenho, atendimento individual (incluindo NEE).

### Direção e Secretaria Acadêmica
Gestão institucional, documentos oficiais, matrículas e interfaces com famílias.

### SETAPE
Suporte tecnológico e ferramentas digitais da instituição.

### Outros espaços úteis
- **Lanchonetes** (Geração Saúde, Delíccia de Sabor)
- **Pátios temáticos** (Artes, Matemática, Geografia, Anjos, Aquário, Heróis)
- **Ginásio**, **Copiadora/Papelaria**, **Sala de Troféus**
- **DP/Financeiro**, **Serviços Gerais**, **Ouvidoria**, **Publicidade**', NULL, 65, 10, '[{"id":"ee-m2-q1","texto":"O SOE atua especialmente em:","opcoes":["Manutenção de ar-condicionado","Orientação educacional e integração com famílias","Vendas da lanchonete","Programação de robótica apenas"],"respostaCorreta":1,"explicacao":"O SOE promove integração, acompanhamento e atendimento educacional individualizado."},{"id":"ee-m2-q2","texto":"Suporte de tecnologia da escola concentra-se no setor:","opcoes":["Publicidade","SETAPE","Biblioteca","Piscina"],"respostaCorreta":1,"explicacao":"O SETAPE é o espaço de tecnologia e apoio digital institucional."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('ee-m3', 'espacos-escola', 3, 'Quiz final — circulando no campus', 'Identifique espaços e responsabilidades.', '## Dica para novos colaboradores

Ao circular pelo campus, observe as placas **"O que acontece aqui?"**. Elas explicam a intenção pedagógica ou administrativa de cada ambiente — útil para orientar alunos, famílias e visitantes.', NULL, 70, 5, '[{"id":"ee-m3-q1","texto":"Sala Maker e Robótica estão relacionadas a:","opcoes":["Apenas lazer sem objetivo","Criatividade, tecnologia e projetos práticos","Somente arquivo morto","Exclusivamente financeiro"],"respostaCorreta":1,"explicacao":"Esses espaços focam inovação, tecnologia e aprendizagem prática."},{"id":"ee-m3-q2","texto":"A Coordenação Disciplinar envolve equipe de:","opcoes":["Cozinha apenas","Segurança, portaria e bedéis","Somente professores de música","Apenas biblioteca"],"respostaCorreta":1,"explicacao":"A coordenação disciplinar trabalha com segurança externa, portaria e bedéis de corredores."},{"id":"ee-m3-q3","texto":"O Pátio das Artes e Mezanino costumam ser usados para:","opcoes":["Depósito de lixo","Atividades artísticas e multipropósito","Aulas só de matemática","Garagem de ônibus"],"respostaCorreta":1,"explicacao":"Pátio das Artes/Mezanino/Pátio Multiuso são espaços de expressão e atividades coletivas."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

-- Trilha: POP — Sala de Primeiros Socorros
INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)
VALUES ('primeiros-socorros', 'POP — Sala de Primeiros Socorros', 'Procedimentos operacionais da sala de primeiros atendimentos de saúde.', 'Operacional', '🩺', 'from-red-500 to-rose-600', 'intermediario', NULL, true, 7)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  dificuldade = EXCLUDED.dificuldade,
  setor_restrito = EXCLUDED.setor_restrito,
  ordem = EXCLUDED.ordem;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('ps-m1', 'primeiros-socorros', 1, 'Materiais e rotina diária', 'Estoque semanal e higiene do ambiente.', '## POP — Sala de Primeiros Socorros

### Materiais (levantamento semanal)
Termômetro, esfigmomanômetro, esparadrapo, gaze, algodão, luvas, máscaras, álcool 70%, antisséptico, tesoura de ponta romba, compressas frias/quentes, analgésicos de venda livre (ex.: paracetamol), antialérgicos, pomada, soro fisiológico, gelo no frigobar exclusivo, sal, açúcar, absorvente, entre outros.

### Rotina diária
1. Ambiente **limpo e organizado** (móveis, macas, armários)
2. **Frigobar**: repor gelo, limpar prateleiras, descongelar
3. Lavar utensílios (vasilha de soro, talheres)
4. **Preparar soro** no início do dia e descartar no final
5. Manter ambiente **arejado**', 'https://docs.google.com/document/d/1WO5_a1XbkNgTfqismql5ZHZtV2dnwGG_PIql5VaeESw/edit?usp=sharing', 70, 10, '[{"id":"ps-m1-q1","texto":"O soro preparado na sala deve ser:","opcoes":["Reutilizado por uma semana","Preparado no início do dia e descartado no final","Deixado sem higiene","Guardado no Meu Drive"],"respostaCorreta":1,"explicacao":"O POP determina preparo diário e descarte no fim do dia."},{"id":"ps-m1-q2","texto":"Com que frequência revisar materiais essenciais?","opcoes":["Nunca","Semanalmente","A cada 5 anos","Só quando acabar tudo"],"respostaCorreta":1,"explicacao":"O levantamento de materiais é feito semanalmente."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('ps-m2', 'primeiros-socorros', 2, 'Triagem e comunicação com famílias', 'Atendimento, Trusty e modelos de mensagem.', '## Atendimento e comunicação

### Triagem
Receber alunos doentes ou feridos, avaliar gravidade e prestar cuidados básicos.

### Comunicação — regra geral
**Em todas as situações os pais precisam ser informados** (Trusty e/ou ligação).

| Situação | Ação |
|----------|------|
| **Febre** | Ligar + Trusty; orientar busca do estudante |
| **Queixas leves** (dor de cabeça, arranhão sem gravidade) | Trusty informando que está bem |
| **Machucado com marca** | Trusty sem expor nome de outro colega |
| **Grave** (corte profundo, engasgo, fratura) | Cuidar do aluno → SAMU 192 se necessário → coordenação + família |

### Registro
Manter registros no **iScholar** com detalhamento e mensagem enviada. Manter **Trusty** aberto no computador.', NULL, 75, 12, '[{"id":"ps-m2-q1","texto":"Em caso de febre, além do Trusty, deve-se:","opcoes":["Não avisar os pais","Ligar para os pais","Apenas enviar e-mail pessoal","Esperar uma semana"],"respostaCorreta":1,"explicacao":"Febre exige ligação e mensagem Trusty, recomendando busca do estudante."},{"id":"ps-m2-q2","texto":"Onde registrar o atendimento oficialmente?","opcoes":["Somente em papel solto","No iScholar, com detalhes e comunicação","No Instagram","Não registrar"],"respostaCorreta":1,"explicacao":"O POP exige registro preciso no iScholar e uso do Trusty para comunicação."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;

INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)
VALUES ('ps-m3', 'primeiros-socorros', 3, 'Emergências e medicação', 'SAMU, hospital, administração de medicamentos.', '## Emergências graves

1. **Priorize o estudante**
2. Dúvida, fratura, inconsciência → **SAMU 192**
3. Comunique coordenação e família
4. Verifique plano de saúde na pasta do aluno
5. Se for ao hospital: Uber pela Direção, profissional da sala acompanha até chegada da família

## Medicação de alunos

1. Exigir prescrição médica ou registro escrito do responsável
2. Conferir validade e adequação à idade
3. Registrar no **iScholar** e avisar pais via **Trusty** (horário, dose)
4. Guardar medicamento na **enfermaria** — não deixar com alunos menores na sala

> Segurança e bem-estar do aluno são sempre a prioridade.', NULL, 75, 10, '[{"id":"ps-m3-q1","texto":"Em emergência grave com dúvida, ligue primeiro para:","opcoes":["Recepção de hotel","SAMU 192","Pizzaria","Suporte do Plurall"],"respostaCorreta":1,"explicacao":"O POP orienta ligar imediatamente ao SAMU (192) quando necessário."},{"id":"ps-m3-q2","texto":"Medicamento enviado pela família deve ficar:","opcoes":["Na mochila do aluno na sala","Armazenado com segurança na enfermaria","Na lanchonete","No carro do professor"],"respostaCorreta":1,"explicacao":"Medicamentos ficam na enfermaria, especialmente para menores de 10 anos."},{"id":"ps-m3-q3","texto":"Antes de administrar medicamento, é obrigatório:","opcoes":["Apenas pedir verbalmente ao aluno","Verificar prescrição/registro do responsável e validade","Não informar os pais","Dobrar a dose se esquecer"],"respostaCorreta":1,"explicacao":"É necessário prescrição ou autorização formal, validade e registro da administração."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  trilha_id = EXCLUDED.trilha_id,
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  conteudo = EXCLUDED.conteudo,
  link_externo = EXCLUDED.link_externo,
  xp_recompensa = EXCLUDED.xp_recompensa,
  tempo_estimado_min = EXCLUDED.tempo_estimado_min,
  quiz = EXCLUDED.quiz;
