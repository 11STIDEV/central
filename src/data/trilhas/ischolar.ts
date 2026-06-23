import type { Trilha } from "@/data/trilhasMock";

export const trilhaIscholar: Trilha = {
  id: "ischolar",
  titulo: "iScholar — Gestão Escolar",
  descricao: "Conheça o sistema de gestão usado no CCI para rotinas acadêmicas e administrativas.",
  categoria: "Sistemas",
  icone: "🎓",
  cor: "from-indigo-500 to-violet-600",
  xpTotal: 200,
  dificuldade: "intermediario",
  missoes: [
    {
      id: "is-m1",
      trilhaId: "ischolar",
      ordem: 1,
      titulo: "Introdução ao iScholar",
      descricao: "O que é o sistema e como as unidades do CCI estão organizadas.",
      linkExterno: "https://ajuda.ischolar.com.br/pt-BR/",
      conteudo: `## O que é o iScholar?

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
- Integração entre setores (secretaria, coordenação, financeiro)`,
      xpRecompensa: 60,
      tempoEstimadoMin: 7,
      quiz: [
        {
          id: "is-m1-q1",
          texto: "O iScholar é usado principalmente para:",
          opcoes: ["Jogos educativos", "Gestão escolar integrada", "Edição de vídeos", "Redes sociais"],
          respostaCorreta: 1,
          explicacao: "O iScholar é o sistema de gestão escolar do CCI.",
        },
      ],
    },
    {
      id: "is-m2",
      trilhaId: "ischolar",
      ordem: 2,
      titulo: "Módulos por setor",
      descricao: "Secretaria, Coordenação, Financeiro e demais áreas.",
      conteudo: `## Principais módulos (Central de Ajuda)

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

> Cada colaborador enxerga apenas o que seu perfil permite. Em dúvida, consulte a TI ou o responsável do setor.`,
      xpRecompensa: 70,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "is-m2-q1",
          texto: "Qual módulo costuma tratar de matrículas e documentos de alunos?",
          opcoes: ["Catraca", "Secretaria", "Biblioteca", "Publicidade"],
          respostaCorreta: 1,
          explicacao: "A Secretaria concentra rotinas de matrícula, cadastro e documentação.",
        },
        {
          id: "is-m2-q2",
          texto: "Onde encontrar tutoriais oficiais do sistema?",
          opcoes: [
            "Somente no WhatsApp",
            "Na Central de Ajuda iScholar (ajuda.ischolar.com.br)",
            "Apenas em vídeos do YouTube aleatórios",
            "Não há documentação",
          ],
          respostaCorreta: 1,
          explicacao: "A Central de Ajuda oficial reúne artigos por módulo e perfil de uso.",
        },
      ],
    },
    {
      id: "is-m3",
      trilhaId: "ischolar",
      ordem: 3,
      titulo: "Registros e boas práticas",
      descricao: "Como registrar ocorrências e manter dados confiáveis.",
      conteudo: `## Boas práticas no iScholar

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
- Tutoriais: Central de Ajuda iScholar`,
      xpRecompensa: 70,
      tempoEstimadoMin: 8,
      quiz: [
        {
          id: "is-m3-q1",
          texto: "Um registro de ocorrência no iScholar deve ser:",
          opcoes: ["Vago e sem data", "Claro, datado e alinhado aos fatos", "Opcional em qualquer caso", "Feito só por e-mail"],
          respostaCorreta: 1,
          explicacao: "Registros oficiais precisam ser claros, datados e coerentes com o que foi comunicado.",
        },
        {
          id: "is-m3-q2",
          texto: "Quem deve usar a conta no iScholar?",
          opcoes: [
            "Qualquer pessoa com a senha compartilhada",
            "Cada colaborador com seu próprio acesso institucional",
            "Apenas diretores",
            "Não é necessário login",
          ],
          respostaCorreta: 1,
          explicacao: "Cada colaborador deve usar seu próprio acesso para rastreabilidade e segurança.",
        },
      ],
    },
  ],
};
