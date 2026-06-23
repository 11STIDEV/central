import type { Trilha } from "@/data/trilhasMock";

export const trilhaPrimeirosSocorros: Trilha = {
  id: "primeiros-socorros",
  titulo: "POP — Sala de Primeiros Socorros",
  descricao: "Procedimentos operacionais da sala de primeiros atendimentos de saúde.",
  categoria: "Operacional",
  icone: "🩺",
  cor: "from-red-500 to-rose-600",
  xpTotal: 220,
  dificuldade: "intermediario",
  missoes: [
    {
      id: "ps-m1",
      trilhaId: "primeiros-socorros",
      ordem: 1,
      titulo: "Materiais e rotina diária",
      descricao: "Estoque semanal e higiene do ambiente.",
      linkExterno:
        "https://docs.google.com/document/d/1WO5_a1XbkNgTfqismql5ZHZtV2dnwGG_PIql5VaeESw/edit?usp=sharing",
      conteudo: `## POP — Sala de Primeiros Socorros

### Materiais (levantamento semanal)
Termômetro, esfigmomanômetro, esparadrapo, gaze, algodão, luvas, máscaras, álcool 70%, antisséptico, tesoura de ponta romba, compressas frias/quentes, analgésicos de venda livre (ex.: paracetamol), antialérgicos, pomada, soro fisiológico, gelo no frigobar exclusivo, sal, açúcar, absorvente, entre outros.

### Rotina diária
1. Ambiente **limpo e organizado** (móveis, macas, armários)
2. **Frigobar**: repor gelo, limpar prateleiras, descongelar
3. Lavar utensílios (vasilha de soro, talheres)
4. **Preparar soro** no início do dia e descartar no final
5. Manter ambiente **arejado**`,
      xpRecompensa: 70,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "ps-m1-q1",
          texto: "O soro preparado na sala deve ser:",
          opcoes: ["Reutilizado por uma semana", "Preparado no início do dia e descartado no final", "Deixado sem higiene", "Guardado no Meu Drive"],
          respostaCorreta: 1,
          explicacao: "O POP determina preparo diário e descarte no fim do dia.",
        },
        {
          id: "ps-m1-q2",
          texto: "Com que frequência revisar materiais essenciais?",
          opcoes: ["Nunca", "Semanalmente", "A cada 5 anos", "Só quando acabar tudo"],
          respostaCorreta: 1,
          explicacao: "O levantamento de materiais é feito semanalmente.",
        },
      ],
    },
    {
      id: "ps-m2",
      trilhaId: "primeiros-socorros",
      ordem: 2,
      titulo: "Triagem e comunicação com famílias",
      descricao: "Atendimento, Trusty e modelos de mensagem.",
      conteudo: `## Atendimento e comunicação

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
Manter registros no **iScholar** com detalhamento e mensagem enviada. Manter **Trusty** aberto no computador.`,
      xpRecompensa: 75,
      tempoEstimadoMin: 12,
      quiz: [
        {
          id: "ps-m2-q1",
          texto: "Em caso de febre, além do Trusty, deve-se:",
          opcoes: ["Não avisar os pais", "Ligar para os pais", "Apenas enviar e-mail pessoal", "Esperar uma semana"],
          respostaCorreta: 1,
          explicacao: "Febre exige ligação e mensagem Trusty, recomendando busca do estudante.",
        },
        {
          id: "ps-m2-q2",
          texto: "Onde registrar o atendimento oficialmente?",
          opcoes: ["Somente em papel solto", "No iScholar, com detalhes e comunicação", "No Instagram", "Não registrar"],
          respostaCorreta: 1,
          explicacao: "O POP exige registro preciso no iScholar e uso do Trusty para comunicação.",
        },
      ],
    },
    {
      id: "ps-m3",
      trilhaId: "primeiros-socorros",
      ordem: 3,
      titulo: "Emergências e medicação",
      descricao: "SAMU, hospital, administração de medicamentos.",
      conteudo: `## Emergências graves

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

> Segurança e bem-estar do aluno são sempre a prioridade.`,
      xpRecompensa: 75,
      tempoEstimadoMin: 10,
      quiz: [
        {
          id: "ps-m3-q1",
          texto: "Em emergência grave com dúvida, ligue primeiro para:",
          opcoes: ["Recepção de hotel", "SAMU 192", "Pizzaria", "Suporte do Plurall"],
          respostaCorreta: 1,
          explicacao: "O POP orienta ligar imediatamente ao SAMU (192) quando necessário.",
        },
        {
          id: "ps-m3-q2",
          texto: "Medicamento enviado pela família deve ficar:",
          opcoes: ["Na mochila do aluno na sala", "Armazenado com segurança na enfermaria", "Na lanchonete", "No carro do professor"],
          respostaCorreta: 1,
          explicacao: "Medicamentos ficam na enfermaria, especialmente para menores de 10 anos.",
        },
        {
          id: "ps-m3-q3",
          texto: "Antes de administrar medicamento, é obrigatório:",
          opcoes: [
            "Apenas pedir verbalmente ao aluno",
            "Verificar prescrição/registro do responsável e validade",
            "Não informar os pais",
            "Dobrar a dose se esquecer",
          ],
          respostaCorreta: 1,
          explicacao: "É necessário prescrição ou autorização formal, validade e registro da administração.",
        },
      ],
    },
  ],
};
