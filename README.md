# Loot Protocol

A distribution platform for AI agent extensions. Publishers upload Skills, MCP Servers, and Plugins for Claude Code; users discover, validate, and install them via the web UI, CLI, or in-agent skill.

```
                    ┌──────────────┐
                    │  CloudFront  │
                    └──────┬───────┘
                           │
┌─────────────┐  ┌─────────▼──────┐  ┌──────────────────┐
│  Web UI     │  │  ALB           │  │  CLI / In-Agent   │
│  (Next.js)  │  │                │  │  Skill            │
└──────┬──────┘  └────────┬───────┘  └────────┬──────────┘
       │                  │                    │
       │          ┌───────▼────────┐           │
       └─────────►│  ECS Fargate   │◄──────────┘
                  │  (Next.js API) │
                  └───────┬────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
  ┌──────▼──────┐  ┌──────▼─────┐  ┌──────▼───────┐
  │  RDS        │  │  S3        │  │  Cognito     │
  │  PostgreSQL │  │  (packages)│  │  (GitHub     │
  │             │  │            │  │   OAuth)     │
  └─────────────┘  └────────────┘  └──────────────┘
```

## Project Status

### What's Built

- **Web marketplace** — Browse, search, filter by category/type, extension detail pages, publisher profiles, docs index
- **Publisher flow** — Upload archives via web UI or CLI, automatic validation, version management, download analytics
- **3 extension types** — Skills (SKILL.md), MCP Servers (mcp.json), Plugins (.claude-plugin/plugin.json) with strict per-type validation
- **CLI tool** (`lootprotocol`) — login, search, info, validate, install, publish
- **Auth** — GitHub OAuth via Amazon Cognito, JWT sessions, mock auth for local dev
- **Full AWS infrastructure** — 6 CDK stacks, CI/CD pipeline, Docker containerization
- **Error handling** — Custom 404 page, global error boundary with retry, loading skeletons
- **Rate limiting** — In-memory token bucket (100/min public, 20/min upload, 10/min auth)
- **SEO** — Dynamic sitemap, robots.txt, Open Graph and Twitter Card metadata (global + per-extension)
- **Legal pages** — Terms of service and privacy policy
- **Tests** — 26 tests across API routes, auth guards, DB queries, and rate limiter (vitest)

### Deployment Status (AWS — us-east-1)

| Stack | Resource | Status |
|-------|----------|--------|
| VPC | `vpc-05aa7fe132eeccbcb` (2 AZs, public + private subnets) | Deployed |
| Database | RDS PostgreSQL 16 (t4g.micro, schema synced) | Deployed |
| Storage | S3 `lootprotocol-packages-603846588826-us-east-1` | Deployed |
| Auth | Cognito `us-east-1_faqKwbSl8` + GitHub OIDC provider | Deployed |
| Compute | ECS Fargate (256 CPU / 512 MB), ALB with HTTPS | Deployed |
| CDN | CloudFront `d20b1ep30zrqwn.cloudfront.net` | Deployed |

**Live endpoints:**
- CloudFront: `https://d20b1ep30zrqwn.cloudfront.net`
- ALB: `https://LootPr-LootP-EOA1br4ugpiv-1193456457.us-east-1.elb.amazonaws.com`

### Remaining Setup

- [ ] DNS — Point `lootprotocol.com` to CloudFront distribution (CNAME or Route 53 alias)
- [ ] CloudFront custom domain — Add `lootprotocol.com` as alternate domain + attach ACM cert
- [ ] GitHub Actions secrets — Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- [ ] Cognito client secret — Add to ECS task environment for OAuth callback flow
- [ ] Database seed — Run `pnpm db:seed` via ECS exec or one-off task for sample data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui (New York theme) |
| Database | PostgreSQL 16, Prisma ORM |
| Storage | AWS S3 (packages), MinIO (local dev) |
| Auth | Amazon Cognito, GitHub OIDC, JWT (jose) |
| Compute | ECS Fargate, Docker (Node 20 Alpine) |
| CDN | CloudFront |
| IaC | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions |
| CLI | Commander.js, Chalk, Ora |
| Monorepo | pnpm workspaces |

---

