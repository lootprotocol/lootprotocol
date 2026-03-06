# Engineer 1: Infrastructure, DevOps & Project Foundation

## Overview

You own the **entire AWS infrastructure**, **monorepo scaffolding**, **Prisma schema**, **shared TypeScript types**, **Docker setup**, and **CI/CD pipeline**. Your work defines the foundation that all other engineers build on — but since all 4 workstreams start simultaneously, you work independently. Other engineers use mocks during the parallel phase; your infrastructure is wired in during the Integration phase (Phase 5).

---

## File Ownership

```
lootprotocol/
  infra/                                    # AWS CDK (entire directory)
    bin/app.ts
    lib/vpc-stack.ts
    lib/database-stack.ts
    lib/storage-stack.ts
    lib/auth-stack.ts
    lib/compute-stack.ts
    lib/cdn-stack.ts
    package.json
    tsconfig.json
    cdk.json
  prisma/
    schema.prisma                           # Prisma schema (single source of truth)
    migrations/                             # Generated migration files
    seed.ts                                 # Seed data (categories, test extensions)
  packages/shared-types/                    # Shared TypeScript types package
    package.json
    tsconfig.json
    src/
      index.ts
      extension.ts
      user.ts
      validation.ts
      api.ts
      marketplace.ts
  Dockerfile                                # Next.js standalone production build
  docker-compose.yml                        # Local dev: Postgres + MinIO (S3) + App
  .github/workflows/deploy.yml              # CI/CD pipeline
  .env.example                              # All environment variables documented
  pnpm-workspace.yaml                       # Monorepo workspace config
  package.json                              # Root package.json
  next.config.ts                            # Next.js configuration
  tailwind.config.ts                        # Tailwind configuration
  tsconfig.json                             # Root TypeScript config
  .eslintrc.json                            # ESLint config
  .prettierrc                               # Prettier config
  .gitignore
  .dockerignore
```

---

## Shared Contracts (TypeScript Interfaces)

You define these in `packages/shared-types/`. All other engineers will implement against these same interfaces during the Integration phase.

```typescript
// packages/shared-types/src/extension.ts

export type ExtensionType = 'skill' | 'mcp_server' | 'plugin';

export interface Extension {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  description: string;
  extensionType: ExtensionType;
  category: string;
  tags: string[];
  latestVersion: string;
  readmeHtml: string | null;
  readmeText: string | null;
  downloadCount: number;
  publisherId: string;
  publisher?: Profile;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtensionVersion {
  id: string;
  extensionId: string;
  version: string;
  s3Key: string;
  packageSizeBytes: number;
  metadata: Record<string, unknown> | null;
  changelog: string | null;
  downloadCount: number;
  createdAt: string;
}

export interface ExtensionListQuery {
  q?: string;           // Full-text search
  category?: string;
  type?: ExtensionType;
  sort?: 'downloads' | 'recent' | 'relevance';
  page?: number;
  limit?: number;
}

export interface ExtensionCreatePayload {
  type: ExtensionType;
  archive: Buffer;
  filename: string;
  displayName?: string;
  category: string;
  tags?: string[];
}
```

```typescript
// packages/shared-types/src/user.ts

export type UserRole = 'user' | 'publisher';

export interface Profile {
  id: string;
  cognitoSub: string;
  githubUsername: string;
  githubId: number;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  cognitoSub: string;
  githubUsername: string;
  role: UserRole;
}
```

```typescript
// packages/shared-types/src/validation.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ExtractedMetadata | null;
}

export interface ValidationError {
  code: string;          // e.g. 'MISSING_FILE', 'INVALID_JSON', 'SIZE_EXCEEDED'
  message: string;
  path?: string;         // File path within archive
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

export interface ExtractedMetadata {
  name: string;
  description: string;
  version?: string;
  [key: string]: unknown;
}
```

```typescript
// packages/shared-types/src/api.ts

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccess<T> {
  data: T;
}
```

```typescript
// packages/shared-types/src/marketplace.ts

export interface MarketplaceManifest {
  version: string;
  extensions: MarketplaceEntry[];
  generatedAt: string;
}

export interface MarketplaceEntry {
  slug: string;
  name: string;
  description: string;
  type: ExtensionType;
  version: string;
  downloadUrl: string;
  publisher: string;
  tags: string[];
}
```

