import type { Trilha } from "@/data/trilhasMock";

export const trilhaMissaoVisaoCci: Trilha = {
  id: "missao-visao-cci",
  titulo: "Missão, Princípios e Visão do CCI",
  descricao:
    "Conheça as instituições do Grupo Educacional CCI, sua missão, valores, visão e estrutura de credenciamento.",
  categoria: "Institucional",
  icone: "🏫",
  cor: "from-amber-500 to-orange-600",
  xpTotal: 200,
  dificuldade: "iniciante",
  missoes: [
    {
      id: "mvc-m1",
      trilhaId: "missao-visao-cci",
      ordem: 1,
      titulo: "Instituições do Grupo CCI",
      descricao: "Unidades educacionais, endereços e empresas mantenedoras.",
      linkExterno:
        "https://docs.google.com/document/d/1cOFHBtOWxIjBA7b4yuskJ2XWs4fNjeqHcLBQ1vks6Sk/edit?usp=sharing",
      conteudo: `## Instituições de Ensino do Grupo Educacional CCI

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
- A escola técnica TecsCCI é sub-unidade do CCI Sênior; documentos oficiais usam o cabeçalho **Centro Educacional CCI Sênior**`,
      xpRecompensa: 60,
      tempoEstimadoMin: 8,
      quiz: [
        {
          id: "mvc-m1-q1",
          texto: "Qual instituição oferece da Educação Infantil ao 5º ano?",
          opcoes: ["Faculdade CCI", "CCI Sênior", "CCI — Centro de Criatividade Infantojuvenil", "Escola Técnica isolada"],
          respostaCorreta: 2,
          explicacao: "O CCI (Centro de Criatividade Infantojuvenil) atende da Ed. Infantil ao 5º ano em Samambaia.",
        },
        {
          id: "mvc-m1-q2",
          texto: "Onde ficam os cursos técnicos vinculados ao CED CCI Sênior?",
          opcoes: ["Na Faculdade CCI", "No Centro Educacional CCI Sênior", "Apenas no CLAT", "Na Educação Infantil"],
          respostaCorreta: 1,
          explicacao: "Os cursos técnicos são ofertados pelo Centro Educacional CCI Sênior.",
        },
      ],
    },
    {
      id: "mvc-m2",
      trilhaId: "missao-visao-cci",
      ordem: 2,
      titulo: "Missão, Princípios e Visão",
      descricao: "Propósito institucional e valores que orientam decisões da equipe.",
      conteudo: `## Missão do CCI
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
Ser reconhecido no DF por sua **excelência nos serviços educacionais**, transformador da comunidade.`,
      xpRecompensa: 70,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "mvc-m2-q1",
          texto: "Qual é o Propósito do Grupo Educacional CCI?",
          opcoes: [
            "Maximizar lucro das mantenedoras",
            "Formar agentes da PAZ e do BEM",
            "Expandir apenas cursos técnicos",
            "Substituir o ensino presencial",
          ],
          respostaCorreta: 1,
          explicacao: "O propósito institucional é formar agentes da Paz e do Bem.",
        },
        {
          id: "mvc-m2-q2",
          texto: "Qual valor aparece em primeiro lugar na ordem de decisão da equipe?",
          opcoes: ["Eficiência", "Inovação", "Respeito", "Autonomia"],
          respostaCorreta: 2,
          explicacao: "Respeito é o primeiro valor na ordem de decisão, seguido de Aprendizagem, Autonomia, Excelência, Inovação e Eficiência.",
        },
        {
          id: "mvc-m2-q3",
          texto: "A Visão do CCI aponta para qual reconhecimento?",
          opcoes: [
            "Ser a maior rede privada do Brasil",
            "Excelência nos serviços educacionais no DF",
            "Liderança em vendas de material didático",
            "Expansão internacional imediata",
          ],
          respostaCorreta: 1,
          explicacao: "A visão é ser reconhecido no DF pela excelência nos serviços educacionais e transformação da comunidade.",
        },
      ],
    },
    {
      id: "mvc-m3",
      trilhaId: "missao-visao-cci",
      ordem: 3,
      titulo: "Unidades no iScholar e Credenciamentos",
      descricao: "Como as unidades aparecem no sistema e panorama de atos autorizativos.",
      conteudo: `## Unidades no Sistema iScholar
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

> Consulte o livro de atos e autorizações institucional para datas e portarias vigentes.`,
      xpRecompensa: 70,
      tempoEstimadoMin: 8,
      quiz: [
        {
          id: "mvc-m3-q1",
          texto: "No iScholar, qual unidade corresponde ao Ensino Médio?",
          opcoes: ["CCI (Infantil ao 5º)", "CCI Sênior", "Pós-Graduação", "Biblioteca"],
          respostaCorreta: 1,
          explicacao: "O CCI Sênior abrange do 6º ano ao Ensino Médio no sistema de gestão.",
        },
        {
          id: "mvc-m3-q2",
          texto: "Por que é importante conhecer os atos de credenciamento?",
          opcoes: [
            "Apenas para marketing",
            "Para entender a regularidade e oferta legal de cada instituição",
            "Só interessa ao setor de TI",
            "Não tem relevância operacional",
          ],
          respostaCorreta: 1,
          explicacao: "Os atos garantem a base legal da oferta educacional de cada unidade do grupo.",
        },
      ],
    },
  ],
};
