import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing authorization code' } },
        { status: 400 },
      );
    }

    const isMock = process.env.AUTH_MOCK === 'true';

    if (isMock) {
      const { mockExchangeCode } = await import('@/lib/auth/mock');
      const result = await mockExchangeCode(code);
      return NextResponse.json({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        user: result.user,
      });
    }

    const { exchangeCognitoCode } = await import('@/lib/auth/cognito');
    const { verifyToken } = await import('@/lib/auth/verify');

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const callbackUri = redirect_uri ?? `${APP_URL}/auth/callback`;
    const tokens = await exchangeCognitoCode(code, callbackUri);

    const user = await verifyToken(tokens.access_token);

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      user,
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return NextResponse.json(
      { error: { code: 'TOKEN_EXCHANGE_FAILED', message: 'Failed to exchange authorization code' } },
      { status: 500 },
    );
  }
}