---

## Technical Decisions

| Decision | Choice | Rationale |
|---------|--------|-----------|
| Package manager | pnpm | Fast, disk-efficient, native workspace support |
| ORM | Prisma | Type-safe, schema-first, auto-generated client, built-in migrations |
| IaC | AWS CDK (TypeScript) | Same language as app, programmatic, testable |
| Local S3 | MinIO | S3-compatible, lightweight Docker container |
| Local DB | PostgreSQL 16 (Docker) | Matches production |
| Shared types | pnpm workspace package (`packages/shared-types`) | Single source of truth for interfaces |
| CI/CD | GitHub Actions | Tight GitHub integration, free for open source |
| Container registry | Amazon ECR | Native ECS integration |

---

## Tasks (Ordered)

### Task 1: Monorepo Scaffold

**Create the full project structure and configuration files.**

1. Initialize git repo (if not done)
2. Create `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'packages/*'
     - 'cli'
     - 'infra'
   ```
3. Create root `package.json` with scripts:
   - `dev` — run Next.js dev server
   - `build` — production build
   - `lint` — ESLint
   - `format` — Prettier
   - `db:migrate` — Prisma migrate
   - `db:seed` — Prisma seed
   - `docker:up` — docker-compose up
4. Run `pnpm create next-app` with App Router + TypeScript + Tailwind + `src/` directory
5. Install and configure `shadcn/ui`
6. Create `.env.example` with all environment variables:
   ```
   # Database
   DATABASE_URL=postgresql://lootprotocol:lootprotocol@localhost:5432/lootprotocol

   # AWS S3
   S3_BUCKET=lootprotocol-packages
   S3_REGION=us-east-1
   S3_ENDPOINT=http://localhost:9000        # MinIO for local dev
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin

   # AWS Cognito
   COGNITO_USER_POOL_ID=
   COGNITO_CLIENT_ID=
   COGNITO_CLIENT_SECRET=
   COGNITO_DOMAIN=
   COGNITO_ISSUER=

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:3000/api

   # Auth Mock (for local dev without Cognito)
   AUTH_MOCK=true
   ```
7. Create `.gitignore`, `.eslintrc.json`, `.prettierrc`, `tsconfig.json`

### Task 2: Shared Types Package

1. Create `packages/shared-types/` with all interfaces defined above
2. Create `package.json` with `name: "@lootprotocol/shared-types"`
3. Export all types from `src/index.ts`
4. Ensure it builds with `tsc`

### Task 3: Prisma Schema

**Define the complete database schema from PLAN.md.**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ExtensionType {
  skill
  mcp_server
  plugin
}

enum UserRole {
  user
  publisher
}

model Profile {
  id             String    @id @default(uuid()) @db.Uuid
  cognitoSub     String    @unique @map("cognito_sub")
  githubUsername  String    @unique @map("github_username")
  githubId       BigInt    @unique @map("github_id")
  displayName    String?   @map("display_name")
  avatarUrl      String?   @map("avatar_url")
  bio            String?
  websiteUrl     String?   @map("website_url")
  role           UserRole  @default(user)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  extensions     Extension[]
  downloads      DownloadEvent[]
  installs       UserInstall[]

  @@map("profiles")
}

model Extension {
  id              String        @id @default(uuid()) @db.Uuid
  slug            String        @unique
  name            String
  displayName     String?       @map("display_name")
  description     String
  extensionType   ExtensionType @map("extension_type")
  category        String
  tags            String[]      @default([])
  latestVersion   String        @default("1.0.0") @map("latest_version")
  readmeHtml      String?       @map("readme_html")
  readmeText      String?       @map("readme_text")
  downloadCount   Int           @default(0) @map("download_count")
  publisherId     String        @map("publisher_id") @db.Uuid
  isPublished     Boolean       @default(true) @map("is_published")
  isFeatured      Boolean       @default(false) @map("is_featured")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  publisher       Profile       @relation(fields: [publisherId], references: [id], onDelete: Cascade)
  versions        ExtensionVersion[]
  downloads       DownloadEvent[]
  installs        UserInstall[]

  @@map("extensions")
}

