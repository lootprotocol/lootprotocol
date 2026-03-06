# Engineer 3: Marketplace Domain (API Routes, S3, Pages & Components)

## Overview

You own the **core marketplace experience** — all extension API routes, S3 package storage integration, the explore/search page, extension detail page, publish wizard, and all marketplace UI components. This is the largest workstream because it spans the primary API surface and the main user-facing pages.

Since all 4 workstreams run in parallel, you work with a **mock auth** (hardcoded user), **mock validation** (always passes), and **mock S3** (local filesystem or MinIO) during development. Real implementations are wired in during Phase 5 (Integration).

---

## File Ownership

```
src/
  app/
    page.tsx                                         # Landing page (hero, featured, stats)
    explore/
      page.tsx                                       # Browse/search with filters
    extensions/
      [slug]/
        page.tsx                                     # Extension detail page
    publish/
      page.tsx                                       # Publish wizard (multi-step)
    api/
      extensions/
        route.ts                                     # GET list, POST create
        [slug]/
          route.ts                                   # GET detail, PATCH update, DELETE
          download/
            route.ts                                 # POST (auth + tracking + S3 presign)
          versions/
            route.ts                                 # GET list, POST new version
          readme/
            route.ts                                 # GET rendered README
      marketplace.json/
        route.ts                                     # GET Claude Code manifest
      categories/
        route.ts                                     # GET category list
      stats/
        route.ts                                     # GET platform stats
      validate/
        route.ts                                     # POST dry-run validation
  lib/
    s3/
      client.ts                                      # S3/MinIO client init
      upload.ts                                      # Upload package to S3
      presign.ts                                     # Generate pre-signed download URL
      mock.ts                                        # Local filesystem mock for S3
    db/
      queries/
        extensions.ts                                # Typed queries for extensions table
        versions.ts                                  # Typed queries for extension_versions
        downloads.ts                                 # Typed queries for download_events
    marketplace/
      generate.ts                                    # Build marketplace.json from data
  components/
    extensions/
      extension-card.tsx                             # Card for grid display
      extension-grid.tsx                             # Responsive grid of cards
      extension-detail.tsx                           # Full detail view layout
      install-command.tsx                             # Copyable CLI install command
      download-badge.tsx                             # Download count badge
      readme-renderer.tsx                            # Markdown -> sanitized HTML
      extension-type-badge.tsx                       # Skill/MCP/Plugin badge
    search/
      search-bar.tsx                                 # Debounced search input
      filter-sidebar.tsx                             # Category + type filters
      sort-select.tsx                                # Sort dropdown
      search-results.tsx                             # Results container with pagination
    publish/
      type-selector.tsx                              # Extension type selection (step 1)
      upload-zone.tsx                                # Drag-and-drop file upload (step 2)
      validation-results.tsx                         # Validation pass/fail display (step 3)
      metadata-form.tsx                              # Display name, category, tags (step 4)
      publish-wizard.tsx                             # Multi-step orchestrator
  hooks/
    use-extensions.ts                                # Fetch + cache extension data
    use-search.ts                                    # Debounced search with URL sync
```

---

## Shared Contracts

### Interfaces You Implement

```typescript
// API Route handlers
GET  /api/extensions              -> PaginatedResponse<Extension>
POST /api/extensions              -> ApiSuccess<Extension>
GET  /api/extensions/[slug]       -> ApiSuccess<Extension & { versions: ExtensionVersion[] }>
PATCH /api/extensions/[slug]      -> ApiSuccess<Extension>
DELETE /api/extensions/[slug]     -> { success: true }
POST /api/extensions/[slug]/download -> { url: string }
GET  /api/extensions/[slug]/versions -> ExtensionVersion[]
POST /api/extensions/[slug]/versions -> ApiSuccess<ExtensionVersion>
GET  /api/extensions/[slug]/readme   -> { html: string }
GET  /api/marketplace.json        -> MarketplaceManifest
GET  /api/categories              -> { categories: Category[] }
GET  /api/stats                   -> PlatformStats
POST /api/validate                -> ValidationResult

// S3 functions
export async function uploadPackage(slug: string, version: string, buffer: Buffer): Promise<string>;
export async function getPresignedDownloadUrl(s3Key: string): Promise<string>;
```

