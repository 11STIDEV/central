import type { Trilha } from "@/data/trilhasMock";

export const trilhaPlurall: Trilha = {
  id: "plurall",
  titulo: "Plurall — Ambiente Virtual",
  descricao: "Plataforma digital para professores e coordenadores publicarem conteúdos e atividades online.",
  categoria: "Pedagógico",
  icone: "💻",
  cor: "from-emerald-500 to-teal-600",
  xpTotal: 200,
  dificuldade: "intermediario",
  missoes: [
    {
      id: "pl-m1",
      trilhaId: "plurall",
      ordem: 1,
      titulo: "O que é o Plurall?",
      descricao: "Plataforma, público e papel do Maestro.",
      linkExterno: "https://ajuda.plurall.net/hc/pt-br",
      conteudo: `## Plurall — plataforma digital educacional

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

Professores de música, informática, teatro e outras disciplinas sem material próprio também podem usar o Maestro para aulas digitais quando vinculados à escola parceira.`,
      xpRecompensa: 60,
      tempoEstimadoMin: 8,
      quiz: [
        {
          id: "pl-m1-q1",
          texto: "O Plurall é usado no CCI principalmente para:",
          opcoes: [
            "Folha de pagamento",
            "Ensino-aprendizagem digital (conteúdos e atividades)",
            "Controle de catraca",
            "Gestão de estoque do almoxarifado",
          ],
          respostaCorreta: 1,
          explicacao: "O Plurall é o ambiente virtual para conteúdos, atividades e acompanhamento pedagógico.",
        },
        {
          id: "pl-m1-q2",
          texto: "Qual módulo o professor usa para criar e enviar atividades?",
          opcoes: ["Trusty", "Maestro", "iScholar", "Google Drive"],
          respostaCorreta: 1,
          explicacao: "O Maestro é o módulo pedagógico do professor no Plurall.",
        },
      ],
    },
    {
      id: "pl-m2",
      trilhaId: "plurall",
      ordem: 2,
      titulo: "Atividades e correção no Maestro",
      descricao: "Publicar, corrigir dissertativas e acompanhar turmas.",
      linkExterno:
        "https://ajuda.plurall.net/hc/pt-br/articles/29138945506331-Como-corrigir-as-atividades-dos-alunos-no-Maestro",
      conteudo: `## Atividades no Maestro

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
Coordenadores e professores podem gerar **planos de aula** com o assistente, escolhendo material, capítulo, duração e tema.`,
      xpRecompensa: 70,
      tempoEstimadoMin: 12,
      quiz: [
        {
          id: "pl-m2-q1",
          texto: "Questões dissertativas no Maestro são corrigidas:",
          opcoes: ["Automaticamente pelo sistema", "Pelo professor manualmente", "Pelos pais", "Pela secretaria"],
          respostaCorreta: 1,
          explicacao: "Dissertativas dependem da correção do professor; objetivas usam gabarito automático.",
        },
        {
          id: "pl-m2-q2",
          texto: "Para corrigir um aluno específico, você deve:",
          opcoes: [
            "Manter 'Selecionar Todos' marcado",
            "Desmarcar 'Selecionar Todos' e corrigir individualmente",
            "Não é possível corrigir individualmente",
            "Enviar por e-mail externo",
          ],
          respostaCorreta: 1,
          explicacao: "Desmarque 'Selecionar Todos' para atribuir nota e feedback por aluno.",
        },
      ],
    },
    {
      id: "pl-m3",
      trilhaId: "plurall",
      ordem: 3,
      titulo: "Quiz final — Plurall no CCI",
      descricao: "Consolide o que aprendeu sobre o ambiente virtual.",
      conteudo: `## Resumo para o dia a dia

1. Acesse o Plurall pelo navegador com seu perfil de professor/coordenador
2. Use o **Maestro** para criar, enviar e corrigir atividades
3. Acompanhe participação e desempenho nos relatórios
4. Consulte a [Central de Ajuda do Plurall](https://ajuda.plurall.net/hc/pt-br) para tutoriais atualizados
5. Em dúvidas técnicas, acione a TI ou suporte indicado pela coordenação`,
      xpRecompensa: 70,
      tempoEstimadoMin: 5,
      quiz: [
        {
          id: "pl-m3-q1",
          texto: "Onde o professor encontra tutoriais oficiais do Plurall?",
          opcoes: [
            "ajuda.plurall.net",
            "Apenas no Facebook",
            "No iScholar",
            "Não existem tutoriais",
          ],
          respostaCorreta: 0,
          explicacao: "A Central de Ajuda em ajuda.plurall.net reúne artigos e passo a passo.",
        },
        {
          id: "pl-m3-q2",
          texto: "Professor de informática sem material Plurall nativo pode usar a plataforma?",
          opcoes: [
            "Não, nunca",
            "Sim, via Maestro e Biblioteca de Conteúdos, se vinculado à escola parceira",
            "Só alunos podem acessar",
            "Apenas diretores",
          ],
          respostaCorreta: 1,
          explicacao: "Professores de disciplinas sem material nativo podem criar atividades e usar o Maestro normalmente.",
        },
        {
          id: "pl-m3-q3",
          texto: "Relatórios de desempenho ficam disponíveis no:",
          opcoes: ["Maestro", "Almoxarifado", "Catraca física", "Portal de vales"],
          respostaCorreta: 0,
          explicacao: "O Maestro oferece relatórios de participação e desempenho nas atividades.",
        },
      ],
    },
  ],
};
