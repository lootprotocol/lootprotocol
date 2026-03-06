import { NextResponse } from 'next/server';
import { getExtensionBySlug, updateExtension } from '@/lib/db/queries/extensions';
import { getVersions, createVersion } from '@/lib/db/queries/versions';
import { requirePublisher, handleAuthError } from '@/lib/auth/guards';
import { validateExtension } from '@lootprotocol/validation';
import { uploadPackage } from '@/lib/s3';
import type { ExtensionType } from '@lootprotocol/shared-types';

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
  return NextResponse.json(versions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await requirePublisher(request, slug);

    const extension = await getExtensionBySlug(slug);
    if (!extension) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Extension not found' } }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('archive') as File;
    const changelog = (formData.get('changelog') as string) || null;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing archive file' } },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateExtension(extension.extensionType as ExtensionType, buffer, file.name);
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: validation.errors } },
        { status: 400 },
      );
    }

    const version = validation.metadata!.version || '1.0.0';
    const s3Key = await uploadPackage(slug, version, buffer);

    const newVersion = await createVersion(extension.id, {
      version,
      s3Key,
      packageSizeBytes: buffer.length,
      metadata: validation.metadata as Record<string, unknown>,
      changelog,
    });

    await updateExtension(slug, { latestVersion: version });

    return NextResponse.json({ data: newVersion }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
