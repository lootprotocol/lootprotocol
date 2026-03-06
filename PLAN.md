# Loot Protocol — Architecture, Scope & MVP Plan

## Context

The AI ecosystem is shifting toward autonomous agents that need shared procedural knowledge. Claude Code's plugin system (Skills + MCP servers) provides the substrate, but there's no community marketplace to discover, distribute, and install these extensions. Loot Protocol is a **distribution platform** — creators upload extension packages directly, we validate structure, host them, and track every download. Both publishers and users must authenticate, giving us full visibility into the ecosystem. Hosted entirely on AWS for control, scalability, and enterprise readiness.

---

## Architecture

### Core Principles

1. **We own distribution** — extension packages are uploaded to and served from Loot Protocol (S3), not GitHub
2. **Strict validation** — each extension type has required files; submissions are rejected if they don't conform
3. **Authenticated ecosystem** — publishers sign in to upload, users sign in to download. Everyone is tracked.
4. **Three access points** — web UI, CLI (`lootprotocol`), and in-agent skill (`/lootprotocol:*`) all hit the same API
5. **AWS-native** — full AWS stack for infrastructure control and enterprise-grade scalability

### System Diagram

```
                    ┌──────────────┐
                    │  CloudFront  │ (CDN — static assets + API cache)
                    └──────┬───────┘
                           │
┌─────────────┐  ┌─────────▼──────┐  ┌──────────────────┐
│  Web (Next.js│  │  ALB           │  │  In-Agent Skill  │
│  App)        │  │  (load balancer│  │  (/lootprotocol:*)   │
└──────┬───────┘  └────────┬───────┘  └────────┬─────────┘
       │                   │                   │
       │           ┌───────▼────────┐          │
       └──────────►│  ECS Fargate   │◄─────────┘
                   │  (Next.js App) │
                   └───────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌─────▼─────┐  ┌───────▼───────┐
   │  RDS        │  │  S3       │  │  Cognito      │
   │  PostgreSQL │  │  (packages│  │  (GitHub OAuth │
   │             │  │   bucket) │  │   + JWT)      │
   └─────────────┘  └───────────┘  └───────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui | SSR/ISR for SEO, API routes as backend |
| Compute | ECS Fargate (containerized) | Auto-scaling, no server management, predictable |
| Database | Amazon RDS PostgreSQL 16 | Managed PostgreSQL, Multi-AZ, automated backups |
| Package Storage | Amazon S3 | Durable object storage for .tar.gz packages |
| Auth | Amazon Cognito + GitHub OAuth | Managed user pool, JWT tokens, OAuth2 flows |
| CDN | CloudFront | Edge caching for static assets + marketplace.json |
| Load Balancer | Application Load Balancer (ALB) | Routes traffic to Fargate tasks, health checks |
| DNS | Route 53 | Domain management + SSL via ACM |
| Container Registry | Amazon ECR | Private Docker image registry |
| IaC | AWS CDK (TypeScript) | Infrastructure as code, same language as app |
| CI/CD | GitHub Actions -> ECR -> ECS | Build image, push to ECR, deploy to ECS |
| CLI | TypeScript npm package (`lootprotocol`) | `publish`, `search`, `install` commands |

### AWS Infrastructure Layout

```
VPC (10.0.0.0/16)
├── Public Subnets (2 AZs)
│   ├── ALB
│   └── NAT Gateway
├── Private Subnets (2 AZs)
│   ├── ECS Fargate Tasks (Next.js)
│   └── RDS PostgreSQL (Multi-AZ)
└── Security Groups
    ├── ALB-SG: inbound 80/443 from anywhere
    ├── ECS-SG: inbound from ALB-SG only
    └── RDS-SG: inbound 5432 from ECS-SG only
