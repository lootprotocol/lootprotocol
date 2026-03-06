# Phase 5: Integration (Starts After All 4 Workstreams Complete)

## Overview

This phase wires together the 4 independently-built workstreams into a single working system. It replaces all mocks with real implementations, runs end-to-end tests, deploys to AWS, and polishes the application. This phase should be done by **1-2 engineers** who have the best cross-workstream knowledge.

**Prerequisites:** All 4 engineers have completed their workstreams and merged to the main branch.

---

## What Each Workstream Delivers

| Workstream | Key Artifacts | Mock Replacements Needed |
|-----------|--------------|------------------------|
| **E1 (Infrastructure)** | Monorepo scaffold, Prisma schema, shared types, Docker, CDK stacks, CI/CD | None — produces the real implementations |
| **E2 (Auth)** | Auth library, middleware, guards, layout shell, dashboard, publisher pages | Mock DB -> Prisma, mock Cognito -> real Cognito |
| **E3 (Marketplace)** | All API routes, S3 integration, explore/detail/publish pages, components | Mock auth -> E2's auth, mock validation -> E4's validation, mock DB -> Prisma, mock S3 -> real/MinIO |
| **E4 (Validation+CLI)** | Validation package, CLI, Claude Code plugin, docs | Mock API -> real API, CLI config -> real Cognito URLs |

---

## Tasks (Ordered)

### Task 1: Merge All Workstreams

1. Create a fresh `integration` branch from `main`
2. Merge each engineer's branch one at a time, resolving conflicts:
   - E1 first (scaffold/foundation — should be cleanest merge)
   - E2 second (auth — touches layout.tsx which E1 may have scaffolded)
   - E3 third (marketplace — largest set of files)
   - E4 last (validation/CLI — mostly independent directories)
3. Resolve any file conflicts (likely in `package.json`, `layout.tsx`, `tsconfig.json`)
4. Run `pnpm install` to link all workspaces
5. Run `pnpm build` to verify TypeScript compilation

**Expected merge conflicts and resolution strategy:**

| File | Conflict Between | Resolution |
|------|-----------------|------------|
| `package.json` | E1 (scaffold) vs E3 (deps) vs E2 (deps) | Combine all dependencies |
| `src/app/layout.tsx` | E1 (scaffold) vs E2 (auth provider + layout) | Use E2's version (has AuthProvider) |
| `pnpm-workspace.yaml` | E1 (initial) vs E4 (packages/validation, cli) | Combine workspace entries |
| `tsconfig.json` | E1 vs others | Use E1's as base, add any path aliases others need |

### Task 2: Wire Prisma Into API Routes and Auth

**Replace mock DB with Prisma client everywhere.**

1. Ensure E1's `prisma/schema.prisma` is the single source of truth
2. Run `pnpm prisma generate` to generate the Prisma client
3. Create `src/lib/db/client.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client';

   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

   export const prisma = globalForPrisma.prisma ?? new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
   });

   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```

4. Update E3's query files (`src/lib/db/queries/extensions.ts`, `versions.ts`, `downloads.ts`):
   - Replace in-memory store operations with Prisma queries
   - Implement full-text search using raw SQL:
     ```typescript
     const results = await prisma.$queryRaw`
       SELECT *, ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
       FROM extensions
       WHERE search_vector @@ plainto_tsquery('english', ${query})
         AND is_published = true
       ORDER BY rank DESC
       LIMIT ${limit} OFFSET ${offset}
     `;
     ```

5. Update E2's query files (`src/lib/db/queries/profiles.ts`, `installs.ts`):
   - Replace mock profile store with Prisma queries

### Task 3: Wire Real Auth Into API Routes

**Replace mock auth guards in E3's code with E2's real auth.**

1. Remove `src/lib/auth/mock-guard.ts` from E3's code
2. Update all API route imports:
   ```typescript
   // Before (E3's mock):
   import { requireAuth } from '@/lib/auth/mock-guard';

   // After (E2's real):
   import { requireAuth, requirePublisher, requireDownloadAuth } from '@/lib/auth/guards';
   ```