## Repository Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages + API routes
│   │   ├── api/                # REST API (/health, /extensions, /auth, etc.)
│   │   ├── explore/            # Browse marketplace
│   │   ├── extensions/[slug]/  # Extension detail page (with OG metadata)
│   │   ├── dashboard/          # Publisher dashboard
│   │   ├── publish/            # Upload page
│   │   ├── docs/               # Documentation index + [slug] pages
│   │   ├── terms/              # Terms of service
│   │   ├── privacy/            # Privacy policy
│   │   ├── publishers/[username]/
│   │   ├── error.tsx           # Global error boundary
│   │   ├── not-found.tsx       # Custom 404 page
│   │   ├── loading.tsx         # Global loading skeleton
│   │   ├── robots.ts           # robots.txt generation
│   │   └── sitemap.ts          # Dynamic sitemap from DB
│   ├── components/             # React components (ui/, auth/, extensions/, etc.)
│   ├── hooks/                  # Custom hooks (use-auth, use-extensions, use-search)
│   └── lib/                    # Core libraries
│       ├── auth/               # Cognito, JWT verification, session, guards
│       ├── db/                 # Prisma client, queries, mappers, mock store
│       ├── s3/                 # Upload, presigned URLs, client
│       ├── marketplace/        # Marketplace index generation
│       ├── rate-limit.ts       # In-memory token bucket rate limiter
│       └── validation/         # Client-side validation helpers
├── cli/                        # CLI tool (lootprotocol)
│   └── src/
│       ├── commands/           # login, search, info, install, publish, validate
│       ├── api.ts              # API client
│       ├── auth.ts             # Token management
│       └── config.ts           # ~/.lootprotocol config
├── packages/
│   ├── shared-types/           # @lootprotocol/shared-types
│   └── validation/             # @lootprotocol/validation (skill, mcp, plugin)
├── infra/                      # AWS CDK infrastructure
│   ├── bin/app.ts              # Stack orchestration
│   └── lib/
│       ├── vpc-stack.ts
│       ├── database-stack.ts
│       ├── storage-stack.ts
│       ├── auth-stack.ts
│       ├── compute-stack.ts
│       └── cdn-stack.ts
├── prisma/
│   ├── schema.prisma           # Database models
│   └── seed.ts                 # Sample data
├── skill/                      # Example Claude Code skills (search, install)
├── docs/                       # MDX documentation
├── scripts/                    # setup.sh, dev.sh, docker-entrypoint.sh
├── vitest.config.ts            # Test configuration
├── .github/workflows/deploy.yml
├── Dockerfile                  # Multi-stage production build
├── docker-compose.yml          # Local dev (Postgres + MinIO)
└── PLAN.md                     # Architecture and design document
```

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Quick Start

```bash
# Clone and install
pnpm install

# Start Postgres + MinIO
pnpm docker:up

# Push schema + seed database
pnpm db:migrate
pnpm db:seed

# Start dev server (Turbopack)
pnpm dev
```

Or use the all-in-one script:

```bash
pnpm setup      # First-time setup (docker + schema + seed)
pnpm dev:full   # Start docker services + dev server
```

The app runs at `http://localhost:3000` with `AUTH_MOCK=true` (no Cognito needed locally).

### Environment Variables

Copy `.env` and adjust as needed:

```env
DATABASE_URL=postgresql://lootprotocol:lootprotocol@localhost:5432/lootprotocol

S3_BUCKET=lootprotocol-packages
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000      # MinIO
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

COGNITO_USER_POOL_ID=                  # Not needed with AUTH_MOCK=true
COGNITO_CLIENT_ID=
COGNITO_CLIENT_SECRET=
COGNITO_DOMAIN=
COGNITO_ISSUER=

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
AUTH_MOCK=true                             # Server-side mock auth flag
NEXT_PUBLIC_AUTH_MOCK=true                 # Client-side mock auth flag
```

### Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm type-check       # TypeScript check
pnpm test             # Run vitest
pnpm test:watch       # Watch mode
pnpm db:studio        # Prisma Studio (DB GUI)
pnpm db:seed          # Seed sample data
pnpm docker:up        # Start Postgres + MinIO
pnpm docker:down      # Stop services
pnpm stop             # Stop everything
```

---

## Database Schema

Five models managed by Prisma:

- **Profile** — GitHub-linked user accounts (cognitoSub, githubUsername, role)
- **Extension** — Extension listings (slug, name, type, category, tags, downloadCount)
- **ExtensionVersion** — Version history with S3 keys and metadata
- **DownloadEvent** — Download tracking per extension/version/user/source
- **UserInstall** — User's installed extensions (unique per user+extension)

Extension types: `skill`, `mcp_server`, `plugin`
User roles: `user`, `publisher`

---

## Extension Types

### Skill
A markdown file (`SKILL.md`) with YAML frontmatter that teaches Claude Code a new capability.

```
my-skill.zip
└── SKILL.md          # Required — frontmatter: name, description
```

### MCP Server
A Model Context Protocol server with tools, resources, or prompts.

```
my-server.zip
├── mcp.json          # Required — name, transport, command, args
├── package.json      # Required
├── src/              # Source code
└── README.md         # Recommended
```

### Plugin
A bundle of multiple skills and/or MCP servers.

```
my-plugin.zip
├── .claude-plugin/
│   └── plugin.json   # Required — name, version, description
├── skills/           # Optional skill directories
├── servers/          # Optional MCP server directories
└── README.md         # Recommended
```

**Size limits:** Skill 5 MB, MCP Server 50 MB, Plugin 100 MB.

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/extensions` | No | List/search extensions |
| GET | `/api/extensions/:slug` | No | Extension details |
| GET | `/api/extensions/:slug/versions` | No | Version history |
| GET | `/api/extensions/:slug/download` | Yes | Pre-signed S3 download URL |
| GET | `/api/extensions/:slug/readme` | No | README content |
| POST | `/api/validate` | Yes | Validate an archive |
| GET | `/api/categories` | No | List categories |
| GET | `/api/stats` | No | Marketplace statistics |
| GET | `/api/publishers/:username` | No | Publisher profile |
| GET | `/api/users/me` | Yes | Current user |
| GET | `/api/users/me/installs` | Yes | Installed extensions |
| POST | `/api/auth/token` | No | Exchange code for JWT |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/marketplace.json` | No | Full marketplace index |

---

## Infrastructure

### CDK Stacks

Deploy all stacks from `infra/`:

```bash
cd infra
npx cdk bootstrap                    # First time only
npx cdk deploy --all \
  -c certificateArn=arn:aws:acm:... \
  --parameters LootProtocol-Auth-dev:GitHubClientId=... \
  --parameters LootProtocol-Auth-dev:GitHubClientSecret=...
```

Stack dependency order: VPC → Database, Storage, Auth → Compute → CDN

### Docker Build & Push

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Build for amd64 (required for Fargate)
docker buildx build --platform linux/amd64 \
  -t <account>.dkr.ecr.us-east-1.amazonaws.com/lootprotocol:latest --load .

# Push
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/lootprotocol:latest

# Deploy
aws ecs update-service --cluster lootprotocol-cluster \
  --service lootprotocol-service --force-new-deployment
```

The Docker entrypoint automatically runs `prisma db push` on startup to sync the schema.

### CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`:

1. **Test** — lint, type-check, vitest
2. **Deploy** — build Docker image, push to ECR, force ECS deployment

Required repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

---

## CLI

Install and use the Loot Protocol CLI:

```bash
cd cli && pnpm install && pnpm build
npx lootprotocol --help
```

```
lootprotocol login                   # Authenticate via GitHub
lootprotocol search <query>          # Search extensions
lootprotocol info <slug>             # Extension details
lootprotocol validate <path>         # Validate archive locally
lootprotocol install <slug>          # Download + install to ~/.claude/
lootprotocol publish <path>          # Upload extension
```

---

## Testing

Tests use [vitest](https://vitest.dev/) with mocked Prisma and S3:

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
```

| Suite | File | Tests |
|-------|------|-------|
| API routes | `src/app/api/extensions/__tests__/route.test.ts` | Pagination, search filters, empty state |
| Auth guards | `src/lib/auth/__tests__/guards.test.ts` | requireAuth, requirePublisher, handleAuthError |
| DB queries | `src/lib/db/queries/__tests__/extensions.test.ts` | list, get, search, create, soft-delete |
| Rate limiter | `src/lib/__tests__/rate-limit.test.ts` | Token bucket, exhaustion, key isolation |

---

## Key Design Decisions

1. **Own distribution** — Packages are uploaded to and served from S3, not linked from GitHub
2. **Strict validation** — Each extension type has required files; submissions are rejected if they don't conform
3. **Authenticated ecosystem** — Publishers sign in to upload, users sign in to download; every action is tracked
4. **Three access points** — Web UI, CLI, and in-agent skill all share the same API
5. **Standalone Next.js** — Single container serves both frontend and API, simplifying deployment
6. **Mock auth for dev** — `AUTH_MOCK=true` + `NEXT_PUBLIC_AUTH_MOCK=true` bypasses Cognito entirely for local development
7. **Middleware-level rate limiting** — Token bucket algorithm applied per-IP in Next.js middleware, with tiered limits by endpoint sensitivity
8. **Public version listing** — `GET /api/extensions/:slug/versions` is unauthenticated so extension detail pages load for all visitors; only `POST` (upload) requires publisher auth
