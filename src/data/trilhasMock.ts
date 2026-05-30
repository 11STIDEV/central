// ============================================================
// TRILHA DE CONHECIMENTO — Dados Mock
// Substitua por chamadas à API quando o banco estiver pronto.
// ============================================================

export type Dificuldade = "iniciante" | "intermediario" | "avancado";

export type PerguntaQuiz = {
  id: string;
  texto: string;
  opcoes: string[];
  respostaCorreta: number; // índice 0-based
  explicacao: string;
};

export type Missao = {
  id: string;
  trilhaId: string;
  ordem: number;
  titulo: string;
  descricao: string;
  conteudo: string;
  linkExterno?: string;
  xpRecompensa: number;
  tempoEstimadoMin: number;
  quiz: PerguntaQuiz[];
};

export type Trilha = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  icone: string; // emoji
  cor: string; // tailwind gradient classes
  xpTotal: number;
  dificuldade: Dificuldade;
  missoes: Missao[];
  setorRestrito?: string; // se vazio = todos
};

export type Badge = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  desbloqueadoEm?: string; // ISO date, undefined = não conquistado
};

export type RankingEntry = {
  posicao: number;
  nome: string;
  avatar?: string;
  iniciais: string;
  xpSemana: number;
  nivel: number;
  cor: string; // cor do avatar
};

export type UserProgress = {
  xpTotal: number;
  nivel: number;
  xpProximoNivel: number;
  streakDias: number;
  missoesCompletas: number;
  trilhasCompletas: number;
  progressoPorTrilha: Record<string, string[]>; // trilhaId → [missaoId concluída]
};

// ── Níveis ──────────────────────────────────────────────────
export const NIVEIS = [
  { nivel: 1, nome: "Iniciante",    xpMin: 0,    icone: "🌱" },
  { nivel: 2, nome: "Aprendiz",     xpMin: 100,  icone: "📘" },
  { nivel: 3, nome: "Praticante",   xpMin: 300,  icone: "⚡" },
  { nivel: 4, nome: "Especialista", xpMin: 600,  icone: "🔥" },
  { nivel: 5, nome: "Mestre",       xpMin: 1000, icone: "🏆" },
] as const;

export function getNivelInfo(xp: number) {
  let atual = NIVEIS[0];
  for (const n of NIVEIS) {
    if (xp >= n.xpMin) atual = n;
  }
  const idx = NIVEIS.indexOf(atual as typeof NIVEIS[number]);
  const proximo = NIVEIS[idx + 1] ?? null;
  return { atual, proximo };
}