### Interfaces You Consume

```typescript
// From E2 (Auth) — mock during parallel phase
import { requireAuth, requirePublisher, requireDownloadAuth } from '@/lib/auth/guards';

// From E4 (Validation) — mock during parallel phase
import { validateExtension } from '@lootprotocol/validation';

// From shared types
import { Extension, ExtensionVersion, ExtensionType, PaginatedResponse } from '@lootprotocol/shared-types';
```

---

## Technical Decisions

| Decision | Choice | Rationale |
|---------|--------|-----------|
| S3 client | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Official AWS SDK v3, tree-shakeable |
| Local S3 | MinIO via docker-compose (provided by E1) or local FS mock | S3-compatible API for local dev |
| File upload (server) | Next.js `request.formData()` + buffer handling | No extra multipart library needed |
| File upload (client) | Native `<input type="file">` + `FormData` fetch | Simple, no heavy upload library |
| Markdown rendering | `react-markdown` + `remark-gfm` + `rehype-sanitize` | Safe HTML from user README content |
| Search UX | Debounced input + URL query param sync | Shareable search URLs, no unnecessary API calls |
| Pagination | Cursor-based internally, page-based API | Better DB performance, familiar API surface |
| UI components | shadcn/ui (Card, Badge, Input, Select, Tabs, Dialog, Skeleton) | Project-wide standard |

### Libraries to Install

```
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add react-markdown remark-gfm rehype-sanitize
pnpm add slugify                  # Generate URL-safe slugs from extension names
pnpm add -D @types/node
```

---

## Tasks (Ordered)

### Task 1: S3 Integration Layer

**Files:** `src/lib/s3/client.ts`, `src/lib/s3/upload.ts`, `src/lib/s3/presign.ts`, `src/lib/s3/mock.ts`

**`client.ts`:**
```typescript
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  ...(process.env.S3_ENDPOINT && {
    endpoint: process.env.S3_ENDPOINT,        // MinIO for local dev
    forcePathStyle: true,                      // Required for MinIO
  }),
  ...(process.env.S3_ACCESS_KEY && {
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  }),
});

export const BUCKET = process.env.S3_BUCKET || 'lootprotocol-packages';
```

**`upload.ts`:**
```typescript
export async function uploadPackage(
  slug: string,
  version: string,
  buffer: Buffer,
  contentType: string = 'application/gzip'
): Promise<string> {
  const key = `${slug}/${version}.tar.gz`;
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
}
```

**`presign.ts`:**
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function getPresignedDownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes
}
```

**`mock.ts` — Local filesystem fallback:**
```typescript
// When S3_MOCK=true, write to /tmp/lootprotocol-packages/ instead
// and return file:// URLs for downloads
// This enables testing without MinIO if docker-compose isn't running
```

### Task 2: Database Query Layer

**Files:** `src/lib/db/queries/extensions.ts`, `versions.ts`, `downloads.ts`

During the parallel phase, implement these against an **in-memory store** or mock data. Structure them so they can be swapped to Prisma calls in Phase 5.

**`extensions.ts`:**
```typescript
// Interface-first approach: define the shape, mock the implementation

export async function listExtensions(query: ExtensionListQuery): Promise<PaginatedResponse<Extension>> {
  // Mock: filter/sort/paginate from in-memory array
  // Real (Phase 5): Prisma query with full-text search
}

export async function getExtensionBySlug(slug: string): Promise<Extension | null> {
  // Include publisher, latest version
}

export async function createExtension(data: {
  slug: string;
  name: string;
  displayName?: string;
  description: string;
  extensionType: ExtensionType;
  category: string;
  tags: string[];
  publisherId: string;
  readmeText?: string;
  readmeHtml?: string;
}): Promise<Extension> {
  // Insert extension + first version
}

export async function updateExtension(slug: string, data: Partial<Extension>): Promise<Extension> {
  // Partial update
}

export async function deleteExtension(slug: string): Promise<void> {
  // Soft delete: set is_published = false
}

