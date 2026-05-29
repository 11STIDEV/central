# Deploy (Docker / Coolify / Ubuntu)

A API Express serve o frontend de produção (`dist/`) quando `NODE_ENV=production` e a pasta `dist/` existe ao lado de `server/` (imagem Docker ou build manual).

## Layout na imagem Docker

| Caminho no container | Conteúdo |
|----------------------|----------|
| `/app/server` | Código da API (`index.js`, `package.json`, …) |
| `/app/dist` | Build do Vite (`npm run build` na raiz do repositório) |
| `/app/server/data` | **Persistir com volume** — JSON da Agenda CCI, papéis manuais, atalhos por setor, etc. |

### Volume Coolify / Docker Compose

Monte um volume persistente em:

```text
/app/server/data
```

Exemplo Compose (já em [`docker-compose.yml`](docker-compose.yml)):

```yaml
volumes:
  - central-server-data:/app/server/data
```

Sem volume, os dados somem ao recriar o container.

## Variáveis de ambiente

### Build (arguments do Docker / Coolify — embutidas no JS pelo Vite)

Definir **no build** da imagem (Build Arguments no Coolify):

| Argumento | Uso |
|-----------|-----|
| `VITE_GOOGLE_CLIENT_ID` | Login Google na Central |
| `VITE_SUPABASE_URL` | Painel de senhas |
| `VITE_SUPABASE_ANON_KEY` | Painel de senhas |
| `VITE_SCHOOL_SLUG` | Slug da escola no painel |
| `VITE_LF_SUPABASE_URL` | URL do Supabase do módulo Achados e Perdidos |
| `VITE_LF_SUPABASE_ANON_KEY` | Chave anon/public do Supabase de Achados e Perdidos |
| `VITE_LF_SCHOOL_ID` | Identificador textual da escola para filtrar itens no admin de Achados e Perdidos |
| `VITE_LF_PUBLIC_HOSTS` | Hostname(s) da vitrine pública, separados por vírgula (ex.: `achadoseperdidos.portalcci.com.br`). O mesmo build atende Central e subdomínio. |
| `VITE_PAINEL_YOUTUBE_PLAYLIST_ID` | Opcional — painel TV |
| `VITE_PAINEL_OVERLAY_SECONDS` | Opcional — overlay |
| `VITE_CENTRAL_ADMIN_EMAILS` | Opcional — CSV de e-mails com papel `admin` na intranet (ver tudo). Complementa `papeis-manuais.json`. |

### Runtime (container — `server/index.js`)

| Variável | Descrição |
|----------|-----------|
| `PORT` | Padrão `3001` — alinhar health check e proxy |
| `HOST` | Padrão `0.0.0.0` — bind em todas as interfaces (Docker); o log mostra o host real |
| `NODE_ENV` | `production` para servir `dist/` |
| `SERVE_STATIC` | `0`/`false` força **não** servir SPA (só API); `1`/`true` força servir se existir `dist/` |
| `TRUST_PROXY` | `1` com proxy reverso (junto a `NODE_ENV=production` ativa `trust proxy` no Express) |
| `GOOGLE_CLIENT_ID` | Mesmo valor de `VITE_GOOGLE_CLIENT_ID` |
| `DOMINIOS_PERMITIDOS` | Domínios de e-mail permitidos (lista separada por vírgula) |
| `GOOGLE_ADMIN_IMPERSONATE` | Service account / Admin SDK |
| `GOOGLE_SERVICE_ACCOUNT_JSON` ou `GOOGLE_SERVICE_ACCOUNT_PATH` | Credenciais Google |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **Runtime obrigatório** para chamados, agenda e painel (service_role do Supabase — não copiar `server/.env` para a imagem). Após alterar, **reinicie** o container. Confira `GET /api/health` → `supabaseConfigured: true`. |
| `AGENDA_CCI_*` | Opcionais — ver [`server/.env.example`](server/.env.example) |

## Health check

HTTP `GET /api/health` → `{ "ok": true }` na porta da aplicação (ex.: 3001).

## Coolify (checklist)

1. Repositório Git com este `Dockerfile` na raiz.
2. **Build Arguments:** preencher os `VITE_*` necessários (mesmos nomes do Dockerfile).
3. **Runtime / Secrets:** `GOOGLE_CLIENT_ID`, domínios, service account, etc.
4. **Volume persistente:** montar em `/app/server/data`.
5. **Domínios + SSL** no **mesmo** serviço Coolify (mesmo container):
   - `central.portalcci.com.br` — intranet (login Google).
   - `achadoseperdidos.portalcci.com.br` — vitrine pública na **raiz** (`/`), sem login.
   - **DNS:** registro `A` ou `CNAME` de `achadoseperdidos` para o mesmo destino do `central`.
   - **Build:** incluir `VITE_LF_PUBLIC_HOSTS=achadoseperdidos.portalcci.com.br` (ou deixar vazio — o código já usa esse host como padrão).