model ExtensionVersion {
  id               String    @id @default(uuid()) @db.Uuid
  extensionId      String    @map("extension_id") @db.Uuid
  version          String
  s3Key            String    @map("s3_key")
  packageSizeBytes Int       @map("package_size_bytes")
  metadata         Json?
  changelog        String?
  downloadCount    Int       @default(0) @map("download_count")
  createdAt        DateTime  @default(now()) @map("created_at")

  extension        Extension @relation(fields: [extensionId], references: [id], onDelete: Cascade)
  downloads        DownloadEvent[]
  installs         UserInstall[]

  @@unique([extensionId, version])
  @@map("extension_versions")
}

model DownloadEvent {
  id           String    @id @default(uuid()) @db.Uuid
  extensionId  String    @map("extension_id") @db.Uuid
  versionId    String?   @map("version_id") @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  source       String    @default("web")  // 'web', 'cli', 'in-agent'
  createdAt    DateTime  @default(now()) @map("created_at")

  extension    Extension        @relation(fields: [extensionId], references: [id])
  version      ExtensionVersion? @relation(fields: [versionId], references: [id])
  user         Profile          @relation(fields: [userId], references: [id])

  @@index([extensionId])
  @@index([createdAt])
  @@map("download_events")
}

model UserInstall {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  extensionId  String    @map("extension_id") @db.Uuid
  versionId    String    @map("version_id") @db.Uuid
  installedAt  DateTime  @default(now()) @map("installed_at")

  user         Profile          @relation(fields: [userId], references: [id], onDelete: Cascade)
  extension    Extension        @relation(fields: [extensionId], references: [id], onDelete: Cascade)
  version      ExtensionVersion @relation(fields: [versionId], references: [id])

  @@unique([userId, extensionId])
  @@map("user_installs")
}
```

After defining the schema:
1. Add a full-text search index via a raw SQL migration (Prisma doesn't support generated tsvector columns natively):
   ```sql
   ALTER TABLE extensions ADD COLUMN search_vector tsvector
     GENERATED ALWAYS AS (
       setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
       setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
       setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
       setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
       setweight(to_tsvector('english', coalesce(category, '')), 'C')
     ) STORED;
   CREATE INDEX idx_extensions_search ON extensions USING GIN(search_vector);
   ```
2. Run `pnpm prisma migrate dev` to generate initial migration
3. Create `prisma/seed.ts` with:
   - 10 categories: Development Tools, Productivity, Testing & QA, Security, Database & Backend, DevOps & Deployment, Design & Frontend, Learning & Docs, Integrations, Other
   - 2-3 test profiles
   - 5-10 sample extensions across all types

### Task 4: Docker Setup

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lootprotocol
      POSTGRES_PASSWORD: lootprotocol
      POSTGRES_DB: lootprotocol
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lootprotocol"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

  createbucket:
    image: minio/mc
    depends_on:
      minio:
        condition: service_started
    entrypoint: >
      /bin/sh -c "
      sleep 3;
      mc alias set minio http://minio:9000 minioadmin minioadmin;
      mc mb minio/lootprotocol-packages --ignore-existing;
      mc anonymous set download minio/lootprotocol-packages;
      exit 0;
      "

volumes:
  pgdata:
  miniodata:
```

**`Dockerfile` (production):**
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

### Task 5: AWS CDK Stacks

Create `infra/` as a CDK TypeScript project.

**`infra/lib/vpc-stack.ts`:**
- VPC with CIDR `10.0.0.0/16`
- 2 Availability Zones
- Public subnets (for ALB + NAT Gateway)
- Private subnets (for ECS + RDS)
- NAT Gateway (single for MVP cost savings)
- Security Groups:
  - `alb-sg`: inbound 80/443 from anywhere
  - `ecs-sg`: inbound from ALB-SG only
  - `rds-sg`: inbound 5432 from ECS-SG only

**`infra/lib/database-stack.ts`:**
- RDS PostgreSQL 16 instance
- Instance class: `db.t4g.micro` (MVP)
- Private subnet placement
- Multi-AZ: false for MVP (enable later)
- Automated backups: 7 days retention
- Uses `rds-sg` security group
- Outputs: DB endpoint, port, secret ARN