3. Verify E2's middleware config (`src/middleware.ts`) covers all protected routes from E3:
   - `POST /api/extensions` (create)
   - `PATCH /api/extensions/[slug]` (update)
   - `DELETE /api/extensions/[slug]` (delete)
   - `POST /api/extensions/[slug]/download` (download tracking)
   - `POST /api/extensions/[slug]/versions` (new version)
   - `POST /api/validate` (dry-run)
   - `/dashboard/*` (pages)
   - `/publish/*` (pages)

4. Update E2's `requirePublisher` guard to query the real DB:
   ```typescript
   export async function requirePublisher(request: Request, extensionSlug: string): Promise<AuthUser> {
     const user = await requireAuth(request);
     const extension = await prisma.extension.findUnique({
       where: { slug: extensionSlug },
       select: { publisherId: true },
     });
     if (!extension || extension.publisherId !== user.id) {
       throw new ApiError(403, 'You do not own this extension');
     }
     return user;
   }
   ```

### Task 4: Wire Real Validation Into API Routes

**Replace mock validation in E3's code with E4's `@lootprotocol/validation` package.**

1. Remove `src/lib/validation/mock.ts` from E3's code
2. Update imports in API routes:
   ```typescript
   // Before (E3's mock):
   import { validateExtension } from '@/lib/validation/mock';

   // After (E4's real):
   import { validateExtension } from '@lootprotocol/validation';
   ```

3. Verify that `@lootprotocol/validation` is listed in root `package.json` dependencies (workspace link)
4. Test with real archives:
   - Upload a valid skill .tar.gz -> should pass validation and publish
   - Upload a .zip missing SKILL.md -> should return validation errors
   - Upload an oversized archive -> should be rejected

### Task 5: Wire Real S3

1. Verify E3's S3 client works with MinIO locally:
   ```bash
   docker-compose up db minio createbucket
   ```
2. Test upload + download flow end-to-end with MinIO
3. For production: remove `S3_ENDPOINT` and `forcePathStyle` (uses real AWS S3)
4. Verify pre-signed URLs work (download from MinIO in dev, S3 in prod)

### Task 6: Wire Dashboard to Real Extension Data

E2's dashboard page currently uses mock extension data. Wire it to E3's API:

1. Update `src/app/dashboard/page.tsx` to fetch from `GET /api/extensions?publisherId={userId}`
2. Update `src/components/dashboard/extension-list.tsx` to use real data
3. Update `src/components/dashboard/stats-card.tsx` to fetch from `GET /api/stats`
4. Wire `version-upload.tsx` to call `POST /api/extensions/[slug]/versions`

### Task 7: Wire CLI to Real API

1. Update `cli/src/config.ts` default API URL to production domain
2. Configure CLI OAuth to use real Cognito:
   - Set Cognito domain, client ID, callback URL in CLI config
   - Add `http://localhost:{port}/callback` to Cognito's allowed callback URLs
3. Test full CLI flow:
   ```bash
   lootprotocol login                     # Opens browser, completes OAuth
   lootprotocol search "test"             # Returns real results
   lootprotocol validate --type skill .   # Runs local validation
   lootprotocol publish --type skill .    # Publishes to real API
   lootprotocol install <slug>            # Downloads and extracts
   ```

### Task 8: Local Development Setup (docker-compose)

Ensure the full stack runs locally:

1. Update `docker-compose.yml` to include the Next.js app:
   ```yaml
   app:
     build:
       context: .
       dockerfile: Dockerfile
     ports:
       - "3000:3000"
     environment:
       DATABASE_URL: postgresql://lootprotocol:lootprotocol@db:5432/lootprotocol
       S3_ENDPOINT: http://minio:9000
       S3_BUCKET: lootprotocol-packages
       S3_ACCESS_KEY: minioadmin
       S3_SECRET_KEY: minioadmin
       AUTH_MOCK: "true"  # Use mock auth for local dev
     depends_on:
       db:
         condition: service_healthy
       minio:
         condition: service_started
   ```

