# Mock Recipes

Copy-paste mock setups for common dependencies.

## fetch / Network Requests

### Global fetch mock (Vitest)
```typescript
// Setup
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock successful JSON response
mockFetch.mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data: { id: '123', name: 'test' } }),
});

// Mock error response
mockFetch.mockResolvedValue({
  ok: false,
  status: 404,
  json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
});

// Mock network error
mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

// Cleanup
afterEach(() => {
  mockFetch.mockReset();
});
```

### MSW (Mock Service Worker) — recommended for integration tests
```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/extensions', () => {
    return HttpResponse.json({
      data: [
        { slug: 'skill-1', name: 'Skill One', downloadCount: 42 },
        { slug: 'skill-2', name: 'Skill Two', downloadCount: 10 },
      ],
      meta: { total: 2, page: 1, pageSize: 20 },
    });
  }),

  http.post('/api/extensions/:slug/download', ({ params }) => {
    return HttpResponse.json({
      data: { url: `https://s3.example.com/${params.slug}/1.0.0.tar.gz` },
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Override for specific test
it('handles server errors', async () => {
  server.use(
    http.get('/api/extensions', () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );
  // ... test error handling
});
```

## PostgreSQL (pg Pool)

### Mock pool
```typescript
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});

const mockPool = {
  query: mockQuery,
  connect: mockConnect,
  end: vi.fn(),
} as unknown as Pool;

// Mock successful query
mockQuery.mockResolvedValue({
  rows: [{ id: '123', slug: 'test', name: 'Test' }],
  rowCount: 1,
});

// Mock empty result
mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

// Mock query error
mockQuery.mockRejectedValue(new Error('connection refused'));

// Verify query was called with correct SQL
expect(mockQuery).toHaveBeenCalledWith(
  expect.stringContaining('SELECT'),
  ['test-slug']
);
```

## Next.js Router

### App Router navigation
```typescript
// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams('q=test&page=1'),
  useParams: () => ({ slug: 'my-extension' }),
}));
```

### NextRequest for API route tests
```typescript
function createNextRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options ?? {};

  const urlObj = new URL(url, 'http://localhost');
  Object.entries(searchParams).forEach(([k, v]) => urlObj.searchParams.set(k, v));

  return new NextRequest(urlObj, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
```

## AWS S3 Client

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

// Mock successful upload
s3Mock.on(PutObjectCommand).resolves({
  ETag: '"abc123"',
});

// Mock successful download
s3Mock.on(GetObjectCommand).resolves({
  Body: sdkStreamMixin(Readable.from([Buffer.from('file contents')])),
  ContentLength: 13,
});

// Mock S3 error
s3Mock.on(GetObjectCommand).rejects(
  new Error('The specified key does not exist.')
);
```

## AWS Cognito / JWT

```typescript
// Mock JWT verification
vi.mock('@/lib/auth/cognito', () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from '@/lib/auth/cognito';
const mockVerifyToken = vi.mocked(verifyToken);

// Valid user
mockVerifyToken.mockResolvedValue({
  sub: 'cognito-user-123',
  email: 'user@example.com',
  'cognito:username': 'github_user',
});

// Invalid/expired token
mockVerifyToken.mockRejectedValue(new Error('Token expired'));
```

## Date/Time

```typescript
// Fixed date for deterministic tests
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

it('sets created_at to current time', async () => {
  const result = await createExtension(pool, data);
  expect(result.createdAt).toEqual(new Date('2026-01-15T10:00:00Z'));
});
```

## Environment Variables

```typescript
// Save and restore env
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.LOOTPROTOCOL_S3_BUCKET = 'test-bucket';
  process.env.LOOTPROTOCOL_COGNITO_USER_POOL_ID = 'us-east-1_test';
});

afterEach(() => {
  process.env = originalEnv;
});
```

## File System (for validation tests)

```typescript
import { vol } from 'memfs';

vi.mock('fs', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return memfs.fs.promises;
});

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    '/tmp/skill/SKILL.md': '---\ndescription: test\n---\n# My Skill\nInstructions here',
    '/tmp/skill/reference.md': '# Reference docs',
  });
});
```