**`infra/lib/storage-stack.ts`:**
- S3 bucket: `lootprotocol-packages-{account}-{region}`
- CORS configuration for web uploads
- Lifecycle rule: abort incomplete multipart uploads after 7 days
- Block public access (pre-signed URLs only)
- Versioning enabled
- Outputs: bucket name, ARN

**`infra/lib/auth-stack.ts`:**
- Cognito User Pool
- GitHub as OAuth2 identity provider:
  - Authorization endpoint: `https://github.com/login/oauth/authorize`
  - Token endpoint: `https://github.com/login/oauth/access_token`
  - User info endpoint: `https://api.github.com/user`
  - Scopes: `user:email`, `read:user`
- User Pool Client with:
  - Callback URLs: `https://{domain}/auth/callback`, `http://localhost:3000/auth/callback`
  - Logout URLs: `https://{domain}`, `http://localhost:3000`
  - OAuth flows: authorization code grant
- Cognito Domain (prefix)
- Outputs: User Pool ID, Client ID, Client Secret, Domain

**`infra/lib/compute-stack.ts`:**
- ECR Repository: `lootprotocol`
- ECS Cluster
- Fargate Task Definition:
  - CPU: 256, Memory: 512 (MVP)
  - Container: Next.js app from ECR
  - Environment variables from other stacks
  - Secrets from Secrets Manager (DB password, Cognito secret)
- ECS Service: desired count 1 (MVP), rolling deployment
- ALB with target group + health check (`/api/health`)
- HTTPS listener (ACM certificate)
- HTTP -> HTTPS redirect

**`infra/lib/cdn-stack.ts`:**
- CloudFront distribution:
  - Origin: ALB
  - Cache behaviors: static assets cached, API/auth paths not cached
  - Custom domain via Route 53
  - ACM certificate (us-east-1 for CloudFront)
- Route 53 A/AAAA records pointing to CloudFront

**`infra/bin/app.ts`:**
- Stack ordering with cross-stack references
- Environment-based configuration (dev/staging/prod)

### Task 6: CI/CD Pipeline

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: lootprotocol
  ECS_SERVICE: lootprotocol-service
  ECS_CLUSTER: lootprotocol-cluster

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - name: Build and push Docker image
        run: |
          docker build -t ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }} .
          docker push ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
```

### Task 7: Seed Script & Health Endpoint

1. `prisma/seed.ts` — Insert categories and sample data
2. Create `src/app/api/health/route.ts`:
   ```typescript
   export async function GET() {
     return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
   }
   ```

---

## Mock Strategy

This workstream has **no mocks** — it's infrastructure and scaffolding. It produces artifacts consumed by other workstreams during integration.

For testing CDK stacks locally:
- Use `cdk synth` to generate CloudFormation templates
- Use `cdk diff` to compare with deployed state
- Write CDK snapshot tests

---

## Deliverables & Acceptance Criteria

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | Monorepo scaffold | `pnpm install` succeeds, `pnpm dev` starts Next.js, `pnpm build` produces standalone output |
| 2 | Shared types package | `@lootprotocol/shared-types` importable from any workspace package |
| 3 | Prisma schema | `pnpm prisma migrate dev` creates all tables, `pnpm prisma generate` produces typed client |
| 4 | Docker compose | `docker-compose up` starts Postgres + MinIO, app can connect to both |
| 5 | Dockerfile | `docker build .` succeeds, container starts and serves on port 3000 |
| 6 | CDK stacks | `cdk synth` generates valid CloudFormation for all 6 stacks |
| 7 | CI/CD pipeline | Push to main triggers build+deploy (verified after Phase 5 integration) |
| 8 | Seed data | `pnpm prisma db seed` inserts categories and sample extensions |

---

## Handoff to Integration (Phase 5)

You deliver:
- Working monorepo with `pnpm-workspace.yaml` linking all packages
- Prisma schema + migrations ready to apply
- Docker compose for local dev
- Production Dockerfile
- CDK stacks ready for `cdk deploy`
- CI/CD workflow
- Shared types package
- `.env.example` with all required variables

Phase 5 will:
- Wire Prisma client into E2 and E3's code
- Deploy CDK stacks to AWS
- Configure real Cognito credentials in environment
- Run the full CI/CD pipeline
