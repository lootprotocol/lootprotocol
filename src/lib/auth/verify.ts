import type { AuthUser } from './types';

const isMockAuth = () => process.env.AUTH_MOCK === 'true';

export async function verifyToken(token: string): Promise<AuthUser> {
  if (isMockAuth()) {
    const { verifyMockToken } = await import('./mock');
    return verifyMockToken(token);
  }

  const { verifyCognitoToken } = await import('./cognito');
  return verifyCognitoToken(token);
}
