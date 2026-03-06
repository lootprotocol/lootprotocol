import { NextResponse } from 'next/server';
import { getExtensionBySlug } from '@/lib/db/queries/extensions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const extension = await getExtensionBySlug(slug);
  if (!extension) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Extension not found' } }, { status: 404 });
  }
  return NextResponse.json({ html: extension.readmeHtml || '' });
}
