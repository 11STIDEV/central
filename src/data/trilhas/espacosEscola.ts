import type { Trilha } from "@/data/trilhasMock";

export const trilhaEspacosEscola: Trilha = {
  id: "espacos-escola",
  titulo: "Espaços da Escola — O que acontece aqui?",
  descricao: "Conheça os ambientes pedagógicos e administrativos do campus e sua finalidade.",
  categoria: "Institucional",
  icone: "🏛️",
  cor: "from-rose-500 to-orange-500",
  xpTotal: 200,
  dificuldade: "iniciante",
  missoes: [
    {
      id: "ee-m1",
      trilhaId: "espacos-escola",
      ordem: 1,
      titulo: "Propósito e espaços pedagógicos",
      descricao: "Parques, salas de aula, biblioteca e laboratórios.",
      linkExterno:
        "https://docs.google.com/document/d/16n93eG1RrAITvCsJDeMrR3tbEbVtIi_8Evn9d7wEK-A/edit?usp=sharing",
      conteudo: `## O que acontece aqui?

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
Robótica, Maker, Música, Dança, Estimulação, Oratório — desenvolvimento de habilidades específicas.`,
      xpRecompensa: 65,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "ee-m1-q1",
          texto: "Qual o objetivo do documento 'O que acontece aqui?'",
          opcoes: [
            "Decorar paredes sem função",
            "Deixar transparente a proposta de cada espaço",
            "Substituir o regimento escolar",
            "Listar apenas telefones",
          ],
          respostaCorreta: 1,
          explicacao: "O documento comunica a todos o que se propõe em cada ambiente escolar.",
        },
        {
          id: "ee-m1-q2",
          texto: "Nas salas de aula, os professores são descritos como:",
          opcoes: [
            "Apenas aplicadores de provas",
            "Formadores de agentes da Paz e do Bem",
            "Somente vigilantes",
            "Técnicos de TI",
          ],
          respostaCorreta: 1,
          explicacao: "O documento enfatiza a formação de agentes da Paz e do Bem nas salas de aula.",
        },
      ],
    },
    {
      id: "ee-m2",
      trilhaId: "espacos-escola",
      ordem: 2,
      titulo: "Coordenação, SOE e espaços administrativos",
      descricao: "Orientação educacional, direção, secretaria e SETAPE.",
      conteudo: `### Coordenação
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
- **DP/Financeiro**, **Serviços Gerais**, **Ouvidoria**, **Publicidade**`,
      xpRecompensa: 65,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "ee-m2-q1",
          texto: "O SOE atua especialmente em:",
          opcoes: [
            "Manutenção de ar-condicionado",
            "Orientação educacional e integração com famílias",
            "Vendas da lanchonete",
            "Programação de robótica apenas",
          ],
          respostaCorreta: 1,
          explicacao: "O SOE promove integração, acompanhamento e atendimento educacional individualizado.",
        },
        {
          id: "ee-m2-q2",
          texto: "Suporte de tecnologia da escola concentra-se no setor:",
          opcoes: ["Publicidade", "SETAPE", "Biblioteca", "Piscina"],
          respostaCorreta: 1,
          explicacao: "O SETAPE é o espaço de tecnologia e apoio digital institucional.",
        },
      ],
    },
    {
      id: "ee-m3",
      trilhaId: "espacos-escola",
      ordem: 3,
      titulo: "Quiz final — circulando no campus",
      descricao: "Identifique espaços e responsabilidades.",
      conteudo: `## Dica para novos colaboradores

Ao circular pelo campus, observe as placas **"O que acontece aqui?"**. Elas explicam a intenção pedagógica ou administrativa de cada ambiente — útil para orientar alunos, famílias e visitantes.`,
      xpRecompensa: 70,
      tempoEstimadoMin: 5,
      quiz: [
        {
          id: "ee-m3-q1",
          texto: "Sala Maker e Robótica estão relacionadas a:",
          opcoes: ["Apenas lazer sem objetivo", "Criatividade, tecnologia e projetos práticos", "Somente arquivo morto", "Exclusivamente financeiro"],
          respostaCorreta: 1,
          explicacao: "Esses espaços focam inovação, tecnologia e aprendizagem prática.",
        },
        {
          id: "ee-m3-q2",
          texto: "A Coordenação Disciplinar envolve equipe de:",
          opcoes: ["Cozinha apenas", "Segurança, portaria e bedéis", "Somente professores de música", "Apenas biblioteca"],
          respostaCorreta: 1,
          explicacao: "A coordenação disciplinar trabalha com segurança externa, portaria e bedéis de corredores.",
        },
        {
          id: "ee-m3-q3",
          texto: "O Pátio das Artes e Mezanino costumam ser usados para:",
          opcoes: ["Depósito de lixo", "Atividades artísticas e multipropósito", "Aulas só de matemática", "Garagem de ônibus"],
          respostaCorreta: 1,
          explicacao: "Pátio das Artes/Mezanino/Pátio Multiuso são espaços de expressão e atividades coletivas.",
        },
      ],
    },
  ],
};
