import { NextResponse } from 'next/server';
import { listExtensions, createExtension } from '@/lib/db/queries/extensions';
import { createVersion } from '@/lib/db/queries/versions';
import { requireAuth, handleAuthError } from '@/lib/auth/guards';
import { validateExtension } from '@lootprotocol/validation';
import { uploadPackage } from '@/lib/s3';
import { prisma } from '@/lib/db/client';
import slugify from 'slugify';
import type { ExtensionType } from '@lootprotocol/shared-types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = {
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    type: (searchParams.get('type') as ExtensionType) || undefined,
    sort: (searchParams.get('sort') as 'downloads' | 'recent' | 'relevance') || 'recent',
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
    publisherId: searchParams.get('publisherId') || undefined,
  };
  const result = await listExtensions(query);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const file = formData.get('archive') as File;
    const type = formData.get('type') as ExtensionType;
    const displayName = formData.get('displayName') as string;
    const category = formData.get('category') as string;
    const tags = JSON.parse((formData.get('tags') as string) || '[]');

    if (!file || !type) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing required fields: archive, type' } },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateExtension(type, buffer, file.name);
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: validation.errors } },
        { status: 400 },
      );
    }

    // Look up the actual profile by cognitoSub to get the DB profile ID
    const profile = await prisma.profile.findUnique({
      where: { cognitoSub: user.cognitoSub },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found. Please log out and log in again.' } },
        { status: 403 },
      );
    }

    const slug = slugify(validation.metadata!.name, { lower: true, strict: true });
    const version = validation.metadata!.version || '1.0.0';
    const s3Key = await uploadPackage(slug, version, buffer);

    const extension = await createExtension({
      slug,
      name: validation.metadata!.name,
      displayName: displayName || null,
      description: validation.metadata!.description,
      extensionType: type,
      category: category || 'other',
      tags,
      latestVersion: version,
      publisherId: profile.id,
    });

    await createVersion(extension.id, {
      version,
      s3Key,
      packageSizeBytes: buffer.length,
      metadata: validation.metadata as Record<string, unknown>,
    });

    return NextResponse.json({ data: extension }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
