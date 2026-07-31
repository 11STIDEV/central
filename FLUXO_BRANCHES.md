# Fluxo de branches — equipe Central

Repositório: https://github.com/11STIDEV/central.git

## Branches

| Branch    | Uso                                      |
|-----------|------------------------------------------|
| `main`    | Código estável — só entra via Pull Request |
| `jediael` | Branch de trabalho do Jediael            |
| `thiago`  | Branch de trabalho do Thiago             |
| `yuri`    | Branch de trabalho do Yuri               |
| `producao`| **Descontinuada** — não usar (ver abaixo) |

---

## Setup inicial (cada dev, 1 vez)

```powershell
git clone https://github.com/11STIDEV/central.git
cd central
git checkout thiago   # troque por jediael ou yuri
```

Copie o arquivo `.env.local` (não vai para o Git) e instale as dependências:

```powershell
npm install
npm run dev
```

---

## Rotina diária

### 1. Antes de começar a trabalhar

Trazer as mudanças da `main` para a sua branch:

```powershell
git checkout thiago          # sua branch
git fetch origin
git merge origin/main
```

### 2. Durante o trabalho

```powershell
git add .
git commit -m "descrição clara do que foi feito"
git push origin thiago
```

### 3. Quando estiver pronto para integrar

1. Atualize com a `main` (passo 1 acima)
2. Abra um **Pull Request** no GitHub: `thiago` → `main`
3. Peça revisão de outro dev
4. Faça o **merge** na `main`
5. Depois do merge, sincronize de novo:

```powershell
git fetch origin
git merge origin/main
git push origin thiago
```

---

## Regras da equipe

- Ninguém commita direto na `main`
- Sempre atualizar com `main` antes de começar o dia
- Pull Request obrigatório para integrar na `main`
- Avise no grupo quando duas pessoas forem mexer no mesmo arquivo
- Commits com mensagem clara

---

## Proteção da branch `main` (admin do repo)

A proteção ainda precisa ser ativada no GitHub. Escolha uma opção:

### Opção A — Interface do GitHub

1. Acesse https://github.com/11STIDEV/central/settings/branches
2. **Add branch protection rule**
3. Branch name pattern: `main`
4. Marque **Require a pull request before merging**
5. (Opcional) **Require approvals**: 1
6. Salve

### Opção B — GitHub CLI

```powershell
gh auth login
.\scripts\enable-main-protection.ps1
```

---

## Branch `producao` — decisão da equipe

**Status: descontinuada.**

A branch `producao` está 49 commits atrás da `main` e não será mais usada no fluxo de trabalho.

- Use **`main`** como referência estável e destino dos Pull Requests
- Não crie branches pessoais a partir de `producao`
- A branch `producao` permanece no repositório por histórico, mas não deve receber novos commits
- Se algum deploy ainda apontar para `producao`, atualize o pipeline para usar `main`

---

## Resumo rápido

| Momento        | Comando / ação                          |
|----------------|-----------------------------------------|
| Início do dia  | `git merge origin/main` na sua branch   |
| Durante o dia  | commits + `git push` na sua branch      |
| Tarefa pronta  | Pull Request → `main`                   |
| Após merge     | `git merge origin/main` na sua branch   |
