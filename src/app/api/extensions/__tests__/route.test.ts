import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockVersionCreate = vi.fn();

// Mock Prisma
vi.mock('@/lib/db/client', () => ({
  prisma: {
    extension: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
    },
    extensionVersion: {
      create: mockVersionCreate,
    },
  },
}));

// Mock S3
vi.mock('@/lib/s3', () => ({
  uploadPackage: vi.fn().mockResolvedValue('packages/test/1.0.0.tar.gz'),
}));

// Mock validation
vi.mock('@lootprotocol/validation', () => ({
  validateExtension: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    metadata: { name: 'test-ext', version: '1.0.0', description: 'A test extension' },
  }),
}));

// Mock auth
vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'user-1',
    cognitoSub: 'sub-1',
    username: 'testuser',
    authProvider: 'github',
    role: 'publisher',
  }),
  requirePublisher: vi.fn().mockResolvedValue({
    id: 'user-1',
    cognitoSub: 'sub-1',
    username: 'testuser',
    authProvider: 'github',
    role: 'publisher',
  }),
  handleAuthError: vi.fn().mockImplementation((error: unknown) => {
    return new Response(JSON.stringify({ error: { code: 'AUTH_ERROR', message: String(error) } }), {
      status: 401,
    });
  }),
}));

describe('GET /api/extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated extensions', async () => {
    const mockExtensions = [
      {
        id: 'ext-1',
        slug: 'test-ext',
        name: 'test-ext',
        displayName: 'Test Extension',
        description: 'A test extension',
        extensionType: 'skill',
        category: 'coding',
        tags: ['test'],
        latestVersion: '1.0.0',
        readmeHtml: null,
        readmeText: null,
        downloadCount: 100,
        publisherId: 'user-1',
        isPublished: true,
        isFeatured: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        publisher: {
          id: 'user-1',
          cognitoSub: 'sub-1',
          username: 'testuser',
          email: null,
          authProvider: 'github',
          githubUsername: 'testuser',
          githubId: BigInt(12345),
          googleId: null,
          displayName: 'Test User',
          avatarUrl: null,
          bio: null,
          websiteUrl: null,
          role: 'publisher',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      },
    ];

    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue(mockExtensions);

    const { GET } = await import('@/app/api/extensions/route');

    const request = new Request('http://localhost:3000/api/extensions?page=1&limit=20');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].slug).toBe('test-ext');
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('passes search query to filter', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/extensions/route');

    const request = new Request('http://localhost:3000/api/extensions?q=testing&category=coding');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          category: 'coding',
        }),
      }),
    );
  });
});

describe('GET /api/extensions (empty)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty data when no extensions exist', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/extensions/route');

    const request = new Request('http://localhost:3000/api/extensions');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });
});
