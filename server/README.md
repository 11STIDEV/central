# API – Unidade organizacional (Google Admin SDK)

Esta API **não armazena dados**. Ela só consulta o **Google Admin SDK Directory** para obter a unidade organizacional (OU) do usuário logado e devolver ao frontend, que usa a OU para definir permissões (TI, Financeiro, Almoxarifado, etc.).

## O que você precisa

1. **Google Cloud** – mesmo projeto onde está o OAuth Client ID do frontend.
2. **Google Workspace** – domínio (ex.: portalcci.com.br) com Admin ativo.
3. **Conta de admin** – um e-mail de administrador do Workspace (ex.: `admin@portalcci.com.br`).

## Passo a passo

### 1. Habilitar a API no Google Cloud

- Acesse [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Library**.
- Procure por **Admin SDK API** e **habilite** no projeto.

### 2. Criar uma Service Account

- **APIs & Services** → **Credentials** → **Create Credentials** → **Service account**.
- Dê um nome (ex.: `central-connect-ou`) e conclua.
- Na lista, clique na service account criada → aba **Keys** → **Add key** → **Create new key** → **JSON**. O arquivo será baixado.
- **Domain-Wide Delegation**: na mesma tela, marque **Enable Google Workspace Domain-wide Delegation** e anote o **Client ID** da service account (número longo).

### 3. Autorizar a Service Account no Google Admin

- Acesse [admin.google.com](https://admin.google.com) → **Segurança** → **Controles de acesso** → **Controles de acesso a dados da API** (ou procure por “Domain-wide delegation”).
- Clique em **Adicionar novo** (ou **Manage Domain Wide Delegation**).
- **Client ID**: cole o Client ID da service account (passo 2).
- **Escopos OAuth**: adicione exatamente:
  ```
  https://www.googleapis.com/auth/admin.directory.user.readonly
  ```
- Salve.

### 4. Variáveis de ambiente no servidor

Na pasta `server/`, crie um arquivo `.env` (use o `.env.example` como base):

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Mesmo Client ID OAuth do frontend (o que está no `.env.local` como `VITE_GOOGLE_CLIENT_ID`). |
| `GOOGLE_ADMIN_IMPERSONATE` | E-mail de um **admin** do Google Workspace (ex.: `admin@portalcci.com.br`). Será usado como “subject” nas chamadas ao Admin SDK. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Conteúdo **completo** do JSON da chave (uma linha). **Ou** use `GOOGLE_SERVICE_ACCOUNT_PATH` para apontar para um arquivo. |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | Caminho para o arquivo JSON da chave (ex.: `./service-account-key.json`). Não commite esse arquivo. |
| `DOMINIO_PERMITIDO` | (Opcional) Domínio permitido; padrão: `@portalcci.com.br`. |
| `PORT` | (Opcional) Porta da API; padrão: `3001`. |

**Exemplo de `.env`** (usando arquivo da chave):

```env
GOOGLE_CLIENT_ID=986687009371-xxxx.apps.googleusercontent.com
GOOGLE_ADMIN_IMPERSONATE=admin@portalcci.com.br
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
```

Coloque o JSON baixado da service account em `server/service-account-key.json` (e não faça commit).

### 5. Rodar a API

Na pasta do projeto:

```bash
cd server
npm install
npm run dev
```

A API sobe em `http://localhost:3001`. O frontend (Vite) está configurado para fazer proxy de `/api` para essa porta em desenvolvimento.

### 6. Testar

- **É obrigatório** ter **dois** processos em desenvolvimento: o Vite (`npm run dev` na raiz) **e** a API (`npm run dev` em `server/`). Se só o Vite estiver no ar, `POST /api/organizacao` falha e o `orgUnitPath` fica `undefined`.
- Faça login com uma conta `@portalcci.com.br`.
- O frontend chama `POST /api/organizacao` com o ID token e recebe `{ orgUnitPath: "/...", email: "..." }`.
- Os papéis são calculados no frontend em `mapearPapeis` com base no caminho exato da OU (ver `OU_PARA_PAPEL` em `src/auth/AuthProvider.tsx`).

### Problemas comuns: `orgUnitPath` vem `undefined` no console

1. **API não está rodando** – Inicie `cd server && npm run dev` (porta **3001**). No navegador (modo dev), o console mostra `[api/organizacao] falha de rede ou servidor parado...` se a conexão cair.
2. **`GOOGLE_CLIENT_ID` diferente do frontend** – O valor em `server/.env` deve ser **o mesmo** que `VITE_GOOGLE_CLIENT_ID` no `.env.local` da raiz (mesmo Client ID OAuth). Espaços extras no `.env` são ignorados; você pode listar mais de um ID separado por vírgula se precisar.
3. **Erro 500 na API** – Veja o terminal do Node: falta service account, `GOOGLE_ADMIN_IMPERSONATE`, ou escopo/domain-wide delegation incorreto. O console do navegador mostra `[api/organizacao] erro: ...` com a mensagem retornada.

## Mapeamento OU → papéis (frontend)

O mapeamento está em `src/auth/AuthProvider.tsx` (`OU_PARA_PAPEL` + `mapearPapeis`): cada caminho de OU do Workspace corresponde a um papel (ex.: `/Administrativo/DP` → `dp`, `/Administrativo/Almoxarifado` → `almoxarifado`). Ajuste a tabela se os caminhos no Admin forem diferentes.

As **permissões por rota** (quem acessa TI, almox, financeiro de vales, etc.) ficam em `src/auth/routeAccess.ts` (`ROTAS_PAPEIS_OBRIGATORIOS` + `canAccessRoute`).
