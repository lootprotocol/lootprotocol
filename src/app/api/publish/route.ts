import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/guards';
import { validateExtension } from '@lootprotocol/validation';
import { buildArchiveForType } from '@/lib/api/assemble-archive';
import { uploadPackage } from '@/lib/s3';
import { createExtension } from '@/lib/db/queries/extensions';
import { createVersion } from '@/lib/db/queries/versions';
import { prisma } from '@/lib/db/client';
import slugify from 'slugify';
import type { ExtensionType } from '@lootprotocol/shared-types';

/** Maps a validation error path to a form field name. */
function mapErrorToField(path: string | undefined): string | null {
  if (!path) return null;
  if (path === 'SKILL.md') return 'SKILL.md';
  if (path === 'mcp.json') return 'mcp.json';
  if (path === 'package.json' || path === 'requirements.txt') return 'package.json';
  if (path === 'README.md') return 'README.md';
  if (path.startsWith('src/')) return 'source-archive';
  if (path === '.claude-plugin/plugin.json') return 'plugin.json';
  if (
    path.startsWith('skills/') ||
    path.startsWith('commands/') ||
    path.startsWith('agents/') ||
    path.startsWith('hooks/')
  ) {
    return 'component-bundle';
  }
  return null;
}

/** File field names expected per extension type. */
const EXPECTED_FIELDS: Record<ExtensionType, string[]> = {
  skill: ['SKILL.md'],
  mcp_server: ['mcp.json', 'package.json', 'README.md', 'source-archive'],
  plugin: ['plugin.json', 'README.md', 'component-bundle'],
};

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const formData = await request.formData();

    const type = formData.get('type') as ExtensionType | null;
    const displayName = formData.get('displayName') as string | null;
    const category = formData.get('category') as string | null;
    const tagsRaw = formData.get('tags') as string | null;
    const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : [];

    if (!type || !EXPECTED_FIELDS[type]) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing or invalid extension type' } },
        { status: 400 },
      );
    }

    // Read uploaded files into buffers keyed by field name
    const fileBuffers: Record<string, Buffer> = {};
    for (const fieldName of EXPECTED_FIELDS[type]) {
      const file = formData.get(fieldName) as File | null;
      if (file && file.size > 0) {
        fileBuffers[fieldName] = Buffer.from(await file.arrayBuffer());
      }
    }

    // Assemble individual files into a zip for the validation pipeline
    const archiveBuffer = await buildArchiveForType(type, fileBuffers);

    // Run through the existing validation pipeline
    const validation = await validateExtension(type, archiveBuffer, 'assembled.zip');

    if (!validation.valid) {
      // Map validation errors to form field names
      const fieldErrors: Record<string, string> = {};
      const unmappedErrors: { message: string; path?: string }[] = [];

      for (const err of validation.errors) {
        const field = mapErrorToField(err.path);
        if (field) {
          // Collect first error per field
          if (!fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        } else {
          unmappedErrors.push({ message: err.message, path: err.path });
        }
      }

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
          },
          validation,
          fieldErrors,
          unmappedErrors,
        },
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

    // Publish: upload to S3, create DB records
    const slug = slugify(validation.metadata!.name, { lower: true, strict: true });
    const version = validation.metadata!.version || '1.0.0';
    const s3Key = await uploadPackage(slug, version, archiveBuffer);

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
      packageSizeBytes: archiveBuffer.length,
      metadata: validation.metadata as Record<string, unknown>,
    });

    return NextResponse.json({ data: extension }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
