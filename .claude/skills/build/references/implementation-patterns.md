# Implementation Patterns for Common Feature Types

## CRUD API Endpoint

### Pattern: REST resource with full CRUD
```
Files to create:
  src/types/resource.ts              — TypeScript interfaces
  src/lib/db/queries/resources.ts    — Database query functions
  src/app/api/resources/route.ts     — GET (list) + POST (create)
  src/app/api/resources/[id]/route.ts — GET (detail) + PATCH (update) + DELETE
```

### Implementation order:
1. Define types: `Resource`, `CreateResourceInput`, `UpdateResourceInput`
2. Write query functions: `listResources`, `getResourceById`, `createResource`, `updateResource`, `deleteResource`
3. Write route handlers: parse request → validate → call query → format response
4. Add auth guards where needed

### Standard patterns:
- **List**: pagination, optional search/filter, sorted by recent
- **Create**: validate input, check for duplicates, return 201 with created resource
- **Update**: verify ownership, validate partial input, return updated resource
- **Delete**: verify ownership, soft-delete (set `is_published = false`) or hard-delete, return 204

---

## Form with Validation

### Pattern: Multi-step validated form
```
Files to create:
  src/components/feature/feature-form.tsx  — Client component with form logic
  src/lib/validation/feature-schema.ts     — Zod schema (shared with API)
  src/app/api/feature/route.ts             — API endpoint
  src/app/feature/page.tsx                 — Server component page wrapper
```

### Implementation order:
1. Define Zod schema (shared between client and server)
2. Build API route that validates with the schema
3. Build form component with client-side validation
4. Wire form to API with loading/error/success states

### Standard patterns:
- **Client validation**: run Zod schema on submit before API call
- **Server validation**: always re-validate (client can be bypassed)
- **Error display**: inline errors per field using `zodResolver`
- **Submit state**: disable button, show spinner, prevent double-submit
- **Success**: redirect or show confirmation, clear form

---

## List with Filtering and Pagination

### Pattern: Filterable, paginated list page
```
Files to create:
  src/app/explore/page.tsx             — Server component with initial data
  src/components/search/search-bar.tsx  — Client component for search input
  src/components/search/filter-sidebar.tsx — Client component for filters
  src/components/search/pagination.tsx  — Pagination controls
  src/hooks/use-search.ts              — Client-side search state management
  src/app/api/resources/route.ts       — API with search/filter/pagination params
```

### Implementation order:
1. API endpoint with query params: `q`, `category`, `sort`, `page`, `pageSize`
2. Database query with full-text search, WHERE filters, ORDER BY, LIMIT/OFFSET
3. Server component page with initial data fetch
4. Client components for search input (with debounce), filter checkboxes, pagination
5. URL state sync: reflect filters in URL params for shareable links

### Standard patterns:
- **Debounced search**: 300ms delay before API call
- **URL sync**: `useSearchParams` to read/write, `router.push` with new params
- **Pagination**: show current page, total pages, prev/next buttons
- **Loading**: skeleton grid during search, not full page reload
- **Empty**: different messages for "no results for search" vs "no items exist"

---

## File Upload

### Pattern: Validated file upload with progress
```
Files to create:
  src/components/upload/upload-zone.tsx    — Drag-and-drop upload component
  src/lib/validation/archive.ts            — File validation logic
  src/lib/s3/upload.ts                     — S3 upload function
  src/app/api/upload/route.ts              — Multipart form handler
```

### Implementation order:
1. File validation: type, size, structure
2. S3 upload utility with streaming
3. API route: receive multipart form, validate, upload to S3, save metadata to DB
4. Upload UI: drag-and-drop zone, progress bar, validation feedback

### Standard patterns:
- **Client validation**: check file type and size before upload (fast feedback)
- **Server validation**: re-validate everything (never trust client)
- **Multipart handling**: use `request.formData()` in Next.js API routes
- **S3 upload**: generate unique key, use `PutObjectCommand` with content type
- **Progress**: use `XMLHttpRequest` or streaming for progress events
- **Error recovery**: show specific error ("File too large", "Invalid format"), allow retry

---

## Authentication-Gated Feature

### Pattern: Feature requiring auth with role check
```
Files to modify/create:
  src/lib/auth/guards.ts              — Add new guard if needed
  src/app/api/feature/route.ts        — Protected API endpoint
  src/app/feature/page.tsx            — Auth-gated page
  src/components/auth/auth-guard.tsx   — Client-side auth wrapper (redirect)
```

### Implementation order:
1. Server-side auth check in page/route (primary security)
2. API route: verify JWT, extract userId, check authorization
3. Client-side: redirect to sign-in if not authenticated
4. UI: show different states for authed vs unauthed users

### Standard patterns:
- **Server page**: check auth token in cookies, redirect to `/auth/signin?callbackUrl=/feature` if missing
- **API route**: call `requireAuth()` at the top, returns `userId` or 401
- **Ownership check**: `requireOwner(extensionSlug)` for publisher-only actions, returns 403 if not owner
- **Client guard**: `useEffect` to redirect on auth state change
- **Graceful fallback**: show "Sign in to access" instead of 403 error page