export async function searchExtensions(query: string): Promise<Extension[]> {
  // Mock: simple string.includes() matching
  // Real (Phase 5): PostgreSQL full-text search with ts_rank
}
```

**`versions.ts`:**
```typescript
export async function getVersions(extensionId: string): Promise<ExtensionVersion[]>;
export async function createVersion(extensionId: string, data: {
  version: string;
  s3Key: string;
  packageSizeBytes: number;
  metadata?: Record<string, unknown>;
  changelog?: string;
}): Promise<ExtensionVersion>;
export async function getLatestVersion(extensionId: string): Promise<ExtensionVersion | null>;
```

**`downloads.ts`:**
```typescript
export async function recordDownload(data: {
  extensionId: string;
  versionId?: string;
  userId: string;
  source: 'web' | 'cli' | 'in-agent';
}): Promise<void>;
// Also increments download_count on extension and version

export async function getDownloadStats(extensionId: string): Promise<{
  total: number;
  thisMonth: number;
  thisWeek: number;
}>;
```

### Task 3: Core API Routes — Read Operations

These have **no auth dependencies** and can be built immediately.

**`GET /api/extensions` (`src/app/api/extensions/route.ts`):**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query: ExtensionListQuery = {
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    type: searchParams.get('type') as ExtensionType || undefined,
    sort: searchParams.get('sort') as 'downloads' | 'recent' | 'relevance' || 'recent',
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
  };
  const result = await listExtensions(query);
  return Response.json(result);
}
```

**`GET /api/extensions/[slug]`:**
- Return extension with publisher info, latest version, and version list
- 404 if slug not found or not published

**`GET /api/extensions/[slug]/versions`:**
- Return array of all versions for the extension

**`GET /api/extensions/[slug]/readme`:**
- Return `{ html: string }` with rendered README HTML
- Use `react-markdown` on the server to pre-render

**`GET /api/marketplace.json`:**
```typescript
export async function GET() {
  const extensions = await getAllPublishedExtensions();
  const manifest: MarketplaceManifest = {
    version: '1.0',
    extensions: extensions.map(ext => ({
      slug: ext.slug,
      name: ext.name,
      description: ext.description,
      type: ext.extensionType,
      version: ext.latestVersion,
      downloadUrl: `${process.env.NEXT_PUBLIC_API_URL}/extensions/${ext.slug}/download`,
      publisher: ext.publisher?.githubUsername || 'unknown',
      tags: ext.tags,
    })),
    generatedAt: new Date().toISOString(),
  };
  return Response.json(manifest, {
    headers: { 'Cache-Control': 'public, s-maxage=300' }, // 5 min cache
  });
}
```

**`GET /api/categories`:**
```typescript
const CATEGORIES = [
  { slug: 'development-tools', name: 'Development Tools', description: 'Code editors, linters, formatters' },
  { slug: 'productivity', name: 'Productivity', description: 'Workflow automation, task management' },
  { slug: 'testing-qa', name: 'Testing & QA', description: 'Test runners, assertions, mocking' },
  { slug: 'security', name: 'Security', description: 'Vulnerability scanning, auth tools' },
  { slug: 'database-backend', name: 'Database & Backend', description: 'ORMs, query builders, API tools' },
  { slug: 'devops-deployment', name: 'DevOps & Deployment', description: 'CI/CD, containers, monitoring' },
  { slug: 'design-frontend', name: 'Design & Frontend', description: 'UI components, styling, accessibility' },
  { slug: 'learning-docs', name: 'Learning & Docs', description: 'Documentation, tutorials, examples' },
  { slug: 'integrations', name: 'Integrations', description: 'Third-party service connectors' },
  { slug: 'other', name: 'Other', description: 'Extensions that don\'t fit other categories' },
];

export async function GET() {
  return Response.json({ categories: CATEGORIES });
}
```

**`GET /api/stats`:**
```typescript
export async function GET() {
  // Mock: return hardcoded stats
  // Real (Phase 5): Prisma aggregate queries
  return Response.json({
    totalExtensions: await countExtensions(),
    totalDownloads: await countDownloads(),
    totalPublishers: await countPublishers(),
  });
}
```

### Task 4: Core API Routes — Write Operations (Auth + Validation Required)

These routes need auth and validation. **Use mocks** during the parallel phase.

