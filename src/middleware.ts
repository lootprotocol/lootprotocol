import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function requiresAuth(pathname: string): boolean {
  if (pathname.startsWith('/api/users/')) return true;
  if (pathname === '/api/validate') return true;
  if (/^\/api\/extensions\/[^/]+\/download$/.test(pathname)) return true;
  return false;
}

function getRateLimitConfig(pathname: string) {
  if (pathname.startsWith('/auth/')) return RATE_LIMITS.auth;
  if (pathname === '/api/validate') return RATE_LIMITS.upload;
  if (/\/versions$/.test(pathname) && pathname.startsWith('/api/')) return RATE_LIMITS.upload;
  return RATE_LIMITS.public;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting for API routes ---
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limitConfig = getRateLimitConfig(pathname);
    const result = rateLimit(`${ip}:${pathname}`, limitConfig);

    if (!result.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    // Only enforce auth for specific API routes
    if (requiresAuth(pathname)) {
      const token =
        request.cookies.get('lootprotocol_access_token')?.value ??
        request.headers.get('Authorization')?.replace('Bearer ', '') ??
        null;

      if (!token) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 },
        );
      }

      try {
        const { verifyToken } = await import('@/lib/auth/verify');
        const user = await verifyToken(token);

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-sub', user.cognitoSub);
        requestHeaders.set('x-user-username', user.username);
        requestHeaders.set('x-user-auth-provider', user.authProvider);
        requestHeaders.set('x-user-role', user.role);

        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      } catch {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
          { status: 401 },
        );
      }
    }

    // Public API routes — pass through after rate limiting
    return NextResponse.next();
  }

  // --- Page routes (dashboard, publish) — require auth ---
  const token =
    request.cookies.get('lootprotocol_access_token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '') ??
    null;

  if (!token) {
    const signInUrl = new URL('/', request.url);
    signInUrl.searchParams.set('sign-in', 'true');
    signInUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const { verifyToken } = await import('@/lib/auth/verify');
    await verifyToken(token);
    return NextResponse.next();
  } catch {
    const signInUrl = new URL('/', request.url);
    signInUrl.searchParams.set('sign-in', 'true');
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set('lootprotocol_access_token', '', { maxAge: 0, path: '/' });
    return response;
  }
}
