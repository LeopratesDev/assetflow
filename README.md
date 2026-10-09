# AssetFlow

> Plataforma de gestão de ativos de TI: controle de equipamentos, alocações para colaboradores e histórico completo de movimentações — tudo em um único painel.

**[🔗 Demo ao vivo](https://it-asset-manager-psi.vercel.app)** — login: `admin@itasset.dev` / `Admin@1234`

## Screenshots

| Login | Dashboard | Ativos |
|-------|-----------|--------|
| ![Login](.github/screenshots/login.jpg) | ![Dashboard](.github/screenshots/dashboard.jpg) | ![Ativos](.github/screenshots/assets.jpg) |

![CI](https://github.com/LeopratesDev/assetflow/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)

## Stack

| Camada | Tecnologia |
|--------|-----------|
| API | Python 3.12 · FastAPI · SQLAlchemy 2 async · Alembic |
| Banco | PostgreSQL 16 (prod) · SQLite in-memory (testes) |
| Auth | JWT (python-jose) · bcrypt · OAuth2 Password Flow |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · Lucide React |
| Queries | TanStack Query v5 · React Hook Form · Zod |
| Testes | pytest · httpx · Vitest · Testing Library |
| CI/CD | GitHub Actions |
| Deploy | Render (API) · Neon.tech (DB) · Vercel (Frontend) |

## Arquitetura

```mermaid
graph TD
    Browser["🌐 Browser (React SPA)"]
    Nginx["nginx (porta 80)"]
    API["FastAPI (porta 8000)"]
    DB[("PostgreSQL")]

    Browser -->|HTTP| Nginx
    Nginx -->|proxy /api/*| API
    API -->|asyncpg| DB

    subgraph Docker Compose
        Nginx
        API
        DB
    end
```

## Modelo de dados

```mermaid
erDiagram
    USERS {
        string id PK
        string name
        string email UK
        string hashed_password
        string role
        bool   is_active
    }
    CATEGORIES {
        string id PK
        string name UK
        string description
    }
    ASSETS {
        string  id PK
        string  serial_number UK
        string  name
        string  brand
        string  model
        string  status
        date    purchase_date
        decimal purchase_value
        string  category_id FK
    }
    ALLOCATIONS {
        string id PK
        string asset_id FK
        string user_id FK
        date   allocated_at
        date   returned_at
        string notes
    }

    CATEGORIES ||--o{ ASSETS : "tem"
    ASSETS     ||--o{ ALLOCATIONS : "possui"
    USERS      ||--o{ ALLOCATIONS : "recebe"
```

## Endpoints da API

### Auth
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/v1/auth/token` | Login (OAuth2 password) | — |

### Categorias
| Método | Rota | Descrição | Role |
|--------|------|-----------|------|
| `GET` | `/api/v1/categories` | Listar (paginado) | any |
| `POST` | `/api/v1/categories` | Criar | admin |
| `GET` | `/api/v1/categories/{id}` | Buscar por ID | any |
| `PATCH` | `/api/v1/categories/{id}` | Atualizar | admin |
| `DELETE` | `/api/v1/categories/{id}` | Excluir | admin |

### Ativos
| Método | Rota | Descrição | Role |
|--------|------|-----------|------|
| `GET` | `/api/v1/assets` | Listar (busca + filtros) | any |
| `POST` | `/api/v1/assets` | Criar | admin |
| `GET` | `/api/v1/assets/{id}` | Buscar por ID | any |
| `PATCH` | `/api/v1/assets/{id}` | Atualizar | admin |
| `DELETE` | `/api/v1/assets/{id}` | Excluir | admin |

### Alocações
| Método | Rota | Descrição | Role |
|--------|------|-----------|------|
| `GET` | `/api/v1/allocations` | Listar (filtro ativo/encerrado) | any |
| `POST` | `/api/v1/allocations` | Criar alocação | admin |
| `PATCH` | `/api/v1/allocations/{id}/return` | Registrar devolução | admin |
| `GET` | `/api/v1/allocations/assets/{id}/history` | Histórico do ativo | any |
| `GET` | `/api/v1/allocations/users/{id}/allocations` | Histórico do usuário | any |

### Regras de negócio de alocação
- Ativo deve estar com status `available` para ser alocado
- Não pode haver duas alocações ativas simultâneas para o mesmo ativo
- Ao alocar, o status do ativo muda automaticamente para `allocated`
- Ao devolver, o status do ativo volta para `available`
- Data de devolução não pode ser anterior à data de alocação

## Cobertura de testes

| Módulo | Testes | Escopo |
|--------|--------|--------|
| API (pytest) | **76 testes** | auth, CRUD, alocações, RBAC, regras de negócio |
| Frontend (Vitest) | **14 testes** | auth utilities + componentes de UI |

## Como rodar localmente

### Pré-requisitos

- Python 3.12+ e `uv` (ou `pip`)
- Node.js 20+

### Backend

```bash
cd api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -e ".[dev]"
cp ../.env.example .env   # edite DATABASE_URL e SECRET_KEY

# criar banco e rodar migrations
alembic upgrade head

# popular com dados de exemplo
python -m app.core.seed

# subir o servidor
uvicorn app.main:app --reload
```

API disponível em http://localhost:8000  
Swagger UI em http://localhost:8000/docs

### Frontend

```bash
cd web
npm install
# o Vite proxy já redireciona /api → http://localhost:8000
npm run dev
```

Frontend disponível em http://localhost:5173

### Rodar os testes

```bash
# API
cd api
pytest

# Frontend
cd web
npm test -- --run
```

## Deploy em produção

O projeto está configurado para deploy em três serviços gratuitos:

| Serviço | Plataforma | URL |
|---------|-----------|-----|
| API | [Render](https://render.com) | `https://it-asset-manager-il7e.onrender.com` |
| Banco | [Neon.tech](https://neon.tech) | PostgreSQL serverless |
| Frontend | [Vercel](https://vercel.com) | `https://it-asset-manager-psi.vercel.app` |

### Passo a passo

**1. Banco de dados — Neon.tech**
1. Crie uma conta em [neon.tech](https://neon.tech) e crie um projeto chamado `it-asset-manager`
2. Copie a connection string no formato: `postgresql+asyncpg://user:pass@host/db?sslmode=require`

**2. API — Render**
1. Conecte o repositório GitHub no [Render Dashboard](https://dashboard.render.com)
2. Selecione **"New Web Service"** → escolha o repo → Render detecta o `render.yaml`
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` → connection string do Neon
   - `CORS_ORIGINS` → `["https://it-asset-manager.vercel.app"]`
4. Após o primeiro deploy, rode as migrations:
   ```
   render ssh <service> -- alembic upgrade head
   ```

**3. Frontend — Vercel**
1. Importe o repositório no [Vercel](https://vercel.com/new)
2. **Root Directory**: `web`
3. O `vercel.json` na raiz já configura o proxy `/api/*` → Render e o SPA fallback
4. Adicione a variável de ambiente `VITE_API_URL` com valor vazio (`""`) — o proxy cuida do roteamento

### CI/CD automático

O workflow `.github/workflows/ci.yml` roda todos os testes em cada push e PR. O Render e o Vercel fazem deploy automático ao detectar push na branch `main`.

---

## Como rodar com Docker

```bash
# 1. Clone o repositório
git clone https://github.com/LeopratesDev/it-asset-manager.git
cd it-asset-manager

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e defina POSTGRES_PASSWORD e SECRET_KEY

# 3. Suba os containers
docker compose up -d

# 4. (opcional) Popular com dados de exemplo
docker compose exec api python -m app.core.seed
```

Serviços disponíveis:
- Frontend: http://localhost
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

## Credenciais do seed

Após rodar `python -m app.core.seed`:

| E-mail | Senha | Role |
|--------|-------|------|
| `admin@itasset.dev` | `Admin@1234` | admin |
| `ana.silva@itasset.dev` | `Employee@1234` | employee |
| `bruno.costa@itasset.dev` | `Employee@1234` | employee |

## Etapas de desenvolvimento

- [x] Etapa 1 — Setup do projeto e CI
- [x] Etapa 2 — Modelos, migrations e seed
- [x] Etapa 3 — CRUDs de categorias e ativos
- [x] Etapa 4 — Regras de alocação com testes
- [x] Etapa 5 — Autenticação JWT
- [x] Etapa 6 — Frontend completo
- [x] Etapa 7 — Docker Compose
- [x] Etapa 8 — README completo
- [x] Etapa 9 — Deploy
- [x] Etapa 10 — Redesign: AssetFlow
- [x] Etapa 11 — Polish: title, favicon, mobile responsivo (drawer + cards)
- [x] Etapa 12 — UX: toasts de feedback, select de colaboradores, página 404, endpoint /users
- [x] Etapa 13 — Polish: fade-in entre páginas, modal de confirmação de delete, coluna data de compra
- [x] Etapa 14 — Gráficos: donut chart por categoria + barras por status (Recharts); repo renomeado para assetflow; screenshots no README

## Autor

**Leonardo Prates** · [LinkedIn](https://www.linkedin.com/in/leonardo-prates77/) · lp.prates7@gmail.com