// ── Trilhas ──────────────────────────────────────────────────
export const TRILHAS_MOCK: Trilha[] = [
  {
    id: "missao-cci",
    titulo: "Missão do CCI",
    descricao: "Conheça a história, valores e estrutura do Centro de Conhecimento e Informações.",
    categoria: "Onboarding",
    icone: "🏫",
    cor: "from-amber-500 to-orange-600",
    xpTotal: 200,
    dificuldade: "iniciante",
    missoes: [
      {
        id: "cci-m1",
        trilhaId: "missao-cci",
        ordem: 1,
        titulo: "O que é o CCI?",
        descricao: "Entenda a missão, visão e valores da instituição.",
        conteudo: `## Bem-vindo ao CCI! 🎉

O **Centro de Conhecimento e Informações (CCI)** é o coração da nossa instituição — um espaço dedicado à integração, aprendizado e crescimento de todos os colaboradores.

### Nossa Missão
Promover o conhecimento compartilhado e a excelência institucional por meio da integração de pessoas, processos e tecnologia.

### Nossa Visão
Ser referência em gestão do conhecimento no ambiente educacional, tornando cada colaborador um agente de transformação.

### Nossos Valores
- **Colaboração** — Trabalhamos juntos, crescemos juntos
- **Inovação** — Buscamos sempre novas formas de fazer melhor
- **Excelência** — Nos comprometemos com a qualidade em tudo
- **Integridade** — Agimos com transparência e ética

### Estrutura Organizacional
O CCI está estruturado em setores interdependentes que trabalham de forma integrada para oferecer o melhor serviço a alunos, professores e colaboradores.`,
        xpRecompensa: 50,
        tempoEstimadoMin: 5,
        quiz: [
          {
            id: "cci-m1-q1",
            texto: "Qual é o principal objetivo do CCI?",
            opcoes: [
              "Apenas gerir documentos administrativos",
              "Promover o conhecimento compartilhado e a excelência institucional",
              "Controlar o acesso às instalações",
              "Gerenciar apenas o setor de TI",
            ],
            respostaCorreta: 1,
            explicacao: "O CCI tem como missão promover o conhecimento compartilhado e a excelência institucional por meio da integração de pessoas, processos e tecnologia.",
          },
          {
            id: "cci-m1-q2",
            texto: "Qual dos itens abaixo NÃO é um valor do CCI?",
            opcoes: ["Colaboração", "Competitividade", "Integridade", "Inovação"],
            respostaCorreta: 1,
            explicacao: "Os valores do CCI são Colaboração, Inovação, Excelência e Integridade. Competitividade não faz parte dos valores institucionais.",
          },
          {
            id: "cci-m1-q3",
            texto: "O CCI busca ser referência em qual área?",
            opcoes: ["Gestão financeira", "Marketing digital", "Gestão do conhecimento", "Recursos humanos"],
            respostaCorreta: 2,
            explicacao: "A visão do CCI é ser referência em gestão do conhecimento no ambiente educacional.",
          },
        ],
      },
      {
        id: "cci-m2",
        trilhaId: "missao-cci",
        ordem: 2,
        titulo: "Central de Informações",
        descricao: "Explore os recursos da Central e saiba onde encontrar cada informação.",
        conteudo: `## Central de Informações — Seu Hub de Tudo! 🗂️

A **Central de Informações** é o portal digital que reúne todas as ferramentas, documentos e serviços que você precisa no dia a dia.

### O que você encontra aqui?

#### 📋 Atendimento
- **Chamados**: Abra solicitações para qualquer setor
- **Painel de Senhas**: Gerencie filas de atendimento
- **Achados e Perdidos**: Registre e consulte itens

#### 📅 Agenda
- **Agenda CCI**: Eventos e compromissos institucionais
- **Reserva de Espaços**: Reserve salas e equipamentos
- **Minhas Reservas**: Acompanhe suas reservas ativas

#### 🏢 Setores
Cada setor tem sua área dedicada com links úteis, documentos específicos e contatos diretos.

### Dica de Ouro 💡
Use a **barra de busca** (quando disponível) ou navegue pelo menu lateral para encontrar rapidamente o que precisa. O menu se expande ao passar o mouse!`,
        xpRecompensa: 50,
        tempoEstimadoMin: 5,
        quiz: [
          {
            id: "cci-m2-q1",
            texto: "Onde você pode abrir uma solicitação para outro setor?",
            opcoes: ["Reserva de Espaços", "Chamados", "Agenda CCI", "Portal do Funcionário"],
            respostaCorreta: 1,
            explicacao: "A área de Chamados é onde você abre solicitações e suporte para qualquer setor da instituição.",
          },
          {
            id: "cci-m2-q2",
            texto: "Como o menu lateral funciona no desktop?",
            opcoes: [
              "Fica sempre expandido",
              "Expande ao clicar em um botão",
              "Expande ao passar o mouse por cima",
              "É fixo e não muda",
            ],
            respostaCorreta: 2,
            explicacao: "No desktop, o menu lateral se expande automaticamente ao passar o mouse por cima (hover), revelando os labels de cada item.",
          },
        ],
      },
      {
        id: "cci-m3",
        trilhaId: "missao-cci",
        ordem: 3,
        titulo: "Portal do Funcionário",
        descricao: "Tudo o que você precisa saber sobre o seu espaço pessoal na plataforma.",
        conteudo: `## Portal do Funcionário — Sua Área Pessoal 👤

O **Portal do Funcionário** é o seu espaço pessoal dentro da Central, onde você encontra recursos específicos para colaboradores.

### Recursos Disponíveis

#### 💰 Vale-Adiantamento
Solicite adiantamento salarial de forma digital, com acompanhamento do status em tempo real.

**Como solicitar:**
1. Acesse "Portal do Funcionário"
2. Clique em "Solicitar Vale-Adiantamento"
3. Preencha o valor e a justificativa
4. Aguarde a aprovação do DP/Financeiro

#### 📄 Documentos
Acesse manuais, normas e procedimentos institucionais organizados por categoria.

#### 📞 Ramais
Consulte o catálogo completo de ramais e contatos de todos os setores.

### Acesso e Segurança 🔒
Seu acesso é configurado automaticamente com base no seu perfil no Google Workspace. Cada setor tem visibilidade apenas das informações pertinentes.`,
        xpRecompensa: 50,
        tempoEstimadoMin: 5,
        quiz: [
          {
            id: "cci-m3-q1",
            texto: "Como o acesso do colaborador é configurado na Central?",
            opcoes: [
              "Manualmente pelo administrador toda semana",
              "Automaticamente com base no perfil do Google Workspace",
              "O próprio usuário escolhe suas permissões",
              "Todos têm o mesmo nível de acesso",
            ],
            respostaCorreta: 1,
            explicacao: "O acesso é configurado automaticamente com base na Unidade Organizacional (OU) do usuário no Google Workspace.",
          },
          {
            id: "cci-m3-q2",
            texto: "Como você solicita um Vale-Adiantamento?",
            opcoes: [
              "Pessoalmente no setor de DP",
              "Pelo Portal do Funcionário na Central de Informações",
              "Por e-mail para o financeiro",
              "Não é possível solicitar pela plataforma",
            ],
            respostaCorreta: 1,
            explicacao: "A solicitação de Vale-Adiantamento é feita digitalmente pelo Portal do Funcionário, com acompanhamento de status em tempo real.",
          },
        ],
      },
      {
        id: "cci-m4",
        trilhaId: "missao-cci",
        ordem: 4,
        titulo: "Comunicação Interna",
        descricao: "Boas práticas e canais oficiais de comunicação.",
        conteudo: `## Comunicação Interna — Fale a Língua Certa! 💬

A comunicação eficiente é fundamental para o bom funcionamento de qualquer instituição. Conheça os canais e boas práticas.

### Canais Oficiais

| Canal | Uso Indicado | Tempo de Resposta |
|-------|-------------|------------------|
| E-mail institucional | Comunicações formais | Até 24h úteis |
| Google Chat | Mensagens rápidas | Imediato |
| Chamados (Central) | Solicitações e suporte | Até 48h úteis |
| Reuniões agendadas | Decisões importantes | Conforme agenda |

### Boas Práticas ✅
- **Assunto claro**: Use linhas de assunto descritivas nos e-mails
- **Tom profissional**: Mantenha linguagem respeitosa e objetiva
- **Canal correto**: Use o canal adequado para cada tipo de mensagem
- **Disponibilidade**: Respeite o horário de trabalho dos colegas

### O que EVITAR ❌
- Mensagens urgentes por e-mail (use chamados ou contato direto)
- Grupos de WhatsApp para assuntos profissionais formais
- Encaminhar informações sensíveis sem autorização`,
        xpRecompensa: 50,
        tempoEstimadoMin: 5,
        quiz: [
          {
            id: "cci-m4-q1",
            texto: "Qual canal é mais indicado para solicitações e suporte formal?",
            opcoes: ["WhatsApp pessoal", "Chamados na Central de Informações", "E-mail pessoal", "Google Meet"],
            respostaCorreta: 1,
            explicacao: "O sistema de Chamados na Central é o canal correto para solicitações e suporte, pois permite rastreamento, histórico e SLA de atendimento.",
          },
          {
            id: "cci-m4-q2",
            texto: "Qual é o tempo esperado de resposta para chamados?",
            opcoes: ["Imediato", "Até 24h úteis", "Até 48h úteis", "Até 1 semana"],
            respostaCorreta: 2,
            explicacao: "Chamados têm prazo de resposta de até 48 horas úteis. E-mails institucionais têm prazo de 24 horas úteis.",
          },
        ],
      },
    ],
  },

  {
    id: "seguranca-lgpd",
    titulo: "Segurança e LGPD",
    descricao: "Proteja dados, privacidade e compreenda suas responsabilidades legais.",
    categoria: "Compliance",
    icone: "🔒",
    cor: "from-blue-500 to-indigo-600",
    xpTotal: 150,
    dificuldade: "iniciante",
    missoes: [
      {
        id: "lgpd-m1",
        trilhaId: "seguranca-lgpd",
        ordem: 1,
        titulo: "O que é a LGPD?",
        descricao: "Fundamentos da Lei Geral de Proteção de Dados.",
        conteudo: `## LGPD — A Lei que Protege as Pessoas 🛡️

A **Lei Geral de Proteção de Dados (LGPD)** — Lei nº 13.709/2018 — é a legislação brasileira que regula como organizações devem coletar, armazenar, usar e compartilhar dados pessoais.

### Por que isso importa?
Como colaborador, você lida diariamente com dados de alunos, funcionários e parceiros. **Você é responsável** pela forma como trata essas informações.

### O que são Dados Pessoais?
Qualquer informação que identifique ou possa identificar uma pessoa:
- Nome, CPF, RG, e-mail, telefone
- Endereço, localização
- Dados financeiros e de saúde
- Fotos e biometria

### Dados Sensíveis ⚠️
Exigem proteção redobrada:
- Origem racial ou étnica
- Convicção religiosa
- Dados de saúde e genéticos
- Dados de crianças e adolescentes

### Princípios Fundamentais
1. **Finalidade**: Colete só o necessário para um propósito claro
2. **Transparência**: Informe ao titular sobre o uso dos dados
3. **Segurança**: Proteja os dados contra acessos não autorizados
4. **Prevenção**: Adote medidas para evitar danos`,
        xpRecompensa: 50,
        tempoEstimadoMin: 8,
        quiz: [
          {
            id: "lgpd-m1-q1",
            texto: "O que é considerado dado pessoal pela LGPD?",
            opcoes: [
              "Apenas CPF e RG",
              "Qualquer informação que identifique ou possa identificar uma pessoa",
              "Somente dados financeiros",
              "Apenas dados digitais",
            ],
            respostaCorreta: 1,
            explicacao: "Dado pessoal é qualquer informação que identifique ou possa identificar uma pessoa natural, incluindo nome, e-mail, telefone, endereço, etc.",
          },
          {
            id: "lgpd-m1-q2",
            texto: "Qual categoria exige proteção REDOBRADA segundo a LGPD?",
            opcoes: ["E-mail corporativo", "Dados de saúde e biometria", "Número de matrícula", "Nome completo"],
            respostaCorreta: 1,
            explicacao: "Dados sensíveis como dados de saúde, biometria, origem racial e convicções religiosas exigem proteção redobrada sob a LGPD.",
          },
          {
            id: "lgpd-m1-q3",
            texto: "O que significa o princípio da 'Finalidade' na LGPD?",
            opcoes: [
              "Finalizar o processamento o mais rápido possível",
              "Coletar apenas os dados necessários para um propósito claro e legítimo",
              "Finalizar contratos com fornecedores de dados",
              "Definir uma data final para guardar os dados",
            ],
            respostaCorreta: 1,
            explicacao: "O princípio da Finalidade significa que dados só devem ser coletados e processados para propósitos legítimos, específicos e explícitos.",
          },
        ],
      },
      {
        id: "lgpd-m2",
        trilhaId: "seguranca-lgpd",
        ordem: 2,
        titulo: "Segurança Digital no Dia a Dia",
        descricao: "Hábitos essenciais para manter seus dados e os da instituição seguros.",
        conteudo: `## Segurança Digital — Seus Hábitos Fazem a Diferença! 💻

A maioria dos incidentes de segurança começa com comportamentos simples que podem ser evitados.

### As 5 Regras de Ouro

#### 1. 🔑 Senhas Fortes
- Mínimo 12 caracteres
- Misture letras, números e símbolos
- Use senhas diferentes para cada sistema
- **Nunca compartilhe** sua senha com ninguém

#### 2. 📧 Cuidado com Phishing
Sinais de e-mail suspeito:
- Remetente desconhecido ou domínio estranho
- Urgência exagerada ("Sua conta será bloqueada!")
- Links encurtados ou domínios parecidos mas errados
- Pedido de senha ou dados pessoais

#### 3. 🔒 Autenticação em Dois Fatores (2FA)
Ative sempre que disponível. Mesmo que alguém descubra sua senha, não conseguirá entrar.

#### 4. 💾 Cuidado com o que Você Compartilha
- Não envie documentos sensíveis por WhatsApp pessoal
- Use sempre os canais oficiais da instituição
- Verifique os destinatários antes de enviar

#### 5. 🖥️ Bloqueie Seu Computador
Ao se ausentar da mesa, mesmo que por 2 minutos: **Win+L** (Windows) ou **Ctrl+Cmd+Q** (Mac)`,
        xpRecompensa: 50,
        tempoEstimadoMin: 7,
        quiz: [
          {
            id: "lgpd-m2-q1",
            texto: "O que você deve fazer ao se ausentar da mesa, mesmo brevemente?",
            opcoes: [
              "Deixar como está, volto rápido",
              "Fechar todas as abas do navegador",
              "Bloquear o computador (Win+L ou Ctrl+Cmd+Q)",
              "Desligar o computador",
            ],
            respostaCorreta: 2,
            explicacao: "Bloquear o computador ao se ausentar é uma prática essencial de segurança, mesmo para ausências rápidas. Use Win+L no Windows.",
          },
          {
            id: "lgpd-m2-q2",
            texto: "Qual sinal indica que um e-mail pode ser phishing?",
            opcoes: [
              "Vem de um remetente que você conhece",
              "Tem formatação profissional",
              "Pede urgência e solicita dados pessoais ou senha",
              "Contém imagens da empresa",
            ],
            respostaCorreta: 2,
            explicacao: "E-mails de phishing geralmente criam senso de urgência e pedem dados pessoais, senhas ou que você clique em links. Desconfie sempre.",
          },
        ],
      },
      {
        id: "lgpd-m3",
        trilhaId: "seguranca-lgpd",
        ordem: 3,
        titulo: "Suas Responsabilidades com Dados",
        descricao: "O que fazer (e o que não fazer) ao lidar com dados de alunos e colaboradores.",
        conteudo: `## Responsabilidade com Dados — O Que Cabe a Você 📋

Todos que lidam com dados pessoais são **responsáveis** pelo tratamento adequado dessas informações.

### O Que Você DEVE Fazer ✅

- **Coletar só o necessário**: Se não precisa, não peça
- **Armazenar no local correto**: Use os sistemas institucionais, não pastas pessoais
- **Compartilhar com cautela**: Apenas quem precisa deve ter acesso
- **Reportar incidentes**: Se suspeitar de vazamento, comunique à TI imediatamente
- **Manter dados atualizados**: Dados desatualizados podem causar problemas

### O Que Você NÃO DEVE Fazer ❌

- Enviar dados de alunos por e-mail pessoal
- Usar planilhas pessoais para armazenar dados sensíveis
- Compartilhar listas de alunos com pessoas não autorizadas
- Fotografar telas com dados pessoais visíveis
- Deixar documentos com dados pessoais expostos na mesa

### Em Caso de Incidente 🚨
1. Não entre em pânico
2. Documente o que aconteceu
3. **Comunique à TI** imediatamente pelo sistema de chamados
4. Não tente "resolver" sozinho — pode piorar

### Consequências de Descumprimento
A LGPD prevê multas de até **R$ 50 milhões** por infração. A responsabilidade pode recair sobre a instituição **E** sobre o colaborador individualmente.`,
        xpRecompensa: 50,
        tempoEstimadoMin: 8,
        quiz: [
          {
            id: "lgpd-m3-q1",
            texto: "O que fazer se você suspeitar de um vazamento de dados?",
            opcoes: [
              "Tentar resolver sozinho para não criar alarme",
              "Aguardar para ver se o problema se resolve",
              "Comunicar à TI imediatamente pelo sistema de chamados",
              "Apagar os dados envolvidos imediatamente",
            ],
            respostaCorreta: 2,
            explicacao: "Em caso de incidente, comunique à TI imediatamente. Não tente resolver sozinho — a atuação rápida e coordenada minimiza os danos.",
          },
          {
            id: "lgpd-m3-q2",
            texto: "Onde você DEVE armazenar documentos com dados pessoais?",
            opcoes: [
              "Em pastas pessoais no computador",
              "No WhatsApp para fácil acesso",
              "Nos sistemas institucionais oficiais",
              "Em qualquer nuvem de uso pessoal",
            ],
            respostaCorreta: 2,
            explicacao: "Dados pessoais devem ser armazenados nos sistemas institucionais oficiais, que possuem controles de acesso, backup e segurança adequados.",
          },
          {
            id: "lgpd-m3-q3",
            texto: "Qual é a multa máxima prevista pela LGPD por infração?",
            opcoes: ["R$ 5 mil", "R$ 500 mil", "R$ 5 milhões", "R$ 50 milhões"],
            respostaCorreta: 3,
            explicacao: "A LGPD prevê multas de até 2% do faturamento da empresa, limitado a R$ 50 milhões por infração. As consequências são sérias.",
          },
        ],
      },
    ],
  },

  {
    id: "manual-profissional",
    titulo: "Manual do Profissional",
    descricao: "Tudo que um colaborador precisa saber para ter sucesso na instituição.",
    categoria: "RH & Cultura",
    icone: "📖",
    cor: "from-emerald-500 to-teal-600",
    xpTotal: 250,
    dificuldade: "iniciante",
    missoes: [
      {
        id: "mp-m1",
        trilhaId: "manual-profissional",
        ordem: 1,
        titulo: "Integração e Onboarding",
        descricao: "Os primeiros passos para um início de sucesso.",
        conteudo: `## Bem-vindo à Equipe! 🎉

Os primeiros dias são fundamentais para uma integração bem-sucedida. Este guia vai ajudá-lo a navegar com confiança.

### Sua Primeira Semana

**Dia 1:**
- Reunião com gestor direto e apresentação à equipe
- Configuração de acesso: e-mail, sistemas e Central de Informações
- Tour pelas instalações e setores parceiros

**Semana 1:**
- Conhecer os processos do setor
- Identificar os principais contatos e colaboradores-chave
- Acessar os documentos e manuais relevantes para sua função

### Seu Gestor é Seu Guia
Não hesite em tirar dúvidas com seu gestor direto. Perguntar é sinal de comprometimento, não de despreparo.

### Recursos de Apoio
- **Chamados TI**: Problemas técnicos → Abrir chamado na Central
- **RH/DP**: Dúvidas sobre contrato, benefícios e ponto
- **Colegas de equipe**: Melhor fonte de conhecimento prático do dia a dia`,
        xpRecompensa: 50,
        tempoEstimadoMin: 6,
        quiz: [
          {
            id: "mp-m1-q1",
            texto: "Qual é a postura correta ao ter dúvidas nos primeiros dias?",
            opcoes: [
              "Esperar para descobrir sozinho com o tempo",
              "Procurar respostas apenas na internet",
              "Perguntar ao gestor direto — perguntar demonstra comprometimento",
              "Evitar perguntar para não parecer despreparado",
            ],
            respostaCorreta: 2,
            explicacao: "Perguntar ao gestor e colegas é fundamental para uma boa integração. Demonstra comprometimento e vontade de aprender, não despreparo.",
          },
          {
            id: "mp-m1-q2",
            texto: "Para problemas técnicos (computador, acesso, sistema), onde você deve recorrer?",
            opcoes: ["Ligar para um técnico externo", "Resolver por conta própria", "Abrir chamado na Central de Informações", "Esperar o problema se resolver"],
            respostaCorreta: 2,
            explicacao: "Problemas técnicos devem ser reportados pelo sistema de Chamados na Central de Informações, onde a equipe de TI irá atender.",
          },
        ],
      },
      {
        id: "mp-m2",
        trilhaId: "manual-profissional",
        ordem: 2,
        titulo: "Normas de Conduta",
        descricao: "Entenda as expectativas comportamentais e profissionais da instituição.",
        conteudo: `## Normas de Conduta — Profissionalismo no Dia a Dia 🤝

Uma instituição de educação reflete seus valores em cada interação. Conheça as normas que guiam nosso comportamento.

### Pontualidade e Assiduidade
- Respeite seus horários de entrada, saída e intervalos
- Comunique ausências com antecedência sempre que possível
- Registre o ponto conforme orientação do RH/DP

### Dress Code
- Trajes adequados ao ambiente profissional educacional
- Bom senso e discrição em relação à aparência
- Identificação visível (crachá) sempre que exigido

### Relações Interpessoais
- Trate todos com respeito: colegas, alunos, visitantes e fornecedores
- Resolva conflitos de forma construtiva e direta com as partes envolvidas
- Em situações graves, comunique ao gestor ou RH

### Uso dos Recursos Institucionais
- Equipamentos e sistemas são para uso profissional
- Internet: uso pessoal moderado e responsável é tolerado
- Impressoras e materiais: evite desperdício

### Redes Sociais
- Não publique informações confidenciais sobre a instituição
- Seja responsável com menções à sua função ou à instituição
- Imagens do ambiente de trabalho requerem autorização`,
        xpRecompensa: 50,
        tempoEstimadoMin: 7,
        quiz: [
          {
            id: "mp-m2-q1",
            texto: "Como você deve resolver conflitos com colegas de trabalho?",
            opcoes: [
              "Ignorar o problema e esperar que passe",
              "Reclamar para outros colegas",
              "De forma construtiva e direta com as partes envolvidas, escalando ao RH se necessário",
              "Sempre envolver o RH imediatamente",
            ],
            respostaCorreta: 2,
            explicacao: "Conflitos devem ser resolvidos de forma direta e construtiva. O RH deve ser envolvido somente em situações que não puderam ser resolvidas diretamente.",
          },
          {
            id: "mp-m2-q2",
            texto: "O que você deve ter em mente ao postar nas redes sociais mencionando a instituição?",
            opcoes: [
              "Pode compartilhar qualquer informação, é liberdade de expressão",
              "Não publicar informações confidenciais e ser responsável com menções institucionais",
              "Deve evitar qualquer menção ao trabalho",
              "Só pode postar com aprovação da direção",
            ],
            respostaCorreta: 1,
            explicacao: "Nas redes sociais, evite informações confidenciais e seja responsável com menções à instituição. Imagens do ambiente requerem autorização.",
          },
        ],
      },
      {
        id: "mp-m3",
        trilhaId: "manual-profissional",
        ordem: 3,
        titulo: "Benefícios e RH",
        descricao: "Conheça seus direitos e os benefícios disponíveis.",
        conteudo: `## Seus Benefícios — Conheça o que é seu! 💼

A instituição oferece um pacote de benefícios para valorizar e apoiar seus colaboradores.

### Benefícios Principais

#### 🏥 Plano de Saúde
- Cobertura médica e hospitalar
- Opções de planos (verifique com o DP)
- Carência conforme legislação

#### 🍽️ Vale-Alimentação/Refeição
- Creditado mensalmente em cartão
- Uso em estabelecimentos credenciados
- Valor conforme acordo coletivo

#### 📚 Bolsa de Estudos
- Desconto especial em cursos da instituição (para colaboradores)
- Extensivo a dependentes (verifique condições)
- Solicitação via RH/DP

#### 🚌 Vale-Transporte
- Solicitação no DP
- Declaração de forma de deslocamento

### Dúvidas sobre RH?
Procure o setor de **DP/Financeiro** ou acesse a área dedicada na Central de Informações.

### Vale-Adiantamento
Precisa de adiantamento salarial? Acesse **Portal do Funcionário → Vale-Adiantamento** na Central.`,
        xpRecompensa: 50,
        tempoEstimadoMin: 6,
        quiz: [
          {
            id: "mp-m3-q1",
            texto: "Como você solicita um vale-adiantamento?",
            opcoes: [
              "Pessoalmente no setor financeiro",
              "Por e-mail para o RH",
              "Pelo Portal do Funcionário na Central de Informações",
              "Via WhatsApp para o gestor",
            ],
            respostaCorreta: 2,
            explicacao: "O Vale-Adiantamento é solicitado digitalmente pelo Portal do Funcionário na Central de Informações.",
          },
          {
            id: "mp-m3-q2",
            texto: "Onde você pode obter informações sobre a bolsa de estudos para dependentes?",
            opcoes: ["Na secretaria acadêmica", "No setor de DP/Financeiro", "Diretamente com a direção", "Não existe esse benefício"],
            respostaCorreta: 1,
            explicacao: "Informações sobre benefícios, incluindo bolsa de estudos, devem ser obtidas junto ao setor de DP/Financeiro.",
          },
        ],
      },
      {
        id: "mp-m4",
        trilhaId: "manual-profissional",
        ordem: 4,
        titulo: "Desenvolvimento Profissional",
        descricao: "Como crescer dentro da instituição e continuar aprendendo.",
        conteudo: `## Crescimento — Seu Potencial é Ilimitado! 🚀

A instituição acredita no desenvolvimento contínuo de seus colaboradores. Veja como aproveitar ao máximo.

### Trilhas de Aprendizado (você está aqui! 🎯)
A plataforma de Trilha de Conhecimento oferece:
- Conteúdos sobre processos internos
- Quizzes de validação
- Sistema de XP e níveis
- Badges de conquistas

### Feedback e Avaliação
- **Feedback contínuo**: Converse regularmente com seu gestor
- **Avaliação de desempenho**: Ocorre periodicamente conforme política da instituição
- **Autoavaliação**: Reflita sobre pontos fortes e áreas de melhoria

### Capacitação Externa
- A instituição pode apoiar cursos e treinamentos alinhados à função
- Converse com seu gestor sobre possibilidades
- Bolsa de estudos disponível (veja missão anterior)

### Crescimento Interno
- Demonstre interesse em novas responsabilidades
- Compartilhe conhecimentos com a equipe
- Mantenha bom relacionamento e resultados consistentes

### Sua Jornada Começa Agora 🌱
Cada missão completada aqui é um passo no seu desenvolvimento. Continue explorando as trilhas!`,
        xpRecompensa: 50,
        tempoEstimadoMin: 5,
        quiz: [
          {
            id: "mp-m4-q1",
            texto: "Como a plataforma de Trilha de Conhecimento contribui para seu desenvolvimento?",
            opcoes: [
              "Apenas registra frequência",
              "Oferece conteúdos internos, validação por quizzes e sistema de progressão gamificado",
              "Substitui as avaliações de desempenho",
              "É apenas para novos funcionários",
            ],
            respostaCorreta: 1,
            explicacao: "A Trilha de Conhecimento oferece conteúdos sobre processos internos, validação por quizzes, XP, níveis e badges — tornando o aprendizado engajador e mensurável.",
          },
          {
            id: "mp-m4-q2",
            texto: "Qual é a melhor forma de buscar crescimento dentro da instituição?",
            opcoes: [
              "Esperar uma promoção surgir naturalmente",
              "Demonstrar interesse, compartilhar conhecimentos e manter bons resultados",
              "Procurar oportunidades somente em outras empresas",
              "Fazer apenas o mínimo necessário",
            ],
            respostaCorreta: 1,
            explicacao: "Crescimento interno vem de demonstrar interesse ativo, compartilhar conhecimentos, manter bons relacionamentos e entregar resultados consistentes.",
          },
        ],
      },
      {
        id: "mp-m5",
        trilhaId: "manual-profissional",
        ordem: 5,
        titulo: "Sistemas e Ferramentas",
        descricao: "Domine as ferramentas que você usará no dia a dia.",
        conteudo: `## Ferramentas do Dia a Dia — Seja Produtivo! ⚙️

Conheça as principais ferramentas e sistemas que fazem parte do seu trabalho.

### Google Workspace 🟦
A instituição usa o **Google Workspace** como plataforma principal:

| Ferramenta | Uso |
|-----------|-----|
| **Gmail** | E-mail corporativo oficial |
| **Drive** | Armazenamento e compartilhamento de documentos |
| **Meet** | Videoconferências e reuniões online |
| **Calendar** | Agendamentos e agenda institucional |
| **Chat** | Mensagens rápidas entre colegas |
| **Docs/Sheets** | Criação colaborativa de documentos |

### Central de Informações 🏢
Sua porta de entrada para:
- Chamados e suporte
- Documentos institucionais
- Agendamentos de espaços
- Portal do funcionário

### Dicas de Produtividade
- **Atalhos de teclado**: Aprenda os do Gmail e Drive — economiza muito tempo
- **Organização do Drive**: Mantenha pastas organizadas por projeto/data
- **Notificações**: Configure para não se perder em atualizações importantes
- **Offline**: O Google Drive funciona offline — ative nas configurações

### Precisa de Ajuda com Tecnologia?
Abra um chamado na Central! A equipe de TI está aqui para apoiar.`,
        xpRecompensa: 50,
        tempoEstimadoMin: 6,
        quiz: [
          {
            id: "mp-m5-q1",
            texto: "Qual ferramenta do Google Workspace é usada para armazenar e compartilhar documentos?",
            opcoes: ["Gmail", "Google Meet", "Google Drive", "Google Chat"],
            respostaCorreta: 2,
            explicacao: "O Google Drive é a ferramenta de armazenamento e compartilhamento de documentos no Google Workspace.",
          },
          {
            id: "mp-m5-q2",
            texto: "O que você deve fazer quando tem um problema técnico com um sistema institucional?",
            opcoes: [
              "Tentar resolver reinstalando tudo",
              "Perguntar a um colega que entende de tecnologia",
              "Abrir um chamado na Central de Informações para a equipe de TI",
              "Comprar um software alternativo",
            ],
            respostaCorreta: 2,
            explicacao: "Problemas técnicos devem ser reportados à equipe de TI através do sistema de Chamados na Central, garantindo atendimento adequado e rastreabilidade.",
          },
        ],
      },
    ],
  },

  {
    id: "normas-convivencia",
    titulo: "Normas de Convivência",
    descricao: "Regras e boas práticas para um ambiente de trabalho saudável e respeitoso.",
    categoria: "Cultura",
    icone: "🤝",
    cor: "from-purple-500 to-violet-600",
    xpTotal: 120,
    dificuldade: "iniciante",
    missoes: [
      {
        id: "nc-m1",
        trilhaId: "normas-convivencia",
        ordem: 1,
        titulo: "Respeito e Inclusão",
        descricao: "Construindo um ambiente onde todos se sentem valorizados.",
        conteudo: `## Respeito e Inclusão — A Base de Tudo 🌈

Um ambiente de trabalho saudável começa com o respeito mútuo. Conheça como a instituição promove a inclusão.

### Nosso Compromisso
A instituição é contra qualquer forma de:
- Discriminação por gênero, raça, religião, orientação sexual ou qualquer outra característica
- Assédio moral ou sexual
- Bullying ou comportamentos hostis
- Exclusão intencional de colegas

### Linguagem Inclusiva
- Use linguagem respeitosa e neutra quando adequado
- Evite piadas ou comentários que possam ofender
- Respeite as preferências de pronome quando comunicadas

### Espaços Compartilhados
- Salas de reunião: reserve com antecedência e deixe limpo ao sair
- Copa/Refeitório: organize seus itens e limpe após o uso
- Áreas comuns: mantenha a organização e o silêncio quando necessário

### Diversidade é Força 💪
Equipes diversas tomam melhores decisões. Valorize perspectivas diferentes das suas.

### Deu Errado? Reporte.
Se testemunhar ou sofrer qualquer forma de desrespeito, comunique ao RH. Há garantia de confidencialidade.`,
        xpRecompensa: 40,
        tempoEstimadoMin: 6,
        quiz: [
          {
            id: "nc-m1-q1",
            texto: "O que você deve fazer se testemunhar assédio ou desrespeito no trabalho?",
            opcoes: [
              "Fingir que não viu para não se envolver",
              "Gravar e postar nas redes sociais",
              "Comunicar ao RH com garantia de confidencialidade",
              "Resolver com a pessoa envolvida na hora, em público",
            ],
            respostaCorreta: 2,
            explicacao: "Casos de assédio ou desrespeito devem ser reportados ao RH, que garante confidencialidade e trata o caso de forma adequada.",
          },
          {
            id: "nc-m1-q2",
            texto: "Como devem ser deixadas as salas de reunião após o uso?",
            opcoes: [
              "Do jeito que estiver, a limpeza é responsabilidade da equipe de serviços gerais",
              "Limpas e organizadas, prontas para o próximo usuário",
              "Pode deixar bagunçado se foi uma reunião rápida",
              "Não precisa se preocupar",
            ],
            respostaCorreta: 1,
            explicacao: "Após usar uma sala de reunião, deixe-a limpa e organizada. É uma questão de respeito com os próximos usuários do espaço.",
          },
        ],
      },
      {
        id: "nc-m2",
        trilhaId: "normas-convivencia",
        ordem: 2,
        titulo: "Gestão de Conflitos",
        descricao: "Como lidar com desentendimentos de forma construtiva.",
        conteudo: `## Conflitos — Parte Natural do Trabalho em Equipe ⚡

Conflitos são inevitáveis em qualquer ambiente com pessoas. O que importa é como você os resolve.

### Princípios para Resolução de Conflitos

#### 1. Aborde Diretamente
Antes de escalar, tente resolver diretamente com a pessoa envolvida — em particular, não em público.

#### 2. Ouça Primeiro
Entenda o ponto de vista do outro antes de apresentar o seu. Pergunte: "Como você enxerga essa situação?"

#### 3. Foque no Problema, Não na Pessoa
Critique comportamentos e situações, nunca a personalidade de alguém.
- ❌ "Você é sempre desorganizado"
- ✅ "Notei que este processo não foi seguido — podemos alinhar como melhorar?"

#### 4. Busque Soluções, Não Culpados
O objetivo é resolver, não punir. Pergunte: "O que podemos fazer diferente?"

#### 5. Quando Escalar?
- Quando tentativas diretas não funcionaram
- Quando há questões de assédio ou desrespeito
- Quando o conflito afeta o trabalho da equipe
→ **Procure seu gestor ou o RH**

### Dica de Ouro 🌟
Muitos conflitos surgem de mal-entendidos na comunicação escrita. Antes de se irritar com um e-mail, considere ligar ou conversar pessoalmente.`,
        xpRecompensa: 40,
        tempoEstimadoMin: 7,
        quiz: [
          {
            id: "nc-m2-q1",
            texto: "Qual é a primeira abordagem correta quando há um conflito com um colega?",
            opcoes: [
              "Escalar imediatamente para o gestor ou RH",
              "Ignorar e esperar o tempo resolver",
              "Resolver diretamente com a pessoa, em particular",
              "Discutir em reunião de equipe para todos saberem",
            ],
            respostaCorreta: 2,
            explicacao: "A primeira abordagem deve ser uma conversa direta e em particular com a pessoa envolvida. Escalar é para quando isso não funcionar.",
          },
          {
            id: "nc-m2-q2",
            texto: "Qual é a forma CORRETA de abordar um problema de comportamento?",
            opcoes: [
              "\"Você é sempre desorganizado e isso me irrita\"",
              "\"Notei que este processo não foi seguido — podemos alinhar como melhorar?\"",
              "\"Todo mundo já falou sobre isso, você não muda\"",
              "\"Vou reportar isso ao RH se não melhorar\"",
            ],
            respostaCorreta: 1,
            explicacao: "Críticas eficazes focam no comportamento ou situação específica, não na personalidade. Perguntar como melhorar convida à colaboração.",
          },
          {
            id: "nc-m2-q3",
            texto: "Qual pode ser a causa de conflitos em comunicação por escrito?",
            opcoes: [
              "Pessoas com má intenção",
              "Falta de emojis nos e-mails",
              "Mal-entendidos — o tom pode ser interpretado de forma diferente do pretendido",
              "Erros gramaticais",
            ],
            respostaCorreta: 2,
            explicacao: "E-mails e mensagens podem ser interpretados de formas diferentes do pretendido. Na dúvida, uma conversa direta resolve mal-entendidos mais rapidamente.",
          },
        ],
      },
      {
        id: "nc-m3",
        trilhaId: "normas-convivencia",
        ordem: 3,
        titulo: "Uso Responsável dos Espaços",
        descricao: "Cuidando dos espaços que compartilhamos.",
        conteudo: `## Espaços Compartilhados — Cuidemos Juntos! 🏢

Os espaços da instituição são compartilhados por centenas de pessoas. O cuidado coletivo faz a diferença.

### Regras Gerais dos Espaços

#### 📚 Biblioteca / Área de Estudos
- Silêncio rigoroso
- Celular no modo silencioso
- Organizar materiais ao sair
- Não consumir alimentos

#### 🍽️ Copa / Refeitório
- Identificar alimentos pessoais (nome + data)
- Lavar ou depositar utensílios na área indicada
- Limpar mesas após uso
- Respeitar a ordem na fila

#### 🖥️ Laboratórios e Salas de Informática
- Reservar com antecedência quando necessário
- Não instalar programas sem autorização da TI
- Reportar equipamentos com problemas
- Deixar cadeiras organizadas

#### 🅿️ Estacionamento
- Respeitar as vagas sinalizadas
- Vagas PCD são exclusivas para portadores de necessidades especiais
- Velocidade reduzida na área interna

### Sistema de Reservas 📅
Use o módulo de **Reserva de Espaços** na Central para garantir seu espaço com antecedência!`,
        xpRecompensa: 40,
        tempoEstimadoMin: 5,
        quiz: [
          {
            id: "nc-m3-q1",
            texto: "O que você deve fazer após usar a copa ou refeitório?",
            opcoes: [
              "Deixar para a equipe de limpeza",
              "Lavar ou depositar utensílios na área indicada e limpar a mesa",
              "Só limpar se houver muita sujeira",
              "Avisar ao colega que usará depois",
            ],
            respostaCorreta: 1,
            explicacao: "A responsabilidade pela limpeza após o uso é de quem usou. Lavar utensílios e limpar a mesa é respeito com os próximos usuários.",
          },
          {
            id: "nc-m3-q2",
            texto: "Como você garante o uso de uma sala de reunião ou laboratório?",
            opcoes: [
              "Chegar primeiro e \"ocupar\" o espaço",
              "Usar o módulo de Reserva de Espaços na Central de Informações",
              "Combinar verbalmente com os colegas",
              "Só é possível por e-mail para o gestor do espaço",
            ],
            respostaCorreta: 1,
            explicacao: "O módulo de Reserva de Espaços na Central é a forma oficial de garantir sua reserva com antecedência e evitar conflitos de uso.",
          },
        ],
      },
    ],
  },

  {
    id: "primeiros-socorros",
    titulo: "Primeiros Socorros Básico",
    descricao: "Aprenda a agir com calma e eficácia em situações de emergência.",
    categoria: "Segurança",
    icone: "🩺",
    cor: "from-red-500 to-rose-600",
    xpTotal: 200,
    dificuldade: "intermediario",
    missoes: [
      {
        id: "ps-m1",
        trilhaId: "primeiros-socorros",
        ordem: 1,
        titulo: "Princípios dos Primeiros Socorros",
        descricao: "O que fazer (e o que evitar) antes do socorro profissional chegar.",
        conteudo: `## Primeiros Socorros — Agir com Calma Salva Vidas! 🩺

Saber agir nos primeiros momentos de uma emergência pode fazer a diferença entre a vida e a morte.

### O QUE SÃO Primeiros Socorros?
São as medidas iniciais prestadas a uma vítima **antes da chegada do socorro profissional**. O objetivo é:
- Preservar a vida
- Evitar o agravamento da situação
- Promover a recuperação

### Regra de Ouro: PAS
**Proteger — Alertar — Socorrer**

1. **Proteger**: Certifique-se de que a cena é segura (para você E para a vítima)
2. **Alertar**: Chame socorro (SAMU: 192, Bombeiros: 193, Emergência: 190)
3. **Socorrer**: Preste o auxílio que estiver ao seu alcance

### O Que NÃO Fazer ❌
- Mover uma pessoa com suspeita de lesão na coluna
- Remover objetos encravados
- Dar água ou alimento a pessoa inconsciente
- Entrar em pânico — transmite ansiedade à vítima

### Lembre-se
Você não precisa ser médico para ajudar. Calma, bom senso e a chamada correta ao SAMU já são fundamentais.

### Números de Emergência 🚨
- **SAMU**: 192
- **Bombeiros**: 193
- **Polícia**: 190
- **CVV** (apoio emocional): 188`,
        xpRecompensa: 50,
        tempoEstimadoMin: 8,
        quiz: [
          {
            id: "ps-m1-q1",
            texto: "Qual é a sequência correta dos primeiros socorros (regra PAS)?",
            opcoes: [
              "Socorrer → Alertar → Proteger",
              "Alertar → Socorrer → Proteger",
              "Proteger → Alertar → Socorrer",
              "Proteger → Socorrer → Alertar",
            ],
            respostaCorreta: 2,
            explicacao: "A sequência correta é PAS: Proteger (garantir segurança da cena), Alertar (chamar socorro) e Socorrer (prestar auxílio adequado).",
          },
          {
            id: "ps-m1-q2",
            texto: "Qual é o número do SAMU para emergências médicas?",
            opcoes: ["190", "193", "192", "197"],
            respostaCorreta: 2,
            explicacao: "O SAMU (Serviço de Atendimento Móvel de Urgência) funciona pelo número 192, disponível 24h para emergências médicas.",
          },
          {
            id: "ps-m1-q3",
            texto: "O que você NÃO deve fazer com uma vítima de acidente com suspeita de lesão na coluna?",
            opcoes: [
              "Chamar o SAMU imediatamente",
              "Manter a vítima aquecida",
              "Mover a vítima para uma posição mais confortável",
              "Falar calmamente com a vítima",
            ],
            respostaCorreta: 2,
            explicacao: "Nunca mova uma vítima com suspeita de lesão na coluna sem orientação médica. Movimentos incorretos podem causar paralisia permanente.",
          },
        ],
      },
      {
        id: "ps-m2",
        trilhaId: "primeiros-socorros",
        ordem: 2,
        titulo: "Desmaio e Inconsciência",
        descricao: "Como agir quando alguém desmaia ou perde a consciência.",
        conteudo: `## Desmaio e Inconsciência — Mantenha a Calma! 💫

Desmaios são mais comuns do que pensamos. Saber como agir é fundamental.

### Reconhecendo um Desmaio
Sinais que antecedem o desmaio:
- Palidez súbita
- Suor frio
- Tontura e visão turva
- Fraqueza nas pernas

### Se Alguém Vai Desmaiar (ainda consciente):
1. Segure para evitar queda brusca
2. Deite a pessoa em superfície plana
3. Eleve as pernas (melhora circulação cerebral)
4. Afrouxe roupas apertadas (colar, gravata, cinto)
5. Mantenha o ambiente ventilado

### Se a Pessoa JÁ Desmaiou:
1. **Verifique a segurança** do local
2. **Verifique a consciência**: chame pelo nome, sacuda levemente os ombros
3. **Chame o SAMU (192)** se não responder
4. **Verifique a respiração**: olhe, ouça e sinta por 10 segundos
5. **Posição lateral de segurança** se respirando mas inconsciente
6. Se não respirar → Inicie RCP (próxima missão)

### Posição Lateral de Segurança (PLS)
Deite a pessoa de lado para evitar engasgamento com vômito. Use quando a pessoa está inconsciente MAS respira.`,
        xpRecompensa: 50,
        tempoEstimadoMin: 8,
        quiz: [
          {
            id: "ps-m2-q1",
            texto: "O que fazer quando uma pessoa ainda consciente está prestes a desmaiar?",
            opcoes: [
              "Sentar a pessoa em uma cadeira e dar água",
              "Deitar a pessoa em superfície plana e elevar as pernas",
              "Mantê-la em pé e chamar colegas para apoiar",
              "Dar tapinhas no rosto para ela não desmaiar",
            ],
            respostaCorreta: 1,
            explicacao: "Deitar a pessoa e elevar as pernas melhora o fluxo sanguíneo para o cérebro. Afrouxe roupas e mantenha o ambiente ventilado.",
          },
          {
            id: "ps-m2-q2",
            texto: "Quando se usa a Posição Lateral de Segurança (PLS)?",
            opcoes: [
              "Sempre que alguém desmaiar",
              "Quando a pessoa está inconsciente MAS ainda respirando",
              "Apenas após chamar o SAMU",
              "Quando a pessoa está acordada mas tonta",
            ],
            respostaCorreta: 1,
            explicacao: "A PLS (Posição Lateral de Segurança) é usada quando a vítima está inconsciente mas respirando, para evitar engasgamento com possível vômito.",
          },
        ],
      },
      {
        id: "ps-m3",
        trilhaId: "primeiros-socorros",
        ordem: 3,
        titulo: "Engasgamento",
        descricao: "Como agir rapidamente em casos de engasgamento.",
        conteudo: `## Engasgamento — Segundos Fazem a Diferença! ⚠️

Engasgamento é uma emergência real. A ação rápida e correta salva vidas.

### Identificando o Engasgamento

| Sinal | O Que Significa |
|-------|----------------|
| Tossindo com força | Engasgamento **parcial** — deixe tossir! |
| Mãos na garganta, sem conseguir falar | Engasgamento **total** — aja imediatamente |
| Rosto azulado/roxo (cianose) | Situação crítica |

### Engasgamento PARCIAL (ainda consegue tossir)
✅ **Incentive a pessoa a continuar tossindo**
❌ Não bata nas costas — pode piorar
❌ Não tente remover o objeto com os dedos

### Engasgamento TOTAL — Manobra de Heimlich

**Em Adultos:**
1. Posicione-se atrás da vítima
2. Faça um punho com uma mão, coloque acima do umbigo
3. Cubra com a outra mão
4. Faça compressões para dentro e para cima (5 vezes)
5. Repita até o objeto sair ou a pessoa desmaiar

**Se a pessoa desmaiar:**
→ Deite no chão
→ Chame SAMU (192)
→ Inicie RCP

### Em Bebês (< 1 ano)
⚠️ Técnica diferente! Não use Heimlich em bebês.
- 5 tapas nas costas + 5 compressões no tórax
- Sempre chamar o SAMU imediatamente`,
        xpRecompensa: 50,
        tempoEstimadoMin: 7,
        quiz: [
          {
            id: "ps-m3-q1",
            texto: "O que fazer se alguém está engasgado mas ainda consegue tossir com força?",
            opcoes: [
              "Aplicar imediatamente a manobra de Heimlich",
              "Bater nas costas 5 vezes",
              "Incentivá-la a continuar tossindo e monitorar",
              "Tentar remover o objeto com os dedos",
            ],
            respostaCorreta: 2,
            explicacao: "No engasgamento parcial (ainda consegue tossir), incentive a pessoa a tossir. Tossir é o mecanismo natural mais eficaz para expelir o objeto.",
          },
          {
            id: "ps-m3-q2",
            texto: "Na manobra de Heimlich, onde você posiciona o punho?",
            opcoes: [
              "No centro do peito (esterno)",
              "Acima do umbigo e abaixo do esterno",
              "Nas costas da vítima",
              "No pescoço da vítima",
            ],
            respostaCorreta: 1,
            explicacao: "Na manobra de Heimlich, o punho é posicionado acima do umbigo e abaixo do esterno, fazendo compressões para dentro e para cima.",
          },
          {
            id: "ps-m3-q3",
            texto: "Pode-se usar a manobra de Heimlich em bebês com menos de 1 ano?",
            opcoes: [
              "Sim, da mesma forma que em adultos",
              "Não — bebês têm técnica diferente (tapas nas costas + compressões torácicas)",
              "Sim, mas com menos força",
              "Não, não se deve fazer nada e ligar para o SAMU",
            ],
            respostaCorreta: 1,
            explicacao: "Em bebês abaixo de 1 ano, a técnica é diferente: 5 tapas nas costas seguidos de 5 compressões no tórax. Nunca use Heimlich em bebês.",
          },
        ],
      },
      {
        id: "ps-m4",
        trilhaId: "primeiros-socorros",
        ordem: 4,
        titulo: "Cortes, Quedas e Emergências Comuns",
        descricao: "Como lidar com as situações mais frequentes no dia a dia.",
        conteudo: `## Situações Comuns — Esteja Preparado! 🩹

Quedas e pequenos acidentes acontecem. Saiba como agir de forma eficaz.

### Cortes e Sangramentos

#### Sangramento Leve/Moderado:
1. Lave as mãos ou use luvas descartáveis
2. Comprima com gaze ou pano limpo por 5-10 minutos
3. **Não** retire a compressa (se ensanchar, coloque mais por cima)
4. Eleve o membro ferido acima do nível do coração
5. Limpe e cubra com curativo quando o sangramento ceder

#### Sangramento Grave (não para com pressão):
→ **Chame SAMU (192) imediatamente**
→ Mantenha a compressão constante
→ Não remova objetos encravados — estabilize-os

### Quedas

**Avalie antes de mover:**
- A pessoa está consciente?
- Há suspeita de lesão na coluna? (pescoço ou costas)

**Com suspeita de lesão na coluna → NÃO MOVA. Chame SAMU.**

**Sem suspeita de lesão na coluna:**
- Ajude a pessoa a sentar devagar
- Verifique dor, inchaço ou deformidade óssea
- Se suspeitar de fratura → SAMU
- Se for queda simples: compressa de gelo no local

### Queimaduras Leves
1. Resfrie com água fria corrente por 10-15 minutos
2. Não use pasta de dente, manteiga ou gelo
3. Não estoure bolhas
4. Cubra com gaze úmida

### Kit de Primeiros Socorros 🧰
Onde fica o kit na sua área? Saiba antes de precisar!`,
        xpRecompensa: 50,
        tempoEstimadoMin: 9,
        quiz: [
          {
            id: "ps-m4-q1",
            texto: "Ao tratar um corte com sangramento, o que fazer se a gaze ensopar de sangue?",
            opcoes: [
              "Retirar e trocar por gaze limpa",
              "Colocar mais gaze por cima sem remover a primeira",
              "Limpar o ferimento com álcool",
              "Remover o coágulo formado",
            ],
            respostaCorreta: 1,
            explicacao: "Nunca retire a gaze — ao remover, você desfaz o coágulo. Coloque mais gaze por cima e mantenha a pressão.",
          },
          {
            id: "ps-m4-q2",
            texto: "Como tratar uma queimadura leve imediatamente?",
            opcoes: [
              "Aplicar pasta de dente para refrescar",
              "Aplicar manteiga ou óleo para hidratar",
              "Resfriar com água fria corrente por 10-15 minutos",
              "Estourar as bolhas para liberar o líquido",
            ],
            respostaCorreta: 2,
            explicacao: "Resfrie queimaduras leves com água fria corrente por 10-15 minutos. Pasta de dente, manteiga e gelo são prejudiciais e devem ser evitados.",
          },
        ],
      },
    ],
  },
];

