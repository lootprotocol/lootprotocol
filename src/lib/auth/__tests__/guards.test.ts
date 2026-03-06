import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyToken = vi.fn();
const mockExtensionFindUnique = vi.fn();
const mockProfileFindUnique = vi.fn();

// Mock verify
vi.mock('@/lib/auth/verify', () => ({
  verifyToken: mockVerifyToken,
}));

// Mock prisma
vi.mock('@/lib/db/client', () => ({
  prisma: {
    extension: {
      findUnique: mockExtensionFindUnique,
    },
    profile: {
      findUnique: mockProfileFindUnique,
    },
  },
}));

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when no token is provided', async () => {
    const { requireAuth } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test');
    await expect(requireAuth(request)).rejects.toThrow('Authentication required');
  });

  it('returns user with resolved profile ID when valid Bearer token is provided', async () => {
    const mockUser = {
      id: 'cognito-sub-1',
      cognitoSub: 'sub-1',
      username: 'testuser',
      authProvider: 'github' as const,
      role: 'publisher' as const,
    };
    mockVerifyToken.mockResolvedValue(mockUser);
    mockProfileFindUnique.mockResolvedValue({ id: 'profile-db-id', role: 'publisher' });

    const { requireAuth } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const user = await requireAuth(request);

    expect(user.id).toBe('profile-db-id');
    expect(user.role).toBe('publisher');
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockProfileFindUnique).toHaveBeenCalledWith({
      where: { cognitoSub: 'sub-1' },
      select: { id: true, role: true },
    });
  });

  it('throws when profile is not found in database', async () => {
    const mockUser = {
      id: 'cognito-sub-1',
      cognitoSub: 'sub-1',
      username: 'testuser',
      authProvider: 'github' as const,
      role: 'user' as const,
    };
    mockVerifyToken.mockResolvedValue(mockUser);
    mockProfileFindUnique.mockResolvedValue(null);

    const { requireAuth } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    await expect(requireAuth(request)).rejects.toThrow('Profile not found');
  });

  it('throws when token verification fails', async () => {
    mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

    const { requireAuth } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer bad-token' },
    });
    await expect(requireAuth(request)).rejects.toThrow('Invalid or expired token');
  });
});

describe('requirePublisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when user is not a publisher', async () => {
    const mockUser = {
      id: 'cognito-sub-1',
      cognitoSub: 'sub-1',
      username: 'testuser',
      authProvider: 'github' as const,
      role: 'user' as const,
    };
    mockVerifyToken.mockResolvedValue(mockUser);
    mockProfileFindUnique.mockResolvedValue({ id: 'user-1', role: 'user' });

    const { requirePublisher } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    await expect(requirePublisher(request)).rejects.toThrow('Publisher access required');
  });

  it('throws when publisher does not own the extension', async () => {
    const mockUser = {
      id: 'cognito-sub-1',
      cognitoSub: 'sub-1',
      username: 'testuser',
      authProvider: 'github' as const,
      role: 'publisher' as const,
    };
    mockVerifyToken.mockResolvedValue(mockUser);
    mockProfileFindUnique.mockResolvedValue({ id: 'user-1', role: 'publisher' });
    mockExtensionFindUnique.mockResolvedValue({ publisherId: 'other-user' });

    const { requirePublisher } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    await expect(requirePublisher(request, 'some-extension')).rejects.toThrow(
      'You do not own this extension',
    );
  });

  it('returns user when publisher owns the extension', async () => {
    const mockUser = {
      id: 'cognito-sub-1',
      cognitoSub: 'sub-1',
      username: 'testuser',
      authProvider: 'github' as const,
      role: 'publisher' as const,
    };
    mockVerifyToken.mockResolvedValue(mockUser);
    mockProfileFindUnique.mockResolvedValue({ id: 'user-1', role: 'publisher' });
    mockExtensionFindUnique.mockResolvedValue({ publisherId: 'user-1' });

    const { requirePublisher } = await import('@/lib/auth/guards');

    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const user = await requirePublisher(request, 'some-extension');
    expect(user.id).toBe('user-1');
  });
});

describe('handleAuthError', () => {
  it('returns 401 for AuthError', async () => {
    const { AuthError, handleAuthError } = await import('@/lib/auth/guards');

    const error = new AuthError('Not authenticated', 401);
    const response = handleAuthError(error);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_ERROR');
  });

  it('returns 500 for unknown errors', async () => {
    const { handleAuthError } = await import('@/lib/auth/guards');

    const response = handleAuthError(new Error('Something broke'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
