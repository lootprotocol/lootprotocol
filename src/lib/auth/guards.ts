import { NextResponse } from 'next/server';
import type { AuthUser } from './types';
import { getToken } from './session';
import { verifyToken } from './verify';
import { prisma } from '@/lib/db/client';

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const token = getToken(request);
  if (!token) {
    throw new AuthError('Authentication required', 401);
  }

  let user: AuthUser;
  try {
    user = await verifyToken(token);
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }

  // Resolve actual profile ID from the database.
  // The JWT `sub` (Cognito sub) differs from the profile's DB-generated UUID,
  // so we must look up the profile to get the correct ID for FK references.
  const profile = await prisma.profile.findUnique({
    where: { cognitoSub: user.cognitoSub },
    select: { id: true, role: true },
  });

  if (!profile) {
    throw new AuthError('Profile not found. Please sign in again.', 401);
  }

  user.id = profile.id;
  user.role = profile.role as 'user' | 'publisher';

  return user;
}

export async function requirePublisher(
  request: Request,
  extensionSlug?: string,
): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (user.role !== 'publisher') {
    throw new AuthError('Publisher access required', 403);
  }

  if (extensionSlug) {
    const extension = await prisma.extension.findUnique({
      where: { slug: extensionSlug },
      select: { publisherId: true },
    });

    if (!extension || extension.publisherId !== user.id) {
      throw new AuthError('You do not own this extension', 403);
    }
  }

  return user;
}

export async function requireDownloadAuth(request: Request): Promise<AuthUser> {
  return requireAuth(request);
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: error.message } },
      { status: error.statusCode },
    );
  }
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    { status: 500 },
  );
}
