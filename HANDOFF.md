# Bar Dashboard — Handoff

## Visão Geral

Sistema de controle para bar com frontend React hospedado no Cloudflare Pages e backend FastAPI rodando no servidor via Docker Swarm.

| Componente | URL |
|---|---|
| Frontend | https://bar.dmelo.uk |
| Backend (API) | https://bar-api.dmelo.uk |
| Frontend alternativo | https://bar-dashboard.pages.dev |

---

## Arquitetura

```
Usuário
  │
  ├── bar.dmelo.uk → Cloudflare Pages (React + Vite)
  │                        │
  │                        └── API calls → bar-api.dmelo.uk
  │
  └── bar-api.dmelo.uk → Traefik (SSL) → FastAPI container → PostgreSQL (bardash)
```

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + React Router v6 + Recharts |
| Backend | FastAPI (Python 3.12) |
| Banco de dados | PostgreSQL (`bardash` no Postgres do servidor) |
| Reverse proxy | Traefik v3.3 (compartilhado com n8n) |
| Deploy frontend | Cloudflare Pages (Direct Upload via wrangler) |
| CI/CD | GitHub Actions (push em `frontend/` → deploy automático) |

---

## Estrutura de Arquivos

```
/root/bar/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, routers; /docs desativado em produção
│   │   ├── auth.py          # Middleware de API key (lê Docker secret ou env API_KEY)
│   │   ├── database.py      # Conexão SQLAlchemy; lê DATABASE_URL de Docker secret
│   │   ├── models.py        # Tabelas: Caixa, Venda, Gasto, Cliente, Fiado
│   │   ├── schemas.py       # Pydantic schemas (request/response)
│   │   └── routers/
│   │       ├── caixa.py     # Abrir/fechar caixa, histórico
│   │       ├── vendas.py    # Registrar e cancelar vendas
│   │       ├── gastos.py    # Registrar e cancelar gastos
│   │       ├── clientes.py  # CRUD de clientes
│   │       ├── fiado.py     # Anotar fiado, marcar pago
│   │       └── dashboard.py # Resumo do dia + gráfico 7 dias
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Rotas React Router + RequireAuth guard
│   │   ├── api.js           # Axios: interceptor X-API-Key + redirect 401 → /login
│   │   ├── utils.js         # fmt() para R$, fmtDate()
│   │   ├── index.css        # Design system (variáveis CSS + media queries mobile)
│   │   ├── components/
│   │   │   ├── Layout.jsx   # Sidebar desktop + bottom nav mobile + botão logout
│   │   │   └── Layout.css
│   │   └── pages/
│   │       ├── Login.jsx    # Tela de login (valida chave via POST /auth/verify)
│   │       ├── Login.css
│   │       ├── Dashboard.jsx
│   │       ├── Caixa.jsx
│   │       ├── Vendas.jsx
│   │       ├── Gastos.jsx
│   │       ├── Fiado.jsx
│   │       └── Clientes.jsx
│   ├── .env                 # VITE_API_URL (não commitado)
│   └── .env.example
├── bar_api.yml              # Docker Swarm stack do backend (NÃO commitado — tem secrets)
├── deploy-frontend.sh       # Script de redeploy manual
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD: push → build → Cloudflare Pages
└── HANDOFF.md               # Este arquivo
```

---

## Autenticação

O frontend requer uma chave de acesso (API key) para usar a aplicação.

### Como funciona

1. O usuário acessa `/login` e digita a senha
2. O frontend faz `POST /auth/verify` com o header `X-API-Key: <senha>`
3. Se válida, a chave é salva em `localStorage` e o usuário é redirecionado ao dashboard
4. Todas as requisições da API incluem o header `X-API-Key` via interceptor do axios
5. Em caso de resposta `401`, o usuário é redirecionado automaticamente para `/login`

### Onde a chave é armazenada (backend)

O backend lê a chave em ordem de prioridade:
1. Docker secret `/run/secrets/bar_api_key` (produção)
2. Variável de ambiente `API_KEY` (desenvolvimento local)

### Alterar a API key

Docker secrets são imutáveis enquanto em uso. Para trocar:

```bash
# 1. Derrubar o stack
docker stack rm bar_api

# 2. Remover o secret
docker secret rm bar_api_key

# 3. Recriar com nova chave
echo -n "NOVA_CHAVE" | docker secret create bar_api_key -

# 4. Redeployar
docker stack deploy -c /root/bar/bar_api.yml bar_api --with-registry-auth
```

---

## Banco de Dados

**Host:** `postgres` (rede overlay `network_swarm_public`)
**Banco:** `bardash`
**Usuário:** `bar_api` (usuário dedicado, acesso restrito apenas ao banco `bardash`)
**Senha:** ver `/root/.credentials` → `BAR_DB_PASS`

> O usuário `postgres` (superusuário) é reservado para o n8n. O bar usa `bar_api` com privilégios mínimos para não afetar outros serviços no mesmo servidor.

### Tabelas

| Tabela | Descrição |
|---|---|
| `caixas` | Sessões de caixa (aberto/fechado, saldo inicial/final) |
| `vendas` | Vendas vinculadas a um caixa (descrição, qtd, valor, categoria) |
| `gastos` | Despesas vinculadas a um caixa (descrição, valor, categoria) |
| `clientes` | Cadastro de clientes (nome, telefone, observação) |
| `fiados` | Crédito por cliente (valor, pago/aberto, data pagamento) |

