# Input Validation Patterns with Zod

## Core Principle

Validate at system boundaries: API route handlers, CLI argument parsing, file upload processing. Trust internal code — do not re-validate within business logic functions.

## Common Schemas

### String Validation
```typescript
import { z } from 'zod';

// Slug: URL-safe identifier
const slugSchema = z.string()
  .min(1).max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be lowercase with hyphens');

// Name: kebab-case identifier
const nameSchema = z.string()
  .min(1).max(64)
  .regex(/^[a-z][a-z0-9-]*$/, 'Must start with letter, lowercase, hyphens only');

// Semver version
const versionSchema = z.string()
  .regex(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/, 'Must be valid semver (e.g., 1.0.0)');

// Safe text (no HTML/script injection)
const safeTextSchema = z.string()
  .max(5000)
  .transform(s => s.trim());

// Email
const emailSchema = z.string().email().max(254);

// URL
const urlSchema = z.string().url().max(2048);
```

### Pagination
```typescript
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

### Search / Filter
```typescript
const searchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  type: z.enum(['skill', 'mcp_server', 'plugin']).optional(),
  sort: z.enum(['popular', 'recent', 'name']).default('popular'),
  ...paginationSchema.shape,
});
```

### Extension Creation
```typescript
const createExtensionSchema = z.object({
  name: nameSchema,
  displayName: z.string().min(1).max(128),
  description: safeTextSchema.pipe(z.string().min(10).max(500)),
  extensionType: z.enum(['skill', 'mcp_server', 'plugin']),
  category: z.string().min(1).max(50),
  tags: z.array(z.string().max(30)).max(5).default([]),
});
```

### Extension Update
```typescript
const updateExtensionSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  description: safeTextSchema.pipe(z.string().min(10).max(500)).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
  isPublished: z.boolean().optional(),
});
```

## Usage in API Route Handlers

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  // 2. Validate with Zod
  const result = createExtensionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // 3. Use validated data (fully typed)
  const data = result.data;
  // data.name, data.extensionType, etc. are all typed correctly
}
```

## URL Parameter Validation

```typescript
// For route params like /extensions/[slug]
const slugParam = slugSchema.safeParse(params.slug);
if (!slugParam.success) {
  return NextResponse.json(
    { error: { code: 'INVALID_SLUG', message: 'Invalid extension identifier' } },
    { status: 400 }
  );
}
```

## Search Parameter Validation

```typescript
// For query params like ?page=2&q=search
const searchParams = Object.fromEntries(request.nextUrl.searchParams);
const result = searchSchema.safeParse(searchParams);
if (!result.success) {
  // For search, use defaults instead of rejecting
  const defaults = { page: 1, pageSize: 20, sort: 'popular' as const };
  // proceed with defaults
}
```

## File Upload Validation

```typescript
const MAX_SKILL_SIZE = 5 * 1024 * 1024;       // 5MB
const MAX_MCP_SIZE = 50 * 1024 * 1024;        // 50MB
const MAX_PLUGIN_SIZE = 100 * 1024 * 1024;    // 100MB
const ALLOWED_TYPES = ['application/zip', 'application/gzip', 'application/x-tar'];

function validateUpload(file: File, extensionType: string) {
  const maxSize = {
    skill: MAX_SKILL_SIZE,
    mcp_server: MAX_MCP_SIZE,
    plugin: MAX_PLUGIN_SIZE,
  }[extensionType];

  if (!maxSize) return { valid: false, error: 'Unknown extension type' };
  if (file.size > maxSize) return { valid: false, error: `File exceeds ${maxSize / 1024 / 1024}MB limit` };
  if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: 'Must be .zip or .tar.gz' };

  return { valid: true };
}
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Correct Approach |
|-------------|---------|-----------------|
| Validating in component state | Bypassed by API calls | Validate in API route handler |
| `parseInt(input)` without checking NaN | NaN propagates silently | Use `z.coerce.number()` or check `Number.isNaN()` |
| Trusting `Content-Type` header | Can be spoofed | Validate actual content, not just header |
| `regex` without anchors | Partial matches pass | Use `^...$` or Zod's built-in validators |
| Allowing unbounded arrays | Memory exhaustion | Always set `.max()` on arrays |
| Allowing unbounded strings | Memory/storage abuse | Always set `.max()` on strings |