// ── Badges Mock ───────────────────────────────────────────────
export const BADGES_MOCK: Badge[] = [
  {
    id: "badge-primeira-missao",
    nome: "Primeira Missão",
    descricao: "Completou sua primeira missão na plataforma",
    icone: "🎯",
    cor: "from-amber-400 to-yellow-500",
    desbloqueadoEm: "2026-05-15",
  },
  {
    id: "badge-trilha-cci",
    nome: "Guardião do CCI",
    descricao: "Concluiu a trilha Missão do CCI",
    icone: "🏫",
    cor: "from-orange-400 to-amber-500",
  },
  {
    id: "badge-lgpd",
    nome: "Protetor de Dados",
    descricao: "Concluiu a trilha Segurança e LGPD",
    icone: "🔒",
    cor: "from-blue-400 to-indigo-500",
  },
  {
    id: "badge-manual",
    nome: "Profissional Completo",
    descricao: "Concluiu a trilha Manual do Profissional",
    icone: "⭐",
    cor: "from-emerald-400 to-teal-500",
  },
  {
    id: "badge-streak-7",
    nome: "Semana Perfeita",
    descricao: "Manteve 7 dias consecutivos de streak",
    icone: "🔥",
    cor: "from-red-400 to-orange-500",
  },
  {
    id: "badge-streak-30",
    nome: "Mês Dedicado",
    descricao: "Manteve 30 dias consecutivos de streak",
    icone: "🏆",
    cor: "from-purple-400 to-violet-500",
  },
  {
    id: "badge-quiz-perfeito",
    nome: "Quiz Perfeito",
    descricao: "Acertou todas as perguntas de um quiz sem errar",
    icone: "💯",
    cor: "from-pink-400 to-rose-500",
  },
  {
    id: "badge-primeiros-socorros",
    nome: "Salva-Vidas",
    descricao: "Concluiu a trilha de Primeiros Socorros",
    icone: "🩺",
    cor: "from-red-400 to-rose-500",
  },
];

