import type { Trilha } from "@/data/trilhasMock";

export const trilhaTaxonomiaBloom: Trilha = {
  id: "taxonomia-bloom",
  titulo: "Taxonomia de Bloom no CCI",
  descricao: "Estrutura pedagógica que orienta planejamentos e operações mentais nas aulas.",
  categoria: "Pedagógico",
  icone: "🧠",
  cor: "from-purple-500 to-fuchsia-600",
  xpTotal: 200,
  dificuldade: "intermediario",
  missoes: [
    {
      id: "tb-m1",
      trilhaId: "taxonomia-bloom",
      ordem: 1,
      titulo: "Fundamentos e níveis iniciais",
      descricao: "Lembrança, Entendimento e Aplicação.",
      linkExterno:
        "https://docs.google.com/document/d/1VETws3Rc8XvlnRCEHR7aK40MxGDNUNNaKZcwtwHTSgU/edit?usp=sharing",
      conteudo: `## Taxonomias no Grupo Educacional CCI

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

> Planos de aula devem explicitar **qual operação mental** se espera provocar.`,
      xpRecompensa: 65,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "tb-m1-q1",
          texto: "O nível 'Lembrança' envolve principalmente:",
          opcoes: ["Criar projetos inéditos", "Recuperar informação da memória", "Mediar conflitos", "Julgar com critérios externos"],
          respostaCorreta: 1,
          explicacao: "Lembrança é buscar e trazer informação da memória (reconhecer, citar, reproduzir).",
        },
        {
          id: "tb-m1-q2",
          texto: "Interpretar um enunciado e convertê-lo em equação é exemplo de:",
          opcoes: ["Lembrança", "Entendimento", "Intercessão", "Avaliação"],
          respostaCorreta: 1,
          explicacao: "Interpretar e dar significado ao material é característica do nível Entendimento.",
        },
      ],
    },
    {
      id: "tb-m2",
      trilhaId: "taxonomia-bloom",
      ordem: 2,
      titulo: "Níveis avançados e Intercessão",
      descricao: "Análise, Avaliação, Elaboração e Intercessão — foco CCI.",
      conteudo: `### 4. Análise
Diferenciar informações relevantes, organizar dados, atribuir motivações.

### 5. Avaliação
Verificar coerência, criticar com rubricas, escolher melhores métodos.

### 6. Elaboração de Propostas
Gerar hipóteses, planejar projetos, produzir textos, construir soluções — propor inovações a partir de problemas.

### 7. Intercessão (ênfase CCI)
Articula argumentos para **mediar** conflitos, **intervir** em crises, **apaziguar** e exercer **diplomacia** (negociar, representar, defender).

## Por que provocar tarefas mais complexas?
O mercado valoriza pensamento analítico, criatividade, resiliência, liderança, alfabetização tecnológica e aprendizado contínuo. Aulas que param na lembrança não preparam para essas demandas.

**Meta pedagógica CCI:** provocar operações mentais cada vez mais complexas, incluindo propor e interceder.`,
      xpRecompensa: 65,
      tempoEstimadoMin: 12,
      quiz: [
        {
          id: "tb-m2-q1",
          texto: "Propor inovações a partir de um problema é nível de:",
          opcoes: ["Lembrança", "Elaboração de Propostas", "Entendimento", "Aplicação"],
          respostaCorreta: 1,
          explicacao: "Elaboração de Propostas envolve gerar, planejar e produzir soluções novas.",
        },
        {
          id: "tb-m2-q2",
          texto: "Mediar conflitos entre estudantes relaciona-se ao nível:",
          opcoes: ["Intercessão", "Lembrança", "Aplicação", "Entendimento"],
          respostaCorreta: 0,
          explicacao: "Intercessão inclui mediar, intervir, apaziguar e argumentar diplomaticamente.",
        },
      ],
    },
    {
      id: "tb-m3",
      trilhaId: "taxonomia-bloom",
      ordem: 3,
      titulo: "Quiz final — Bloom na prática",
      descricao: "Aplique a taxonomia ao planejar aulas.",
      conteudo: `## Checklist do planejamento

- [ ] Defini qual operação mental quero provocar
- [ ] A atividade exige mais que memorizar?
- [ ] Há momento de análise, avaliação ou criação?
- [ ] Promovo intercessão (debate, mediação, defesa de ideias)?
- [ ] Alinho com a Proposta Pedagógica do CCI`,
      xpRecompensa: 70,
      tempoEstimadoMin: 6,
      quiz: [
        {
          id: "tb-m3-q1",
          texto: "Corrigir trabalhos com rubrica e julgar qualidade é nível de:",
          opcoes: ["Avaliação", "Lembrança", "Entendimento", "Intercessão"],
          respostaCorreta: 0,
          explicacao: "Avaliação envolve julgamentos baseados em critérios e padrões.",
        },
        {
          id: "tb-m3-q2",
          texto: "No CCI, os planos de aula devem começar por:",
          opcoes: [
            "A quantidade de cópias no xerox",
            "A intenção do processo mental esperado do estudante",
            "O horário do intervalo apenas",
            "A cor do material didático",
          ],
          respostaCorreta: 1,
          explicacao: "A taxonomia orienta planejar a partir da operação mental que se deseja provocar.",
        },
        {
          id: "tb-m3-q3",
          texto: "Separar dados relevantes de irrelevantes em um problema é:",
          opcoes: ["Análise", "Lembrança", "Intercessão", "Entendimento"],
          respostaCorreta: 0,
          explicacao: "Diferenciar e organizar informações faz parte do nível Análise.",
        },
      ],
    },
  ],
};