2. Or for dev mode with hot-reload:
   ```bash
   docker-compose up db minio createbucket  # Start dependencies
   pnpm dev                                  # Start Next.js in dev mode
   ```

3. Add a setup script:
   ```bash
   # scripts/setup.sh
   docker-compose up -d db minio createbucket
   pnpm install
   pnpm prisma migrate dev
   pnpm prisma db seed
   echo "Ready! Run: pnpm dev"
   ```

### Task 9: End-to-End Testing

Test every critical flow end-to-end:

**Flow 1: Browse and Search (No Auth)**
1. Visit `/` -> Landing page loads with featured extensions (seeded data)
2. Visit `/explore` -> Browse page with category filters
3. Search for "test" -> Results appear
4. Filter by type "skill" -> Results filtered
5. Click an extension -> Detail page loads with README

**Flow 2: Sign In**
1. Click "Sign in with GitHub"
2. (Mock mode): Redirected to callback, session created
3. (Real mode): GitHub OAuth flow, Cognito callback, session created
4. Header shows user avatar and dropdown menu
5. `/api/users/me` returns profile

**Flow 3: Publish Extension (Web)**
1. Sign in
2. Visit `/publish`
3. Select type: "Skill"
4. Upload a valid .tar.gz with SKILL.md
5. See validation results (green checkmark)
6. Fill in display name, category, tags
7. Submit -> Extension created
8. Visit `/extensions/<slug>` -> Extension visible
9. Visit `/explore` -> Extension appears in search results

**Flow 4: Publish Extension (CLI)**
1. `lootprotocol login` -> Opens browser, completes auth
2. `cd test-skill/ && lootprotocol validate --type skill` -> Passes
3. `lootprotocol publish --type skill` -> Uploads, prompts for metadata, publishes
4. Visit extension on web -> Visible

**Flow 5: Download Extension (Web)**
1. Sign in
2. Visit an extension detail page
3. Click "Install" -> Shows CLI command to copy
4. (Behind the scenes: `POST /api/extensions/<slug>/download` creates download event)

**Flow 6: Install Extension (CLI)**
1. `lootprotocol login`
2. `lootprotocol search "code review"` -> Shows results
3. `lootprotocol install code-review` -> Downloads, extracts to `~/.claude/skills/code-review/`
4. Verify files exist at install path

**Flow 7: Dashboard**
1. Sign in
2. Visit `/dashboard`
3. See published extensions with download counts
4. Click "Upload New Version" -> Dialog opens
5. Upload new version -> Version created

**Flow 8: Validation Failures**
1. Attempt to publish a .tar.gz without SKILL.md -> Validation error shown
2. Attempt to publish a .zip with path traversal -> Rejected
3. Attempt to publish an oversized file -> Rejected
4. Attempt to download without auth -> 401

**Flow 9: marketplace.json**
1. `GET /api/marketplace.json` -> Returns valid JSON manifest
2. All extensions listed with correct download URLs
3. Download URLs require authentication

### Task 10: SEO & Meta Tags

1. Add meta tags to all pages:
   ```typescript
   // src/app/extensions/[slug]/page.tsx
   export async function generateMetadata({ params }): Promise<Metadata> {
     const extension = await getExtensionBySlug(params.slug);
     return {
       title: `${extension.displayName} - Loot Protocol`,
       description: extension.description,
       openGraph: {
         title: extension.displayName,
         description: extension.description,
         type: 'website',
       },
     };
   }
   ```

2. Add `robots.txt` and `sitemap.xml` generation
3. Add structured data (JSON-LD) for extensions

### Task 11: Error Handling & Polish

