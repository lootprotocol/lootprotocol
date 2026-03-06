import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db/client', () => ({
  prisma: {
    extension: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

function makePrismaExtension(overrides = {}) {
  return {
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
    downloadCount: 42,
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
    ...overrides,
  };
}

describe('listExtensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated results with default sort', async () => {
    const ext = makePrismaExtension();
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([ext]);

    const { listExtensions } = await import('@/lib/db/queries/extensions');
    const result = await listExtensions({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe('test-ext');
    expect(result.data[0].downloadCount).toBe(42);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('applies search filter', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const { listExtensions } = await import('@/lib/db/queries/extensions');
    await listExtensions({ q: 'search-term', page: 1, limit: 20 });

    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: 'search-term', mode: 'insensitive' } }),
          ]),
        }),
      }),
    );
  });

  it('applies category filter', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const { listExtensions } = await import('@/lib/db/queries/extensions');
    await listExtensions({ category: 'coding', page: 1, limit: 20 });

    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'coding',
        }),
      }),
    );
  });

  it('sorts by downloads', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const { listExtensions } = await import('@/lib/db/queries/extensions');
    await listExtensions({ sort: 'downloads', page: 1, limit: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ downloadCount: 'desc' }],
      }),
    );
  });

  it('clamps page to valid range', async () => {
    mockCount.mockResolvedValue(5);
    mockFindMany.mockResolvedValue([]);

    const { listExtensions } = await import('@/lib/db/queries/extensions');
    const result = await listExtensions({ page: 999, limit: 20 });

    expect(result.pagination.page).toBe(1);
  });
});

describe('getExtensionBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns extension when found and published', async () => {
    const ext = makePrismaExtension();
    mockFindUnique.mockResolvedValue(ext);

    const { getExtensionBySlug } = await import('@/lib/db/queries/extensions');
    const result = await getExtensionBySlug('test-ext');

    expect(result).not.toBeNull();
    expect(result!.slug).toBe('test-ext');
    expect(result!.publisher?.username).toBe('testuser');
  });

  it('returns null when extension is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const { getExtensionBySlug } = await import('@/lib/db/queries/extensions');
    const result = await getExtensionBySlug('nonexistent');

    expect(result).toBeNull();
  });

  it('returns null when extension is unpublished', async () => {
    const ext = makePrismaExtension({ isPublished: false });
    mockFindUnique.mockResolvedValue(ext);

    const { getExtensionBySlug } = await import('@/lib/db/queries/extensions');
    const result = await getExtensionBySlug('test-ext');

    expect(result).toBeNull();
  });
});

describe('searchExtensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches across name, displayName, description, and tags', async () => {
    mockFindMany.mockResolvedValue([]);

    const { searchExtensions } = await import('@/lib/db/queries/extensions');
    await searchExtensions('database');

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          OR: expect.arrayContaining([
            { name: { contains: 'database', mode: 'insensitive' } },
            { tags: { has: 'database' } },
          ]),
        }),
      }),
    );
  });
});

describe('createExtension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an extension and returns mapped result', async () => {
    const ext = makePrismaExtension({ slug: 'new-ext', name: 'new-ext' });
    mockCreate.mockResolvedValue(ext);

    const { createExtension } = await import('@/lib/db/queries/extensions');
    const result = await createExtension({
      slug: 'new-ext',
      name: 'new-ext',
      description: 'A new extension',
      extensionType: 'skill' as const,
      category: 'coding',
      latestVersion: '1.0.0',
      publisherId: 'user-1',
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.slug).toBe('new-ext');
  });
});

describe('deleteExtension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes by setting isPublished to false', async () => {
    mockUpdate.mockResolvedValue({});

    const { deleteExtension } = await import('@/lib/db/queries/extensions');
    await deleteExtension('test-ext');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { slug: 'test-ext' },
      data: { isPublished: false },
    });
  });
});
