import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/client';
import { mapProfile } from '@/lib/db/mappers';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const profile = await prisma.profile.findUnique({
      where: { cognitoSub: user.cognitoSub },
    });

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Profile not found' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: mapProfile(profile) });
  } catch (error) {
    return handleAuthError(error);
  }
}
