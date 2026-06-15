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
│   │   ├── main.py          # FastAPI app, CORS, routers
│   │   ├── database.py      # Conexão SQLAlchemy + PostgreSQL
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
│   │   ├── App.jsx          # Rotas React Router
│   │   ├── api.js           # Todas as chamadas à API
│   │   ├── utils.js         # fmt() para R$, fmtDate()
│   │   ├── index.css        # Design system (variáveis CSS)
│   │   ├── components/
│   │   │   ├── Layout.jsx   # Sidebar desktop + bottom nav mobile
│   │   │   └── Layout.css
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Caixa.jsx
│   │       ├── Vendas.jsx
│   │       ├── Gastos.jsx
│   │       ├── Fiado.jsx
│   │       └── Clientes.jsx
│   ├── .env                 # VITE_API_URL (não commitado)
│   └── .env.example
├── bar_api.yml              # Docker Swarm stack do backend
├── deploy-frontend.sh       # Script de redeploy manual
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD: push → build → Cloudflare Pages
└── HANDOFF.md               # Este arquivo
```

---

## Banco de Dados

**Host:** `postgres` (rede overlay `network_swarm_public`)
**Banco:** `bardash`
**Usuário:** `postgres`
**Senha:** ver `/root/.credentials`

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

## Traefik

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
| `POSTGRES_PASSWORD` | Conexão ao banco bardash |

---

## Funcionalidades

- **Dashboard** — status do caixa, totais do dia, gráfico 7 dias, atalhos rápidos
- **Caixa** — abrir/fechar com saldo inicial e final, histórico de caixas
- **Vendas** — registrar por produto/quantidade/valor/categoria, cancelar
- **Gastos** — registrar despesas por categoria, cancelar
- **Fiado** — anotar por cliente, marcar itens como pagos, quitar tudo
- **Clientes** — cadastro com histórico de fiado por cliente

---

## Repositório

https://github.com/Diegomelo05/bar-dashboard
