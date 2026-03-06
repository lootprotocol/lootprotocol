import * as jose from 'jose';
import type { AuthUser, AuthProvider } from './types';
import { DEFAULT_MOCK_USER, MOCK_GOOGLE_USER, upsertMockProfile } from './mock-db';
import type { Profile } from '@lootprotocol/shared-types';

let keyPair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;

async function getKeyPair() {
  if (!keyPair) {
    keyPair = await jose.generateKeyPair('RS256');
  }
  return keyPair;
}

export async function createMockToken(user?: Partial<AuthUser>): Promise<string> {
  const { privateKey } = await getKeyPair();
  const mockUser: AuthUser = {
    id: user?.id ?? DEFAULT_MOCK_USER.id,
    cognitoSub: user?.cognitoSub ?? DEFAULT_MOCK_USER.cognitoSub,
    username: user?.username ?? DEFAULT_MOCK_USER.username,
    authProvider: user?.authProvider ?? (DEFAULT_MOCK_USER.authProvider as AuthProvider),
    role: user?.role ?? DEFAULT_MOCK_USER.role,
  };

  return new jose.SignJWT({
    sub: mockUser.cognitoSub,
    'custom:profile_id': mockUser.id,
    'custom:username': mockUser.username,
    'custom:auth_provider': mockUser.authProvider,
    'custom:github_username': mockUser.authProvider === 'github' ? mockUser.username : undefined,
    'custom:role': mockUser.role,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setIssuer('mock-cognito')
    .sign(privateKey);
}

export async function verifyMockToken(token: string): Promise<AuthUser> {
  const { publicKey } = await getKeyPair();
  const { payload } = await jose.jwtVerify(token, publicKey, {
    issuer: 'mock-cognito',
  });

  return {
    id: (payload['custom:profile_id'] as string) ?? payload.sub!,
    cognitoSub: payload.sub!,
    username: (payload['custom:username'] as string)
      ?? (payload['custom:github_username'] as string)
      ?? '',
    authProvider: ((payload['custom:auth_provider'] as string) ?? 'github') as AuthProvider,
    role: ((payload['custom:role'] as string) ?? 'user') as 'user' | 'publisher',
  };
}

export async function mockExchangeCode(
  _code: string,
  provider: AuthProvider = 'github',
): Promise<{ access_token: string; id_token: string; refresh_token: string; expires_in: number; user: Profile }> {
  const mockUser = provider === 'google' ? MOCK_GOOGLE_USER : DEFAULT_MOCK_USER;
  const token = await createMockToken({
    id: mockUser.id,
    cognitoSub: mockUser.cognitoSub,
    username: mockUser.username,
    authProvider: provider,
    role: mockUser.role,
  });
  return {
    access_token: token,
    id_token: token,
    refresh_token: 'mock-refresh-token',
    expires_in: 86400,
    user: mockUser,
  };
}

export async function mockLogin(provider: AuthProvider = 'github'): Promise<{
  token: string;
  user: Profile;
}> {
  const mockUser = provider === 'google' ? MOCK_GOOGLE_USER : DEFAULT_MOCK_USER;
  const token = await createMockToken({
    id: mockUser.id,
    cognitoSub: mockUser.cognitoSub,
    username: mockUser.username,
    authProvider: provider,
    role: mockUser.role,
  });
  return { token, user: mockUser };
}

export { upsertMockProfile };