**Mock auth helper (temporary):**
```typescript
// src/lib/auth/mock-guard.ts (removed in Phase 5)
export async function requireAuth(_request: Request): Promise<AuthUser> {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    cognitoSub: 'mock-sub-123',
    githubUsername: 'test-publisher',
    role: 'publisher',
  };
}
```

**Mock validation (temporary):**
```typescript
// src/lib/validation/mock.ts (removed in Phase 5)
export async function validateExtension(
  _type: ExtensionType, _buffer: Buffer, _filename: string
): Promise<ValidationResult> {
  return { valid: true, errors: [], warnings: [], metadata: { name: 'mock', description: 'Mock extension' } };
}
```

**`POST /api/extensions` (create new extension):**
```typescript
export async function POST(request: Request) {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const file = formData.get('archive') as File;
  const type = formData.get('type') as ExtensionType;
  const displayName = formData.get('displayName') as string;
  const category = formData.get('category') as string;
  const tags = JSON.parse(formData.get('tags') as string || '[]');

  // 1. Read file into buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // 2. Validate
  const validation = await validateExtension(type, buffer, file.name);
  if (!validation.valid) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: validation.errors } }, { status: 400 });
  }

  // 3. Generate slug
  const slug = slugify(validation.metadata!.name, { lower: true, strict: true });

  // 4. Upload to S3
  const version = validation.metadata!.version || '1.0.0';
  const s3Key = await uploadPackage(slug, version, buffer);

  // 5. Create extension in DB
  const extension = await createExtension({
    slug,
    name: validation.metadata!.name,
    displayName,
    description: validation.metadata!.description,
    extensionType: type,
    category,
    tags,
    publisherId: user.id,
    readmeText: validation.metadata!.readme,
    readmeHtml: renderMarkdown(validation.metadata!.readme),
  });

  return Response.json({ data: extension }, { status: 201 });
}
```

**`PATCH /api/extensions/[slug]`:**
- Uses `requirePublisher(request, slug)`
- Updates: displayName, description, category, tags, isPublished
- Returns updated extension

**`DELETE /api/extensions/[slug]`:**
- Uses `requirePublisher(request, slug)`
- Soft deletes (sets `isPublished = false`)

**`POST /api/extensions/[slug]/download`:**
```typescript
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const user = await requireDownloadAuth(request);
  const extension = await getExtensionBySlug(params.slug);
  if (!extension) return Response.json({ error: 'Not found' }, { status: 404 });

  const latestVersion = await getLatestVersion(extension.id);
  if (!latestVersion) return Response.json({ error: 'No versions' }, { status: 404 });

  // Record download event
  const source = request.headers.get('X-Download-Source') || 'web';
  await recordDownload({
    extensionId: extension.id,
    versionId: latestVersion.id,
    userId: user.id,
    source: source as 'web' | 'cli' | 'in-agent',
  });

  // Generate pre-signed URL
  const url = await getPresignedDownloadUrl(latestVersion.s3Key);
  return Response.json({ url });
}
```

**`POST /api/extensions/[slug]/versions`:**
- Uses `requirePublisher(request, slug)`
- Accepts multipart form with archive + changelog
- Validates, uploads to S3, creates version row
- Updates `latestVersion` on extension

**`POST /api/validate` (dry-run):**
```typescript
export async function POST(request: Request) {
  await requireAuth(request);
  const formData = await request.formData();
  const file = formData.get('archive') as File;
  const type = formData.get('type') as ExtensionType;

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await validateExtension(type, buffer, file.name);
  return Response.json(result);
}
```

### Task 5: UI Components

**Extension components (`src/components/extensions/`):**

**`extension-card.tsx`:**
- Card with: type badge, name, description (truncated), publisher, download count, tags
- Clickable -> links to `/extensions/[slug]`
- Uses shadcn/ui Card component

**`extension-grid.tsx`:**
- Responsive CSS grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- Accepts `extensions: Extension[]` prop
- Renders `ExtensionCard` for each

**`extension-detail.tsx`:**
- Two-column layout: README content (left, wide) + metadata sidebar (right)
- Sidebar: type, category, tags, publisher link, download count, latest version, install command, "Download" button
- Uses `ReadmeRenderer` for README content