1. Add global error boundary (`src/app/error.tsx`)
2. Add not-found page (`src/app/not-found.tsx`)
3. Add loading states for all pages (`loading.tsx` files)
4. Add empty states for:
   - Explore page with no results
   - Dashboard with no extensions
   - Publisher profile with no extensions
5. Add rate limiting:
   - Application-level rate limiting on write endpoints
   - Use `next-rate-limit` or custom implementation
6. Add proper error responses for all API routes (consistent `ApiError` format)

### Task 12: Deploy to AWS

1. **Pre-deployment checklist:**
   - [ ] All CDK stacks synthesize without errors (`cdk synth`)
   - [ ] Environment variables documented and values ready
   - [ ] GitHub OAuth app created (real client ID + secret)
   - [ ] Domain name registered / DNS configured

2. **Deploy infrastructure:**
   ```bash
   cd infra
   cdk deploy --all
   ```

3. **Configure environment:**
   - Set RDS credentials in ECS task definition (from Secrets Manager)
   - Set Cognito outputs (pool ID, client ID, domain) in environment
   - Set S3 bucket name
   - Set production domain URL

4. **Run database migrations:**
   ```bash
   # Via ECS exec or a migration task
   pnpm prisma migrate deploy
   pnpm prisma db seed
   ```

5. **Deploy application:**
   - Push to `main` -> CI/CD builds image -> pushes to ECR -> deploys to ECS

6. **Verify production:**
   - [ ] CloudFront serves the landing page
   - [ ] GitHub OAuth flow works end-to-end
   - [ ] Can publish an extension via web
   - [ ] Can search and browse extensions
   - [ ] Can download with auth (pre-signed URL works)
   - [ ] CLI works against production API
   - [ ] `/api/marketplace.json` returns valid manifest

### Task 13: Seed Production Data

1. Publish 5-10 initial extensions to the platform:
   - 2-3 Skills (e.g., code review, commit message, test generator)
   - 2-3 MCP Servers (e.g., database query, file manager)
   - 1-2 Plugins (e.g., the Loot Protocol plugin itself)
2. Mark 3-5 as featured (`is_featured = true`)
3. Create publisher profiles for the team

---

## Integration Checklist

Use this as a tracking checklist during integration:

```
[ ] All branches merged cleanly
[ ] pnpm install succeeds
[ ] pnpm build succeeds (no TypeScript errors)
[ ] Prisma client generated
[ ] Docker compose starts all services

[ ] Mock auth replaced with real auth in all API routes
[ ] Mock validation replaced with @lootprotocol/validation
[ ] Mock DB replaced with Prisma queries
[ ] Mock S3 replaced with MinIO/real S3

[ ] E2E: Landing page loads with featured extensions
[ ] E2E: Sign in with GitHub works (mock mode)
[ ] E2E: Browse/search/filter works
[ ] E2E: Extension detail page renders README
[ ] E2E: Publish wizard works end-to-end
[ ] E2E: Download tracking works
[ ] E2E: Dashboard shows user's extensions
[ ] E2E: Publisher profile page works
[ ] E2E: CLI login works
[ ] E2E: CLI search works
[ ] E2E: CLI publish works
[ ] E2E: CLI install works
[ ] E2E: marketplace.json returns valid manifest

[ ] SEO meta tags on all pages
[ ] Error boundary works
[ ] Loading states on all pages
[ ] Empty states where needed
[ ] Rate limiting on write endpoints

[ ] CDK deploy succeeds
[ ] Production deployment works
[ ] Production OAuth flow works
[ ] Production publish/download works
[ ] SSL certificate valid
[ ] CloudFront caching correct
```

---

## Estimated Effort

- **Merge + fix conflicts:** 0.5-1 day
- **Wire Prisma + Auth + Validation + S3:** 2-3 days
- **E2E testing + bug fixes:** 2-3 days
- **SEO + polish:** 1-2 days
- **AWS deployment:** 1-2 days
- **Seed data + final verification:** 0.5-1 day

**Total: ~7-10 days** (1-2 engineers working in parallel on different tasks)
