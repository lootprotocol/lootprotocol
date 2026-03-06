import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthUser, AuthProvider } from './types';
import type { CognitoClaims } from './types';

const COGNITO_ISSUER = process.env.COGNITO_ISSUER!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${COGNITO_ISSUER}/.well-known/jwks.json`));
  }
  return jwks;
}

function resolveAuthProvider(claims: CognitoClaims): AuthProvider {
  if (claims['custom:auth_provider'] === 'google') return 'google';
  if (claims['custom:auth_provider'] === 'github') return 'github';

  if (claims.identities) {
    try {
      const identities = JSON.parse(claims.identities);
      if (Array.isArray(identities) && identities.length > 0) {
        const providerName = identities[0].providerName?.toLowerCase();
        if (providerName === 'google') return 'google';
      }
    } catch { /* ignore parse errors */ }
  }

  if (claims['custom:github_username']) return 'github';

  return 'github';
}

export async function verifyCognitoToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer: COGNITO_ISSUER,
  });

  // Cognito access tokens use "client_id" instead of "aud"
  const clientId = payload.client_id ?? payload.aud;
  if (clientId !== COGNITO_CLIENT_ID) {
    throw new Error('Token client_id mismatch');
  }

  const claims = payload as unknown as CognitoClaims;
  const authProvider = resolveAuthProvider(claims);

  const username = claims['custom:username']
    ?? claims['custom:github_username']
    ?? claims.email?.split('@')[0]
    ?? claims.sub;

  return {
    id: claims['custom:profile_id'] ?? claims.sub,
    cognitoSub: claims.sub,
    username,
    authProvider,
    role: (claims['custom:role'] as 'user' | 'publisher') ?? 'user',
  };
}

export async function exchangeCognitoCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string; id_token?: string; expires_in: number }> {
  const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN!;
  const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET!;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: COGNITO_CLIENT_ID,
  });

  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`)}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cognito token exchange failed: ${error}`);
  }

  return response.json();
}

export function getCognitoLoginUrl(provider: 'GitHub' | 'Google' = 'GitHub', state?: string): string {
  const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN!;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: `${APP_URL}/auth/callback`,
    identity_provider: provider,
  });

  if (state) {
    params.set('state', state);
  }

  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}