**`install-command.tsx`:**
- Displays `lootprotocol install <slug>` in a code block
- Copy-to-clipboard button

**`download-badge.tsx`:**
- Shows download count with download icon
- Formats large numbers (1.2k, 15k, etc.)

**`readme-renderer.tsx`:**
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export function ReadmeRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**`extension-type-badge.tsx`:**
- Colored badge: Skill (blue), MCP Server (green), Plugin (purple)

**Search components (`src/components/search/`):**

**`search-bar.tsx`:**
- Debounced input (300ms) with search icon
- Syncs with URL query params (`?q=...`)
- Shows clear button when has value

**`filter-sidebar.tsx`:**
- Category filter (checkbox group)
- Extension type filter (radio group: All, Skill, MCP Server, Plugin)
- "Clear filters" button
- Collapsible on mobile

**`sort-select.tsx`:**
- Dropdown: Most Downloads, Most Recent, Most Relevant (only when searching)
- Syncs with URL query params (`?sort=...`)

**`search-results.tsx`:**
- Renders `ExtensionGrid` with results
- Shows result count
- Pagination controls (Previous / Next with page numbers)
- Loading skeleton while fetching
- Empty state: "No extensions found" with suggestion

**Publish components (`src/components/publish/`):**

**`type-selector.tsx`:**
- Three large cards: Skill, MCP Server, Plugin
- Each with icon, title, description, and "what to include" list
- Single selection -> advances to next step

**`upload-zone.tsx`:**
- Drag-and-drop area with dashed border
- Accepts `.zip` and `.tar.gz` files
- Shows file name + size after selection
- File type validation (reject other formats)
- Max size indicator per type (5MB/50MB/100MB)

**`validation-results.tsx`:**
- If valid: green checkmark + extracted metadata preview
- If invalid: red X + list of errors with file paths
- If warnings: yellow triangle + warning messages
- "Try again" button if failed

**`metadata-form.tsx`:**
- Fields: Display Name (text), Category (select from categories), Tags (multi-select, max 5)
- Pre-filled from extracted metadata where possible
- Zod validation

**`publish-wizard.tsx`:**
- Multi-step form orchestrator
- Steps: Select Type -> Upload -> Validation -> Metadata -> Confirm -> Success
- Progress indicator (step dots)
- Back/Next navigation
- Final submit calls `POST /api/extensions`

### Task 6: Pages

**`src/app/page.tsx` (Landing page):**
- Hero section: headline, tagline, CTA buttons ("Explore Extensions", "Publish Yours")
- Featured extensions grid (fetch `GET /api/extensions?sort=downloads&limit=6`)
- Platform stats bar (fetch `GET /api/stats`)
- "How it works" section: 3 steps (Browse, Install, Use)
- "For Creators" section: 3 steps (Build, Publish, Share)

**`src/app/explore/page.tsx`:**
- Server component with client-side interactivity
- Layout: filter sidebar (left) + search bar (top) + results grid (center)
- URL-driven state: `?q=...&category=...&type=...&sort=...&page=...`
- Initial data fetched server-side for SEO
- Subsequent interactions use client-side fetch

**`src/app/extensions/[slug]/page.tsx`:**
- Server component (SSR for SEO)
- Fetches `GET /api/extensions/[slug]` + `GET /api/extensions/[slug]/readme`
- Two-column layout using `ExtensionDetail` component
- Meta tags for SEO (title, description, OG image)
- 404 page if slug not found

**`src/app/publish/page.tsx`:**
- Protected page (uses AuthGuard from E2, or mock guard)
- Renders `PublishWizard` component
- Success page shows: extension URL, install command, "View Extension" button

### Task 7: Custom Hooks

**`use-extensions.ts`:**
```typescript
export function useExtensions(query: ExtensionListQuery) {
  // SWR or React Query pattern
  // Returns { data, isLoading, error, mutate }
  // Fetches from GET /api/extensions with query params
}

export function useExtension(slug: string) {
  // Returns single extension detail
}
```

