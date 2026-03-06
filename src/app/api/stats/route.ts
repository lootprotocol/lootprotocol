import { NextResponse } from 'next/server';
import { countExtensions, countPublishers } from '@/lib/db/queries/extensions';
import { countDownloads } from '@/lib/db/queries/downloads';

export async function GET() {
  const [totalExtensions, totalDownloads, totalPublishers] = await Promise.all([
    countExtensions(),
    countDownloads(),
    countPublishers(),
  ]);
  return NextResponse.json({ totalExtensions, totalDownloads, totalPublishers });
}
