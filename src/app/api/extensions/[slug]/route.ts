import { NextResponse } from 'next/server';
import { getExtensionBySlug, updateExtension, deleteExtension } from '@/lib/db/queries/extensions';
import { getVersions } from '@/lib/db/queries/versions';
import { requirePublisher, handleAuthError } from '@/lib/auth/guards';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const extension = await getExtensionBySlug(slug);
  if (!extension) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Extension not found' } }, { status: 404 });
  }
  const versions = await getVersions(extension.id);
  return NextResponse.json({ data: { ...extension, versions } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await requirePublisher(request, slug);
    const body = await request.json();
    const updated = await updateExtension(slug, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await requirePublisher(request, slug);
    await deleteExtension(slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