```

### Package Lifecycle

```
1. PUBLISH: Creator uploads archive (web UI or CLI)
   └─> Next.js API validates archive structure per type
   └─> Extracts metadata (plugin.json / SKILL.md frontmatter)
   └─> Uploads .tar.gz to S3 (s3://lootprotocol-packages/{slug}/{version}.tar.gz)
   └─> Writes metadata to RDS

2. UPDATE: Creator uploads new version
   └─> Same validation pipeline
   └─> New package in S3, new version row in RDS
   └─> Old versions retained (immutable)

3. INSTALL: User requests download (authenticated)
   └─> POST /api/extensions/{slug}/download
   └─> API verifies JWT, logs download event
   └─> Returns S3 pre-signed URL (expires in 15 min)
   └─> CLI/skill downloads from pre-signed URL, extracts locally
```

---

## Authentication (Amazon Cognito + GitHub OAuth)

### How It Works

Cognito User Pool acts as the identity provider. GitHub is configured as a Cognito Federated Identity Provider via OAuth2/OIDC.

**Flow:**
1. User clicks "Sign in with GitHub" -> redirect to Cognito Hosted UI
2. Cognito redirects to GitHub OAuth consent
3. GitHub redirects back to Cognito callback
4. Cognito creates/updates user, issues JWT tokens (ID + access + refresh)
5. Next.js stores tokens in HTTP-only cookies (web) or returns them to CLI

**JWT tokens** are verified in Next.js middleware/API routes using Cognito's JWKS endpoint. No database call needed for auth checks.

### Token Strategy

| Client | Token Storage | Auth Header |
|--------|-------------|-------------|
| Web (browser) | HTTP-only secure cookies | Cookie-based (automatic) |
| CLI | `~/.lootprotocol/config.json` | `Authorization: Bearer <access_token>` |
| In-agent skill | Delegates to CLI (reads stored token) | `Authorization: Bearer <access_token>` |

### Two User Roles

| Role | Auth Required | Capabilities |
|------|--------------|-------------|
| **Publisher** | GitHub OAuth via Cognito | Upload extensions, manage listings, view download stats |
| **User** | GitHub OAuth via Cognito | Browse catalog, download/install extensions, view install history |

Any user auto-promotes to publisher on first upload. The distinction is behavioral.

### What Auth Enables

- **Browsing** — public, no auth needed
- **Downloading/installing** — requires authentication (tracked per user)
- **Publishing** — requires authentication
- **Dashboard** — requires authentication (your extensions + download stats)
- **Install history** — users see what they've installed

---

## Submission & Validation

### Extension Types and Required Files

Creators upload a `.zip` or `.tar.gz` archive (via web UI or `lootprotocol publish`). The server unpacks it, validates against strict schemas per type, then stores the approved package.

#### Type 1: Skill

A single-purpose skill that teaches Claude how to perform a specific task.

```
my-skill/
├── SKILL.md          (REQUIRED — instructions + YAML frontmatter)
├── reference.md      (optional — detailed docs)
├── examples.md       (optional — usage examples)
└── scripts/          (optional — executable scripts)
    └── *.sh|*.py|*.js
```

**Validation rules:**
- `SKILL.md` must exist at root
- `SKILL.md` must have valid YAML frontmatter between `---` markers
- Frontmatter must include `description` field (string, non-empty)
- `name` field if present: lowercase, hyphens only, max 64 chars
- SKILL.md body must be non-empty (at least 10 chars of instructions)
- Total archive size < 5MB

#### Type 2: MCP Server

A server that provides tools/resources via the Model Context Protocol.

```
my-mcp-server/
├── mcp.json          (REQUIRED — server configuration)
├── package.json      (REQUIRED for Node.js) OR requirements.txt (for Python)
├── src/              (REQUIRED — server source code)
│   └── index.ts|main.py|...
├── README.md         (REQUIRED — usage instructions)
└── LICENSE           (optional)
```

**Validation rules:**
- `mcp.json` must exist with valid JSON containing at minimum:
  - `name` (string)
  - `transport` (`"stdio"` | `"http"` | `"sse"`)
  - For stdio: `command` (string) and optional `args` (array)
  - For http/sse: `url` (string)
- Must have either `package.json` (with `name`, `version`) or `requirements.txt`
- Must have a `src/` directory with at least one source file
- `README.md` must exist and be non-empty
- Total archive size < 50MB

#### Type 3: Plugin (Full Bundle)

A complete plugin with manifest, potentially containing skills, commands, agents, hooks, and MCP servers.

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json   (REQUIRED — manifest)
├── README.md          (REQUIRED)
├── skills/            (optional — one or more skills)
│   └── */SKILL.md
├── commands/          (optional — slash commands)
│   └── *.md
├── agents/            (optional — subagent definitions)
│   └── *.md
├── hooks/             (optional — event hooks)
│   └── hooks.json
├── .mcp.json          (optional — bundled MCP servers)
├── .lsp.json          (optional — LSP servers)
├── scripts/           (optional)
└── LICENSE            (optional)
```

**Validation rules:**
- `.claude-plugin/plugin.json` must exist with valid JSON containing:
  - `name` (string, kebab-case, required)
  - `version` (string, semver format, recommended)
  - `description` (string, recommended)
- Must have at least one component: `skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, or `.lsp.json`
- Every `skills/*/SKILL.md` must pass Skill validation rules
- Every `hooks/hooks.json` must be valid JSON matching hooks schema
- Every `.mcp.json` must be valid JSON matching MCP schema
- `README.md` must exist and be non-empty
- All paths in plugin.json must be relative (start with `./`)
- No path traversal (`../`) allowed
- Total archive size < 100MB

### Submission Flow

**Via Web UI (`/publish`):**
1. Creator signs in with GitHub (via Cognito)
2. Selects extension type (Skill / MCP Server / Plugin)
3. Uploads .zip or .tar.gz (drag-and-drop or file picker)
4. Server validates structure against the type's schema
5. If validation fails: show exact errors ("Missing SKILL.md", "Invalid plugin.json: name required")
6. If validation passes: show extracted metadata for review
7. Creator fills in: display name, category, tags (max 5), short description
8. Submits — package uploaded to S3, metadata written to RDS, listed immediately

**Via CLI (`lootprotocol publish`):**
```bash
cd my-extension/
lootprotocol publish --type skill

# Flow:
# 1. Prompts for auth if not logged in (lootprotocol login)
# 2. Packages current directory as .tar.gz
# 3. Validates locally first (fast feedback)
# 4. Uploads to Loot Protocol API
# 5. Server re-validates
# 6. Prompts for metadata (category, tags) or reads from lootprotocol.json
```

**Optional `lootprotocol.json`** (in extension root, for CLI convenience):
```json
{
  "type": "skill",
  "category": "development",
  "tags": ["code-review", "quality"],
  "displayName": "Code Review Assistant"
}
```

---

## Data Model

### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub TEXT NOT NULL UNIQUE,        -- Cognito user ID
  github_username TEXT NOT NULL UNIQUE,
  github_id BIGINT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',       -- 'user' or 'publisher'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `extensions`
```sql
CREATE TYPE extension_type AS ENUM ('skill', 'mcp_server', 'plugin');

CREATE TABLE extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT NOT NULL,
  extension_type extension_type NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  latest_version TEXT NOT NULL DEFAULT '1.0.0',
  readme_html TEXT,
  readme_text TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  publisher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) STORED
);
```

### `extension_versions`
```sql
CREATE TABLE extension_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  s3_key TEXT NOT NULL,                    -- S3 object key
  package_size_bytes INTEGER NOT NULL,
  metadata JSONB,                          -- plugin.json or extracted frontmatter
  changelog TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(extension_id, version)
);
```

### `download_events`
```sql
CREATE TABLE download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID NOT NULL REFERENCES extensions(id),
  version_id UUID REFERENCES extension_versions(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  source TEXT NOT NULL DEFAULT 'web',      -- 'web', 'cli', 'in-agent'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_download_events_extension ON download_events(extension_id);
CREATE INDEX idx_download_events_created ON download_events(created_at);
```

### `user_installs`
```sql
CREATE TABLE user_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES extension_versions(id),
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, extension_id)
);
```

### `categories` (seeded)
Development Tools, Productivity, Testing & QA, Security, Database & Backend, DevOps & Deployment, Design & Frontend, Learning & Docs, Integrations, Other.

### Authorization (Application-Level Middleware)

Authorization is handled in Next.js middleware and API route handlers:

```typescript
// src/lib/auth/middleware.ts
// - Verifies Cognito JWT from cookie or Authorization header
// - Extracts user ID (cognito_sub) and attaches to request
// - Returns 401 for unauthenticated requests to protected routes

// src/lib/auth/guards.ts
// - requireAuth(): ensures user is logged in
// - requirePublisher(extensionSlug): ensures user owns the extension
// - requireDownloadAuth(): ensures user is logged in for download tracking
```

---

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/extensions` | GET | No | List/search/filter (paginated) |
| `/api/extensions` | POST | Publisher | Upload new extension (multipart form) |
| `/api/extensions/[slug]` | GET | No | Extension detail |
| `/api/extensions/[slug]` | PATCH | Owner | Update metadata |
| `/api/extensions/[slug]` | DELETE | Owner | Remove extension |
| `/api/extensions/[slug]/download` | POST | User | Track + return S3 pre-signed URL |
| `/api/extensions/[slug]/versions` | GET | No | List versions |
| `/api/extensions/[slug]/versions` | POST | Owner | Upload new version |
| `/api/extensions/[slug]/readme` | GET | No | Rendered README |
| `/api/marketplace.json` | GET | No | Claude Code-compatible manifest |
| `/api/categories` | GET | No | List categories |
| `/api/stats` | GET | No | Platform stats |
| `/api/users/me` | GET | User | Current user profile |
| `/api/users/me/installs` | GET | User | Install history |
| `/api/auth/callback` | GET | — | Cognito OAuth callback |
| `/api/auth/token` | POST | — | CLI token exchange |
| `/api/validate` | POST | Publisher | Validate archive without publishing |

---

## Scope (Full Vision — Post-MVP)

| Phase | Features |
|-------|----------|
| **2: Community** | Ratings/reviews, publisher verification badges, curated collections, trending algorithm |
| **3: Trust & Safety** | Security scanning (static analysis of scripts), automated sandboxed testing, abuse reporting, moderation queue |
| **4: Monetization** | Stripe integration, paid extensions, revenue sharing, featured listings |
| **5: Enterprise** | Private registries, SSO/SAML, audit logs, RBAC, white-label |
| **6: Deep Integration** | Deep link protocol, creator analytics dashboard, extension bundles, dependency resolution, auto-updates |

---

## MVP Slice (4-6 Weeks)

### Week 1-2: Foundation + AWS + Auth
- Next.js project setup (App Router, TypeScript, Tailwind, shadcn/ui)
- AWS CDK infrastructure stack:
  - VPC (2 AZs, public + private subnets)
  - RDS PostgreSQL (db.t4g.micro for MVP)
  - S3 bucket (`lootprotocol-packages`)
  - Cognito User Pool + GitHub as identity provider
  - ECR repository
  - ECS Fargate cluster + service + task definition
  - ALB + CloudFront distribution
  - Route 53 hosted zone + ACM certificate
- Dockerfile for Next.js app
- Database schema (SQL migrations via `node-pg-migrate` or Prisma)
- GitHub OAuth flow via Cognito
- JWT verification middleware
- Root layout (header, footer, nav, auth state)
- Landing page with hero + featured extensions + platform stats
- Sign in / sign out flow

### Week 2-3: Core Discovery
- `/explore` — browse/search with category filters and text search
- `/extensions/[slug]` — detail page: README, metadata sidebar, download count, install command
- `/publishers/[username]` — publisher profile + their extensions
- Download endpoint: auth gate + download event tracking + S3 pre-signed URL
- `GET /api/marketplace.json` — Claude Code compatibility bridge

### Week 3-4: Publishing + Validation
- Validation pipeline: unpack archive -> validate per type -> extract metadata
- `/publish` — multi-step form: select type -> upload archive -> see validation result -> fill metadata -> submit
- S3 upload from API route (multipart form -> validate -> upload to S3)
- `/api/validate` — dry-run validation endpoint
- `/dashboard` — manage listings, view download counts per extension
- Version update flow (upload new version to existing extension)

### Week 4-5: CLI + In-Agent Skill
- `lootprotocol` CLI: `login`, `publish`, `search`, `info`, `install`, `validate` commands
- CLI auth via browser-based Cognito flow (opens browser, stores tokens locally)
- CLI local validation before upload (same rules as server)
- Loot Protocol Claude Code plugin with `search` and `install` skills
- `/docs` pages (getting started, publishing guide, CLI reference)

### Week 5-6: Polish + Launch
- SEO (meta tags, OG images, structured data)
- Error handling, loading states, empty states
- Rate limiting (ALB + application-level)
- CI/CD pipeline (GitHub Actions -> ECR -> ECS deploy)
- Seed with initial extensions
- Deploy to production AWS

### What We Explicitly Defer
- Payments / monetization
- Ratings and reviews
- Security scanning of scripts
- Publisher verification badges
- Private registries / enterprise
- Deep link protocol
- Detailed analytics dashboard (basic download count only)
- Admin panel (direct RDS access for now)
- Auto-update notifications
- Extension dependencies
- WAF rules (add in Phase 3)
- Auto-scaling policies (manual scaling for MVP traffic)

### User Flows

**Creator publishes (web):**
1. Sign in with GitHub (via Cognito)
2. `/publish` -> select type (Skill / MCP Server / Plugin)
3. Upload .zip or .tar.gz
4. See validation results (pass/fail with specific errors)
5. Review extracted metadata, fill in display name / category / tags
6. Submit -> package in S3, metadata in RDS, live immediately

**Creator publishes (CLI):**
```bash
lootprotocol login                    # opens browser for Cognito OAuth
cd my-skill/
lootprotocol publish --type skill     # validates locally, packages, uploads
```

**User installs (web):**
1. Sign in with GitHub
2. Browse `/explore`, find extension
3. Click "Install" -> copies CLI command
4. Run in terminal

**User installs (CLI):**
```bash
lootprotocol login                    # one-time
lootprotocol search "code review"
lootprotocol install code-review      # auth'd download from S3, extract to plugin dir
```

**User installs (in-agent):**
```
/lootprotocol:search code review
/lootprotocol:install code-review
```

---

## Project Structure

```
lootprotocol/
├── infra/                       (AWS CDK — infrastructure as code)
│   ├── bin/app.ts               (CDK app entry)
│   ├── lib/
│   │   ├── vpc-stack.ts         (VPC, subnets, NAT)
│   │   ├── database-stack.ts    (RDS PostgreSQL)
│   │   ├── storage-stack.ts     (S3 bucket)
│   │   ├── auth-stack.ts        (Cognito + GitHub IdP)
│   │   ├── compute-stack.ts     (ECR, ECS Fargate, ALB)
│   │   └── cdn-stack.ts         (CloudFront, Route 53, ACM)
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── explore/page.tsx
│   │   ├── extensions/[slug]/page.tsx
│   │   ├── publishers/[username]/page.tsx
│   │   ├── publish/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── docs/[slug]/page.tsx
│   │   ├── auth/callback/route.ts
│   │   └── api/
│   │       ├── extensions/route.ts                    (GET list, POST create)
│   │       ├── extensions/[slug]/route.ts             (GET, PATCH, DELETE)
│   │       ├── extensions/[slug]/download/route.ts    (POST — auth + tracking)
│   │       ├── extensions/[slug]/versions/route.ts    (GET, POST)
│   │       ├── extensions/[slug]/readme/route.ts      (GET)
│   │       ├── marketplace.json/route.ts              (GET)
│   │       ├── categories/route.ts                    (GET)
│   │       ├── publishers/[username]/route.ts         (GET)
│   │       ├── stats/route.ts                         (GET)
│   │       ├── validate/route.ts                      (POST — dry-run)
│   │       ├── users/me/route.ts                      (GET)
│   │       ├── users/me/installs/route.ts             (GET)
│   │       └── auth/token/route.ts                    (POST — CLI auth)
│   ├── components/
│   │   ├── ui/              (shadcn/ui primitives)
│   │   ├── layout/          (header, footer, sidebar, auth-guard)
│   │   ├── extensions/      (card, grid, detail, install-command, download-badge)
│   │   ├── search/          (search-bar, filter-sidebar)
│   │   ├── publish/         (type-selector, upload-zone, validation-results, metadata-form)
│   │   ├── dashboard/       (extension-list, stats-card, version-upload)
│   │   └── auth/            (sign-in-button, user-menu, auth-provider)
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── cognito.ts          (Cognito client, token verification)
│   │   │   ├── middleware.ts        (JWT verification middleware)
│   │   │   └── guards.ts           (requireAuth, requireOwner helpers)
│   │   ├── db/
│   │   │   ├── client.ts           (PostgreSQL connection pool — pg or Prisma)
│   │   │   ├── queries/            (typed query functions per table)
│   │   │   └── migrations/         (SQL migration files)
│   │   ├── s3/
│   │   │   ├── client.ts           (S3 client)
│   │   │   ├── upload.ts           (upload package to S3)
│   │   │   └── presign.ts          (generate pre-signed download URLs)
│   │   ├── validation/
│   │   │   ├── index.ts            (orchestrator — picks validator by type)
│   │   │   ├── skill.ts            (SKILL.md + frontmatter validation)
│   │   │   ├── mcp-server.ts       (mcp.json + package structure)
│   │   │   ├── plugin.ts           (plugin.json manifest + components)
│   │   │   └── shared.ts           (archive unpacking, size limits, path traversal)
│   │   └── marketplace/
│   │       └── generate.ts         (generate marketplace.json from DB)
│   ├── hooks/               (use-extensions, use-search, use-auth)
│   └── types/               (extension, publisher, marketplace, validation)
├── cli/
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── commands/        (login, publish, search, install, info, validate)
│       ├── validation/      (shared validation logic)
│       └── api.ts           (API client with auth)
├── skill/                   (In-agent Loot Protocol plugin)
│   ├── .claude-plugin/plugin.json
│   └── skills/
│       ├── search/SKILL.md
│       └── install/SKILL.md
├── docs/                    (MDX content)
├── Dockerfile               (Next.js standalone build)
├── docker-compose.yml       (local dev: Postgres + app)
├── .github/workflows/
│   └── deploy.yml           (Build -> ECR -> ECS)
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

---

## CI/CD Pipeline

```
GitHub Push (main branch)
  └─> GitHub Actions workflow:
      1. Run lint + type-check + tests
      2. Build Docker image (Next.js standalone)
      3. Push image to ECR
      4. Update ECS service (rolling deployment)
      5. Run database migrations (if any)
      6. CloudFront cache invalidation (if static assets changed)
```

---

## Verification Plan

1. **Infrastructure**: `cdk deploy` -> all stacks created (VPC, RDS, S3, Cognito, ECS, ALB, CloudFront)
2. **Local dev**: `docker-compose up` -> app runs locally with PostgreSQL
3. **Auth**: GitHub OAuth sign-in via Cognito -> profile created -> JWT issued -> protected endpoints accessible
4. **Validation — Skill**: Upload .zip with valid SKILL.md -> passes. Missing SKILL.md -> rejected with error
5. **Validation — MCP Server**: Upload with valid mcp.json + package.json + src/ -> passes. Missing mcp.json -> rejected
6. **Validation — Plugin**: Upload with .claude-plugin/plugin.json + at least one component -> passes. Empty plugin -> rejected
7. **Publish flow (web)**: Upload valid archive -> extracted metadata shown -> submit -> package in S3 + row in RDS + appears in `/explore`
8. **Publish flow (CLI)**: `lootprotocol publish --type skill` -> validates locally -> uploads -> appears on web
9. **Download tracking**: Authenticated user hits download -> `download_events` row created, `download_count` incremented, S3 pre-signed URL returned
10. **Download auth gate**: Unauthenticated download attempt -> 401
11. **marketplace.json**: Download URLs point to our `/api/extensions/[slug]/download`
12. **CLI install**: `lootprotocol install <name>` -> authenticated download -> extract to Claude Code plugin directory
13. **In-agent**: `/lootprotocol:search` and `/lootprotocol:install` work end-to-end
14. **CI/CD**: Push to main -> image built -> deployed to ECS -> accessible via CloudFront