---

## Docker Swarm

### Serviços relacionados ao Bar

```bash
# Ver status
docker service ls | grep bar

# Logs do backend
docker service logs bar_api_bar_api -f

# Reiniciar backend
docker service update --force bar_api_bar_api

# Ver variáveis de ambiente do serviço
docker service inspect bar_api_bar_api --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
```

### Arquivo de stack

```
/root/bar/bar_api.yml
```

### Rebuildar e redeployar o backend após mudanças

```bash
cd /root/bar/backend
docker build -t bar_api:latest .
docker service update --image bar_api:latest bar_api_bar_api
```

---

## Frontend — Deploy

### Automático (GitHub Actions)

Qualquer `git push` com mudanças em `frontend/**` dispara o workflow `.github/workflows/deploy.yml`, que:
1. Instala dependências (`npm ci`)
2. Builda com `VITE_API_URL=https://bar-api.dmelo.uk`
3. Deploya para Cloudflare Pages via wrangler

**Pré-requisito:** secret `CLOUDFLARE_API_TOKEN` configurado em:
`github.com/Diegomelo05/bar-dashboard → Settings → Secrets → Actions`

### Manual (do servidor)

```bash
bash /root/bar/deploy-frontend.sh
```

---

## Traefik — CORS

O middleware `bar-cors` em `/opt/n8n/traefik_dynamic.yml` deve incluir `X-API-Key` nos headers permitidos:

```yaml
middlewares:
  bar-cors:
    headers:
      accessControlAllowOriginList:
        - "https://bar.dmelo.uk"
        - "http://localhost:5173"
      accessControlAllowMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
      accessControlAllowHeaders:
        - "Content-Type"
        - "X-API-Key"
      accessControlMaxAge: 300
      addVaryHeader: true
```

> Se o header `X-API-Key` não estiver em `accessControlAllowHeaders`, o browser bloqueia o preflight OPTIONS e o login retorna "Senha incorreta" mesmo com a chave correta.

## Traefik — Roteamento

A rota do backend está em `/opt/n8n/traefik_dynamic.yml`:

```yaml
routers:
  bar_api:
    rule: "Host(`bar-api.dmelo.uk`)"
    service: bar_api_svc
    middlewares: [bar-cors]

services:
  bar_api_svc:
    loadBalancer:
      servers:
        - url: "http://bar_api_bar_api:8000"
```

O Traefik usa `--providers.file.watch=true` mas às vezes não detecta mudanças em bind mounts do Swarm. Se alterar o arquivo e a rota não atualizar:

```bash
docker service update --force traefik_traefik
```

---

## DNS (Cloudflare — zona dmelo.uk)

| Registro | Tipo | Destino | Proxy |
|---|---|---|---|
| `bar.dmelo.uk` | CNAME | `bar-dashboard.pages.dev` | ✓ Ativado |
| `bar-api.dmelo.uk` | A | `13.140.128.140` | ✗ DNS only |

---

## Credenciais

Todas as chaves estão em `/root/.credentials` (chmod 600).

| Chave | Uso |
|---|---|
| `CF_TOKEN_PAGES` | Deploy no Cloudflare Pages |
| `CF_TOKEN_DNS` | Editar DNS da zona dmelo.uk |
| `GH_TOKEN` | Push para GitHub |
| `POSTGRES_PASSWORD` | Superusuário postgres (n8n) — não usar no bar |
| `BAR_DB_USER` | Usuário Postgres do bar (`bar_api`) |
| `BAR_DB_PASS` | Senha do usuário `bar_api` |
| `BAR_API_KEY` | Senha de acesso ao frontend/API |

### Docker secrets ativos no servidor

```bash
docker secret ls
# bar_api_key    — API key do bar
# database_url   — connection string PostgreSQL do bar
```

---

## Visual / UI

Design system baseado em CSS custom properties. Paleta: dark (fundo `#0f1117`) + âmbar (`#f59e0b`).

- **Fonte:** Plus Jakarta Sans (Google Fonts)
- **Responsividade:** sidebar some em ≤ 768px, substituída por bottom navigation. Inputs com `font-size: 16px` para evitar zoom automático no iOS.
- **Arquivo principal:** `frontend/src/index.css` (variáveis globais + classes reutilizáveis + media queries)
- **Layout:** `frontend/src/components/Layout.css` (sidebar, bottom-nav, media queries de layout)

---

## Funcionalidades

- **Login** — tela de senha antes de acessar qualquer página
- **Dashboard** — status do caixa, totais do dia, gráfico 7 dias, atalhos rápidos
- **Caixa** — abrir/fechar com saldo inicial e final, histórico de caixas
- **Vendas** — registrar por produto/quantidade/valor/categoria, cancelar
- **Gastos** — registrar despesas por categoria, cancelar
- **Fiado** — anotar por cliente, marcar itens como pagos, quitar tudo
- **Clientes** — cadastro com histórico de fiado por cliente

---

## Repositório

https://github.com/Diegomelo05/bar-dashboard
