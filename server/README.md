# API – Unidade organizacional (Google Admin SDK)

Esta API **não armazena dados**. Ela só consulta o **Google Admin SDK Directory** para obter a unidade organizacional (OU) do usuário logado e devolver ao frontend, que usa a OU para definir permissões (TI, Financeiro, Almoxarifado, etc.).

## Checklist (resumo)

| # | O quê | Onde |
|---|--------|------|
| 1 | **Admin SDK API** habilitada | Google Cloud → Library |
| 2 | **Service account** + JSON de chave + **Domain-Wide Delegation** ligada | Google Cloud → Credentials |
| 3 | No **Admin do Workspace**: Client ID **numérico da service account** (não o OAuth do app) + escopo `.../admin.directory.user.readonly` | [admin.google.com](https://admin.google.com) → Segurança / API controls |
| 4 | `server/.env` com `GOOGLE_CLIENT_ID` (igual ao `VITE_GOOGLE_CLIENT_ID`), `GOOGLE_ADMIN_IMPERSONATE`, `GOOGLE_SERVICE_ACCOUNT_PATH` (ou `JSON`) | pasta `server/` |
| 5 | `npm run dev` na **raiz** (Vite) e `npm run dev` em **`server/`** (porta 3001) | dois terminais, ou `npm run dev:all` na raiz |
| 6 | No browser: login Google → a Central chama `POST /api/organizacao` → resposta com `orgUnitPath` | DevTools / rede |

> **Atenção:** no passo 3, o “Client ID” colado no Admin é o da **service account** (só números, tela de detalhes da conta de serviço). **Não** use o `xxx.apps.googleusercontent.com` do login OAuth do front — esse outro ID só vai em `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` para validar o token do usuário.

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
| `GOOGLE_CLIENT_ID` | O **Client ID** do **OAuth 2.0 (tipo Web app)** usado no login — o mesmo do `.env.local` da raiz (`VITE_GOOGLE_CLIENT_ID`). Não confundir com o ID numérico da service account. |
| `GOOGLE_ADMIN_IMPERSONATE` | E-mail de um **admin** do Google Workspace (ex.: `admin@portalcci.com.br`). Será usado como “subject” nas chamadas ao Admin SDK. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Conteúdo **completo** do JSON da chave (uma linha). **Ou** use `GOOGLE_SERVICE_ACCOUNT_PATH` para apontar para um arquivo. |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | Caminho para o arquivo JSON da chave (ex.: `./service-account-key.json`). Não commite esse arquivo. |
| `DOMINIOS_PERMITIDOS` | E-mails cujo sufixo pode usar a API (vírgula). Alinhe aos domínios do Workspace (ex.: `@portalcci.com.br`). |
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
4. **HTTP 405** em `POST /api/organizacao` – o pedido **não chegou** ao Node (Método não permitido noutro serviço). Causas típicas: **proxy do Vite em dev** (Windows / acesso por IP na LAN) a falhar; use o código atual que em desenvolvimento chama `http://<host>:3001` direto (API com CORS), ou defina `VITE_USE_VITE_PROXY=1` no `.env.local` só se quiser forçar o proxy `/api`. Também: `vite preview` com a API em :3001 parada; ou **deploy** só estático. **Coolify / Docker:** ver secção *Coolify* abaixo (um serviço) ou proxy com **POST** em `/api`. Origens diferentes no build: `VITE_API_BASE_URL`.

## Coolify (recomendado: um serviço só)

Use **um único** recurso a correr a imagem do **`Dockerfile` na raiz** do repositório. O Node serve **API** (`/api/...`) e ficheiros estáticos do Vite (`dist/`) no **mesmo** processo e porta, para o browser fazer `POST` relativo a `/api/organizacao` na mesma origem e deixar de receber 405 de um *static* à parte.

1. **Novo serviço** → base **Dockerfile** (caminho: `Dockerfile` na raiz), **não** escolher só “ficheiros estáticos” / *static site* com o `dist` isolado.
2. **Porta do contentor** exposta: **3001** (igual ao `EXPOSE` e ao `PORT` padrão da imagem). O domínio do Coolify deve reencaminhar o tráfego **HTTP** para essa porta do contentor, sem trocar o `POST` por servir ficheiro.
3. **Build Arguments** (Vite, embutidos no *bundle*): `VITE_GOOGLE_CLIENT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SCHOOL_SLUG`, e opcionais do painel que estiverem no `Dockerfile`. Com um só serviço, **não** defina `VITE_API_BASE_URL` (o front usa a mesma origem).
4. **Variáveis de ambiente** (runtime, servidor): as do `server/.env.example` — em especial `GOOGLE_CLIENT_ID` (igual ao `VITE_GOOGLE_CLIENT_ID`), `GOOGLE_ADMIN_IMPERSONATE`, `GOOGLE_SERVICE_ACCOUNT_JSON` (recomendado) ou ficheiro montado + `GOOGLE_SERVICE_ACCOUNT_PATH`, `DOMINIOS_PERMITIDOS`, e se usar painel, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAINEL_SCHOOL_SLUG`.
5. **Verificação** — use **`curl`**, não só o browser aberto na barra de endereço (ver ponto *404 com layout da aplicação* abaixo).

#### “404 com menu lateral / layout da Central” em `/api/health`

Isto **não** vem do Node. O servidor devolveu o **`index.html`** do React (Nginx, Caddy, Traefik ou *static* com regra *SPA* `try_files … /index.html` para **tudo**, incluindo `/api/...`), o React inicia, o router **não** tem rota para `/api/health` e mostra a tua *page* 404. Se o tráfego chegasse ao Express, veríamos JSON: `{"ok":true}`.

- Confirma no terminal (no Windows PowerShell costuma ser `curl.exe -sI "https://<domínio>/api/health"`). A resposta tem de trazer `Content-Type: application/json` e o corpo `{"ok":true}`. Se for `text/html`, o *proxy* ainda manda tudo para o *fallback* do SPA, **não** para o `node index.js` na 3001.
- **Correção:** no Coolify o domínio `central.portalcci.com.br` (ou o que uses) tem de apontar o **alvo** para **um** serviço Docker (imagem com `EXPOSE 3001`), **sem** *static* à frente, **e** o proxy não pode aplica a regra “qualquer 404 → `index.html`” a caminhos que comecem com `/api` — a prioridade de rota é `/api` → contentor, depois o resto.

### Ainda vê 405 no POST /api/organizacao?

- **A app está em modo *static*?** Nesse tipo de deploy o Coolify costuma pôr Nginx na frente; **POST** a `/api` dá **405** porque o Nginx trata a rota como ficheiro estático (só GET/HEAD). **Desative** *Is it a static site* e use **só** o **Dockerfile** (Node) com **um** serviço; não misture *static* com a mesma app se a API for no Node.
- **Teste** no servidor ou no PC: `curl -sS "https://<domínio>/api/health"` — tem de sair `{"ok":true}`. Se for HTML ou 405, o tráfego **não** chega ao `node index.js` da imagem.
- Se no Coolify tiveres **dois** recursos (estático + API) com **URLs distintas**, no build (ou com variável de runtime no servidor) define a base da API: **`VITE_API_BASE_URL`** no *build* ou **`CENTRAL_API_BASE_URL`** / **`PUBLIC_API_URL`** no *runtime* (o servidor injeta no `index.html` a meta `central-api-base`).

## Mapeamento OU → papéis (frontend)

O mapeamento está em `src/auth/AuthProvider.tsx` (`OU_PARA_PAPEL` + `mapearPapeis`): cada caminho de OU do Workspace corresponde a um papel (ex.: `/Administrativo/DP` → `dp`, `/Administrativo/Almoxarifado` → `almoxarifado`). Ajuste a tabela se os caminhos no Admin forem diferentes.

As **permissões por rota** (quem acessa TI, almox, financeiro de vales, etc.) ficam em `src/auth/routeAccess.ts` (`ROTAS_PAPEIS_OBRIGATORIOS` + `canAccessRoute`).

## Depois que a OU estiver carregando

- As rotas e o painel de senhas usam **OUs** mapeadas no frontend (ver seção “Mapeamento OU” acima). Não há mais bypass por e-mail no `.env.local` da raiz.
- `VITE_PAINEL_DB_ONLY` continua a servir **só** para pular o Auth do Supabase no painel, se quiser; isso **não** afeta a leitura da OU (API + Google).
- Opcional no **servidor** (`PAINEL_LOCAL_ALLOW_EMAILS`): só entra no fluxo de `POST /api/painel/sync-profile` (legado; prefira ajustar a OU no Google Admin).
