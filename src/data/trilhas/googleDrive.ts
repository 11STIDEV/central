import type { Trilha } from "@/data/trilhasMock";

export const trilhaGoogleDrive: Trilha = {
  id: "google-drive",
  titulo: "Google Drive — Drives Compartilhados",
  descricao: "Aprenda a usar os Drives compartilhados do Google Workspace no dia a dia do CCI.",
  categoria: "Ferramentas",
  icone: "📁",
  cor: "from-blue-500 to-cyan-600",
  xpTotal: 150,
  dificuldade: "iniciante",
  missoes: [
    {
      id: "gd-m1",
      trilhaId: "google-drive",
      ordem: 1,
      titulo: "Drives compartilhados vs. Meu Drive",
      descricao: "Entenda a diferença e quando usar cada um.",
      conteudo: `## O que são Drives compartilhados?

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
- Arquivos que precisam sobreviver à troca de colaboradores`,
      xpRecompensa: 50,
      tempoEstimadoMin: 6,
      quiz: [
        {
          id: "gd-m1-q1",
          texto: "Qual a principal vantagem do Drive compartilhado?",
          opcoes: [
            "Arquivos pertencem a uma pessoa só",
            "Arquivos pertencem à equipe/setor e permanecem com o grupo",
            "Não permite compartilhamento",
            "Só funciona no celular",
          ],
          respostaCorreta: 1,
          explicacao: "Em drives compartilhados, os arquivos pertencem ao time, não ao indivíduo que os criou.",
        },
      ],
    },
    {
      id: "gd-m2",
      trilhaId: "google-drive",
      ordem: 2,
      titulo: "Boas práticas no CCI",
      descricao: "Organização, nomenclatura e permissões.",
      conteudo: `## Boas práticas nos Drives compartilhados

### Organização
- Use **pastas por ano, setor ou projeto** (ex.: \`2026/Secretaria/Comunicados\`)
- Nomeie arquivos de forma clara: \`AAAA-MM-DD_assunto_responsavel\`
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
- Verifique se está no drive **correto do seu setor** antes de salvar`,
      xpRecompensa: 50,
      tempoEstimadoMin: 7,
      quiz: [
        {
          id: "gd-m2-q1",
          texto: "Onde devem ficar documentos oficiais do setor?",
          opcoes: ["No Meu Drive pessoal", "No Drive compartilhado do setor", "No e-mail", "Na área de trabalho do PC"],
          respostaCorreta: 1,
          explicacao: "Documentos oficiais devem ficar no drive compartilhado do setor para continuidade e governança.",
        },
        {
          id: "gd-m2-q2",
          texto: "Qual permissão permite editar arquivos no dia a dia?",
          opcoes: ["Leitor", "Comentador", "Colaborador", "Nenhuma"],
          respostaCorreta: 2,
          explicacao: "Colaborador permite editar; leitor só visualiza e comentador só comenta.",
        },
        {
          id: "gd-m2-q3",
          texto: "Por que evitar várias cópias do mesmo arquivo?",
          opcoes: [
            "Ocupa menos espaço visual",
            "Gera versões conflitantes e perda de rastreabilidade",
            "É mais rápido para o Google",
            "Não há problema em duplicar",
          ],
          respostaCorreta: 1,
          explicacao: "Múltiplas cópias geram confusão sobre qual é a versão oficial e dificultam o trabalho em equipe.",
        },
      ],
    },
  ],
};
