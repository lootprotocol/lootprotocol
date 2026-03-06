import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { mapProfile, mapExtension } from '@/lib/db/mappers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const profile = await prisma.profile.findUnique({
    where: { username: username },
  });

  if (!profile) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Publisher not found' } },
      { status: 404 },
    );
  }

  const extensions = await prisma.extension.findMany({
    where: { publisherId: profile.id, isPublished: true },
    include: { publisher: true },
    orderBy: { downloadCount: 'desc' },
  });

  return NextResponse.json({
    data: {
      profile: mapProfile(profile),
      extensions: extensions.map(mapExtension),
    },
  });
}
