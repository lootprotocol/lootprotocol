import type { AuthUser } from '@lootprotocol/shared-types';

const MOCK_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  cognitoSub: 'mock-sub-123',
  username: 'test-publisher',
  authProvider: 'github',
  role: 'publisher',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireAuth(_req: Request): Promise<AuthUser> {
  return MOCK_USER;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requirePublisher(_req: Request, _slug: string): Promise<AuthUser> {
  return MOCK_USER;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireDownloadAuth(_req: Request): Promise<AuthUser> {
  return MOCK_USER;
}
