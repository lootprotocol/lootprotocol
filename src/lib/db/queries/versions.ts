import type { ExtensionVersion } from '@lootprotocol/shared-types';
import type { Prisma } from '@prisma/client';
import { prisma } from '../client';
import { mapVersion } from '../mappers';

// ---------------------------------------------------------------------------
// Get all versions for an extension (newest first)
// ---------------------------------------------------------------------------

export async function getVersions(
  extensionId: string,
): Promise<ExtensionVersion[]> {
  const rows = await prisma.extensionVersion.findMany({
    where: { extensionId },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapVersion);
}

// ---------------------------------------------------------------------------
// Create a new version
// ---------------------------------------------------------------------------

export async function createVersion(
  extensionId: string,
  data: {
    version: string;
    s3Key: string;
    packageSizeBytes: number;
    metadata?: Record<string, unknown> | null;
    changelog?: string | null;
  },
): Promise<ExtensionVersion> {
  const row = await prisma.extensionVersion.create({
    data: {
      extensionId,
      version: data.version,
      s3Key: data.s3Key,
      packageSizeBytes: data.packageSizeBytes,
      metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
      changelog: data.changelog ?? null,
    },
  });

  return mapVersion(row);
}

// ---------------------------------------------------------------------------
// Get the latest (most recent) version for an extension
// ---------------------------------------------------------------------------

export async function getLatestVersion(
  extensionId: string,
): Promise<ExtensionVersion | null> {
  const row = await prisma.extensionVersion.findFirst({
    where: { extensionId },
    orderBy: { createdAt: 'desc' },
  });

  return row ? mapVersion(row) : null;
}