**`use-search.ts`:**
```typescript
export function useSearch() {
  // Manages search state: query, filters, sort, page
  // Syncs with URL search params (useSearchParams)
  // Debounces query input (300ms)
  // Returns { query, setQuery, filters, setFilters, sort, setSort, results, isLoading }
}
```

---

## Mock Strategy

### Mock Auth
Create a simple mock that returns a hardcoded user for all auth guard calls:
```typescript
// src/lib/auth/mock-guard.ts
const MOCK_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  cognitoSub: 'mock-sub-123',
  githubUsername: 'test-publisher',
  role: 'publisher',
};

export async function requireAuth(_req: Request): Promise<AuthUser> { return MOCK_USER; }
export async function requirePublisher(_req: Request, _slug: string): Promise<AuthUser> { return MOCK_USER; }
export async function requireDownloadAuth(_req: Request): Promise<AuthUser> { return MOCK_USER; }
```

Switch between mock and real auth via an import alias or env check:
```typescript
const { requireAuth } = process.env.AUTH_MOCK === 'true'
  ? await import('./mock-guard')
  : await import('@/lib/auth/guards');
```

### Mock Validation
```typescript
// src/lib/validation/mock.ts
export async function validateExtension(
  type: ExtensionType, buffer: Buffer, filename: string
): Promise<ValidationResult> {
  return {
    valid: true,
    errors: [],
    warnings: [],
    metadata: { name: filename.replace(/\.(zip|tar\.gz|tgz)$/, ''), description: 'Mock extension', version: '1.0.0' },
  };
}
```

### Mock S3
If MinIO (from docker-compose) isn't available:
```typescript
// src/lib/s3/mock.ts
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const MOCK_DIR = '/tmp/lootprotocol-packages';

export async function uploadPackage(slug: string, version: string, buffer: Buffer): Promise<string> {
  const dir = path.join(MOCK_DIR, slug);
  await mkdir(dir, { recursive: true });
  const key = `${slug}/${version}.tar.gz`;
  await writeFile(path.join(MOCK_DIR, key), buffer);
  return key;
}

export async function getPresignedDownloadUrl(s3Key: string): Promise<string> {
  return `file://${path.join(MOCK_DIR, s3Key)}`;
}
```

### Mock Database
Use an in-memory store seeded with sample extensions:
```typescript
// src/lib/db/mock-store.ts
const extensions: Extension[] = [
  { id: '1', slug: 'code-review', name: 'code-review', displayName: 'Code Review', ... },
  { id: '2', slug: 'git-commit', name: 'git-commit', displayName: 'Git Commit Helper', ... },
  // ... 8 more sample extensions
];
```

---

## Deliverables & Acceptance Criteria

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | S3 integration | `uploadPackage()` writes to MinIO/mock, `getPresignedDownloadUrl()` returns valid URL |
| 2 | `GET /api/extensions` | Returns paginated list, supports search/filter/sort query params |
| 3 | `POST /api/extensions` | Accepts multipart form, calls validation (mock), uploads to S3, creates record |
| 4 | `GET /api/extensions/[slug]` | Returns full extension detail with publisher and versions |
| 5 | `POST /api/extensions/[slug]/download` | Records download event, returns pre-signed URL |
| 6 | All other API routes | Each responds correctly per the API contract |
| 7 | Landing page | Renders hero, featured extensions, stats |
| 8 | Explore page | Search works, filters work, pagination works, URL params sync |
| 9 | Extension detail page | Renders README, metadata sidebar, install command |
| 10 | Publish wizard | Multi-step flow: type -> upload -> validate -> metadata -> submit |
| 11 | All components | Responsive, loading states, empty states |

---

## Handoff to Integration (Phase 5)

You deliver:
- Complete API routes (all 16 endpoints) with mock auth/validation/DB
- S3 integration (works with MinIO)
- All pages and components (responsive, functional)
- Custom hooks for data fetching

Phase 5 will:
- Replace mock auth guards with E2's real `requireAuth`/`requirePublisher`/`requireDownloadAuth`
- Replace mock validation with E4's `@lootprotocol/validation` package
- Replace mock DB store with Prisma client calls (E1's schema)
- Configure S3 to point to real AWS bucket
- Add SEO meta tags + OG images
- Add loading states, error boundaries, empty states polish
