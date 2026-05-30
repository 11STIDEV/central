# Dashboard — Checklist de Matrículas e Renovações 2027

Mini "SaaS" para visualizar e atualizar sua planilha de checklist de matrículas, rodando **direto dentro do Google** com Apps Script + Web App. A planilha continua sendo o "banco de dados"; o dashboard é só uma interface bonita por cima.

## O que vem pronto

- **Visão geral** com KPIs (total de alunos, progresso médio, alertas) e gráfico de situação
- **Lista de alunos** com busca por nome/código e filtros por situação
- **Alertas** com alunos em situação Crítica/Atenção priorizados por menor progresso
- **Etapas** com barra empilhada (Concluído / Em andamento / Pendente) por etapa
- **Detalhe do aluno** em painel lateral com **edição inline** dos status (escreve direto na planilha)
- **Cache** de 30s para a planilha ficar leve mesmo com muita gente acessando
- **Menu na planilha** ("📊 Dashboard") para abrir o app rápido

## Pré-requisitos

- Sua planilha de matrículas aberta (a que aparece nos prints)
- A aba precisa ter:
  - Linha **4**: títulos das etapas (Concluído, Número matrícula, etc.)
  - Linha **5 em diante**: dados dos alunos
  - Coluna **A**: Código · Coluna **B**: Nome
  - Coluna **S**: Andamento · Coluna **T**: Situação da Matrícula
- Se sua planilha estiver diferente, ajuste o objeto `CONFIG` no topo de `Code.gs`.

## Passo a passo de deploy

### 1) Abra o editor de Apps Script
Na planilha → menu **Extensões** → **Apps Script**.

### 2) Crie os 4 arquivos
No editor, crie **exatamente** estes arquivos (mesmo nome, sem extensão extra):

| Arquivo no editor   | Tipo | Cole o conteúdo de   |
|---------------------|------|----------------------|
| `Code.gs`           | gs   | `Code.gs`            |
| `Index.html`        | html | `Index.html`         |
| `Stylesheet.html`   | html | `Stylesheet.html`    |
| `JavaScript.html`   | html | `JavaScript.html`    |
| `appsscript.json`   | json | `appsscript.json` (clique no ⚙ "Configurações do projeto" e marque "Mostrar arquivo de manifesto") |

> Dica: para criar HTML, clique no **+** ao lado de "Arquivos" → **HTML**. Apague o conteúdo inicial e cole o do repositório.

### 3) Ajuste o `CONFIG`
No topo de `Code.gs`, confira:

```js
const CONFIG = {
  SHEET_NAME: 'Página1',  // <- nome real da sua aba
  HEADER_ROW: 4,
  DATA_START_ROW: 5,
  COL_CODIGO: 'A',
  COL_NOME: 'B',
  COL_ANDAMENTO: 'S',
  COL_SITUACAO: 'T',
  ...
};
```

### 4) Deploy como Web App
1. Clique em **Implantar** → **Nova implantação**.
2. Tipo: **Aplicativo da Web**.
3. Descrição: `Dashboard Matrículas v1`.
4. **Executar como**: `Usuário que acessa a aplicação` *(recomendado para escola — cada um usa com a própria conta Google)*.
5. **Quem tem acesso**: `Qualquer pessoa do <seu domínio>` (ou "Qualquer um com conta Google" se a equipe usa Gmail pessoal).
6. **Implantar** → conceda as permissões → copie a URL do Web App.

> Importante: como `executeAs: USER_DEPLOYING` está como `USER_DEPLOYING` no manifesto, o app vai pedir permissão a cada usuário na primeira vez. Isso garante que cada pessoa só veja/edite o que ela tem permissão na planilha.

### 5) Pronto!
- Acesse a URL do Web App.
- Ou, dentro da planilha, use o menu **📊 Dashboard → Abrir dashboard** (aparece após salvar e recarregar a planilha).

## Permissões na prática

- A equipe precisa ter **acesso à planilha** (Editor) para conseguir editar status pelo dashboard.
- Quem só tiver acesso de **Leitura** vai ver tudo, mas o "Salvar" vai falhar (a planilha não permite a escrita).

## Personalização rápida

- **Cores/tema**: edite as variáveis CSS no topo de `Stylesheet.html` (`--accent`, `--bg`, etc.).
- **Mais etapas**: basta adicionar novas colunas entre `B` (nome) e `S` (andamento). O dashboard descobre sozinho.
- **Outros status**: adicione valores em `CONFIG.STATUS_VALUES` e atualize o `<select>` no `JavaScript.html`.
- **Cache**: ajuste `CONFIG.CACHE_TTL` (em segundos) para mais frescor vs. menos chamadas.

## Estrutura do projeto

```
apps-script-checklist-matriculas/
├── appsscript.json   # manifesto (timezone, V8, webapp)
├── Code.gs           # backend (API exposta ao front + menu na planilha)
├── Index.html        # esqueleto da página + sidebar + drawer
├── Stylesheet.html   # CSS (tema dark + roxo)
├── JavaScript.html   # client-side (router, render, edição inline)
└── README.md         # este arquivo
```

## Solução de problemas

| Sintoma | Provável causa | Solução |
|---|---|---|
| "Aba não encontrada" | `SHEET_NAME` errado | Verifique o nome exato no rodapé da planilha |
| Tabela vazia | Linhas em `DATA_START_ROW` em branco ou headers fora da `HEADER_ROW` | Ajuste o `CONFIG` |
| Edição não salva | Usuário só tem acesso de leitura | Compartilhe a planilha como Editor |
| "Atualização" não reflete | Cache de 30s | Clique em **↻ Atualizar** no canto inferior |

## Próximos passos (ideias)

- Notificações por e-mail quando um aluno entra em "Crítica"
- Export PDF do detalhe do aluno
- Histórico de mudanças (audit log em outra aba)
- Visão por turma/série quando essa coluna existir

Bom uso! 🚀
