import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setAuthCookies } from '@/lib/auth/session';
import type { AuthProvider } from '@lootprotocol/shared-types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const provider = (searchParams.get('provider') ?? 'github') as AuthProvider;

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error) {
    const errorUrl = new URL('/', APP_URL);
    errorUrl.searchParams.set('auth-error', error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/', APP_URL));
  }

  try {
    const isMock = process.env.AUTH_MOCK === 'true';
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number;

    if (isMock) {
      const { mockExchangeCode } = await import('@/lib/auth/mock');
      const result = await mockExchangeCode(code, provider);
      accessToken = result.id_token ?? result.access_token;
      refreshToken = result.refresh_token;
      expiresIn = result.expires_in;
    } else {
      const { exchangeCognitoCode } = await import('@/lib/auth/cognito');
      const redirectUri = `${APP_URL}/auth/callback`;
      const result = await exchangeCognitoCode(code, redirectUri);
      accessToken = result.id_token ?? result.access_token;
      refreshToken = result.refresh_token;
      expiresIn = result.expires_in;
    }

    // Upsert profile in database for first-time sign-ins
    try {
      const { verifyToken } = await import('@/lib/auth/verify');
      const authUser = await verifyToken(accessToken);

      const { prisma } = await import('@/lib/db/client');
      const existingProfile = await prisma.profile.findUnique({
        where: { cognitoSub: authUser.cognitoSub },
      });

      if (!existingProfile) {
        let username = authUser.username;

        // Handle username collisions by appending random suffix
        const existing = await prisma.profile.findUnique({ where: { username } });
        if (existing) {
          username = `${username}-${Math.random().toString(36).slice(2, 7)}`;
        }

        await prisma.profile.create({
          data: {
            cognitoSub: authUser.cognitoSub,
            username,
            authProvider: authUser.authProvider,
            githubUsername: authUser.authProvider === 'github' ? authUser.username : null,
            githubId: authUser.authProvider === 'github' ? BigInt(0) : null,
            googleId: authUser.authProvider === 'google' ? authUser.cognitoSub : null,
            displayName: authUser.username,
            avatarUrl: authUser.authProvider === 'github'
              ? `https://github.com/${authUser.username}.png`
              : null,
          },
        });
      }
    } catch (upsertErr) {
      // Non-fatal: profile may already exist or DB may be unavailable
      console.error('Profile upsert error (non-fatal):', upsertErr);
    }

    // Determine redirect target
    let redirectTo = '/dashboard';
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.returnTo) redirectTo = stateData.returnTo;
      } catch {
        // State wasn't JSON — that's fine, use default
      }
    }

    const response = NextResponse.redirect(new URL(redirectTo, APP_URL));
    setAuthCookies(response, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    });

    return response;
  } catch (err) {
    console.error('Auth callback error:', err);
    const errorUrl = new URL('/', APP_URL);
    errorUrl.searchParams.set('auth-error', 'callback_failed');
    return NextResponse.redirect(errorUrl);
  }
}
