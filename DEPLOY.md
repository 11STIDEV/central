# Deploy (Docker / Coolify / Ubuntu)

A API Express serve o frontend de produção (`dist/`) quando `NODE_ENV=production` e a pasta `dist/` existe ao lado de `server/` (imagem Docker ou build manual).

## Layout na imagem Docker

| Caminho no container | Conteúdo |
|----------------------|----------|
| `/app/server` | Código da API (`index.js`, `package.json`, …) |
| `/app/dist` | Build do Vite (`npm run build` na raiz do repositório) |
| `/app/server/data` | **Persistir com volume** — JSON da Agenda CCI, papéis manuais, etc. |

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
| `VITE_PAINEL_YOUTUBE_PLAYLIST_ID` | Opcional — painel TV |
| `VITE_PAINEL_OVERLAY_SECONDS` | Opcional — overlay |

### Runtime (container — `server/index.js`)

| Variável | Descrição |
|----------|-----------|
| `PORT` | Padrão `3001` — alinhar health check e proxy |
| `NODE_ENV` | `production` para servir `dist/` |
| `SERVE_STATIC` | `0`/`false` força **não** servir SPA (só API); `1`/`true` força servir se existir `dist/` |
| `TRUST_PROXY` | `1` com proxy reverso (junto a `NODE_ENV=production` ativa `trust proxy` no Express) |
| `GOOGLE_CLIENT_ID` | Mesmo valor de `VITE_GOOGLE_CLIENT_ID` |
| `DOMINIOS_PERMITIDOS` | Domínios de e-mail permitidos (lista separada por vírgula) |
| `GOOGLE_ADMIN_IMPERSONATE` | Service account / Admin SDK |
| `GOOGLE_SERVICE_ACCOUNT_JSON` ou `GOOGLE_SERVICE_ACCOUNT_PATH` | Credenciais Google |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Se usar endpoints admin no servidor |
| `AGENDA_CCI_*` | Opcionais — ver [`server/.env.example`](server/.env.example) |

## Health check

HTTP `GET /api/health` → `{ "ok": true }` na porta da aplicação (ex.: 3001).

## Coolify (checklist)

1. Repositório Git com este `Dockerfile` na raiz.
2. **Build Arguments:** preencher os `VITE_*` necessários (mesmos nomes do Dockerfile).
3. **Runtime / Secrets:** `GOOGLE_CLIENT_ID`, domínios, service account, etc.
4. **Volume persistente:** montar em `/app/server/data`.
5. **Domínio + SSL:** configurar no Coolify; apontar DNS para o servidor.
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

## Desenvolvimento local (sem Docker)

- Frontend: `npm run dev` (Vite, proxy `/api` → 3001).
- API: `cd server && npm run dev`.
- Não é necessário `NODE_ENV=production` para desenvolver; o servidor não serve `dist/` até existir build de produção.