6. **Porta:** publicar a porta exposta (3001 ou a que o Coolify definir); health check em `/api/health`.
7. **Google OAuth:** no Google Cloud Console, adicionar URIs de redirecionamento com a **URL pública** exata (HTTPS).
8. **Supabase:** em Authentication / URL configuration, incluir a URL de produção se o painel usar redirect.

### Proxy reverso (outro servidor na frente)

Se o tráfego passar por outro host (HTTPS no edge), use o **domínio público** nas configs OAuth e Supabase. Opcional: `TRUST_PROXY=1` no container da API.

## Build local da imagem

```bash
docker build -t central-connect:latest \
  --build-arg VITE_GOOGLE_CLIENT_ID="..." \
  --build-arg VITE_SUPABASE_URL="..." \
  --build-arg VITE_SUPABASE_ANON_KEY="..." \
  .
```

## URLs de produção (Achados e Perdidos)

| Uso | URL |
|-----|-----|
| Vitrine pública (pais/alunos) | `https://achadoseperdidos.portalcci.com.br/` |
| Administração (secretaria) | `https://central.portalcci.com.br/achados-e-perdidos/admin` |
| Link legado na Central | `https://central.portalcci.com.br/achados-e-perdidos/publico` |

## Administrador global (“ver tudo”)

A intranet usa papéis derivados da **OU do Google Workspace** (Secretaria, Setape, DP, etc.). O papel **`admin`** ignora essas restrições e pode abrir **todas** as rotas e menus (TI, financeiro, setores, achados admin, agenda admin, painel de senhas completo).

| Item | Valor |
|------|--------|
| **Tela de gestão** | `https://central.portalcci.com.br/admin/papeis-manuais` |
| **Menu** | Sidebar → **Administração** → **Admin — Papéis manuais** |
| **Quem acessa a tela** | Só quem **já** tem `admin` (manual ou arquivo abaixo) |

### Dar `admin` a alguém

1. **Pela tela** (se você já é admin): informe o e-mail, marque **Administrador**, salve.
2. **Pelo servidor** (primeiro admin ou sem acesso à tela): edite no volume persistente o arquivo abaixo.

```text
/app/server/data/papeis-manuais.json
```

Exemplo (copie de [`server/data/papeis-manuais.example.json`](server/data/papeis-manuais.example.json)):

```json
{
  "ti@portalcci.com.br": ["admin"]
}
```

- O volume em `/app/server/data` **precisa estar montado** (ver secção acima); senão o arquivo some ao recriar o container.
- Na **primeira criação** do arquivo vazio, a API grava um seed inicial (ver `PAPEIS_MANUAIS_SEED` em [`server/index.js`](server/index.js)).
- Papéis manuais válidos no servidor: `admin`, `painel_admin`, `painel_atendente`.

### Depois de atribuir

O utilizador deve **sair e entrar de novo** na Central para o papel manual aplicar (a sessão guarda os papéis no login).

### Não confundir com painel de senhas

- **Setape / Direção** na OU → `painel_admin` (administração do **painel de senhas**), não “ver tudo” na intranet.
- **`VITE_PAINEL_ADMIN_EMAILS`** no build → mesmo efeito limitado ao painel.

Detalhes da API e do ficheiro: [`server/README.md`](server/README.md#papéis-manuais-admin-global).

## Atalhos por setor (`/setores/*`)

Os links das páginas de setor (ex.: `/setores/secretaria`) vêm do código por defeito. Depois que um **admin** grava alterações na página (**Gerenciar atalhos**), passam a ser lidos de:

```text
/app/server/data/setor-links.json
```

Modelo: [`server/data/setor-links.example.json`](server/data/setor-links.example.json). Sem entrada no ficheiro para um setor, a Central usa os atalhos embutidos no código.

## Desenvolvimento local (sem Docker)

- Frontend: `npm run dev` (Vite, proxy `/api` → 3001).
- API: `cd server && npm run dev`.
- Simular subdomínio: em `.env.local`, `VITE_LF_PUBLIC_HOSTS=localhost` e abrir `http://localhost:8080/`, ou usar `?publicHost=1` na URL.
- Não é necessário `NODE_ENV=production` para desenvolver; o servidor não serve `dist/` até existir build de produção.