// ── Ranking Mock ───────────────────────────────────────────────
export const RANKING_MOCK: RankingEntry[] = [
  { posicao: 1, nome: "Ana Costa",     iniciais: "AC", xpSemana: 340, nivel: 4, cor: "from-amber-400 to-orange-500" },
  { posicao: 2, nome: "Carlos Lima",   iniciais: "CL", xpSemana: 280, nivel: 3, cor: "from-blue-400 to-indigo-500" },
  { posicao: 3, nome: "Maria Santos",  iniciais: "MS", xpSemana: 220, nivel: 3, cor: "from-emerald-400 to-teal-500" },
  { posicao: 4, nome: "João Ferreira", iniciais: "JF", xpSemana: 180, nivel: 2, cor: "from-purple-400 to-violet-500" },
  { posicao: 5, nome: "Paula Rocha",   iniciais: "PR", xpSemana: 150, nivel: 2, cor: "from-pink-400 to-rose-500" },
];

// ── User Progress Mock ─────────────────────────────────────────
export const USER_PROGRESS_MOCK: UserProgress = {
  xpTotal: 150,
  nivel: 2,
  xpProximoNivel: 300,
  streakDias: 3,
  missoesCompletas: 3,
  trilhasCompletas: 0,
  progressoPorTrilha: {
    "missao-cci": ["cci-m1", "cci-m2", "cci-m3"],
  },
};
