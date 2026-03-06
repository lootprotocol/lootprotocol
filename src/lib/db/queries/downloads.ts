import { prisma } from '../client';

// ---------------------------------------------------------------------------
// Record a download (and increment counters on extension + version)
// ---------------------------------------------------------------------------

export async function recordDownload(data: {
  extensionId: string;
  versionId?: string;
  userId: string;
  source: string;
}): Promise<void> {
  await prisma.$transaction([
    prisma.downloadEvent.create({
      data: {
        extensionId: data.extensionId,
        versionId: data.versionId ?? null,
        userId: data.userId,
        source: data.source,
      },
    }),
    prisma.extension.update({
      where: { id: data.extensionId },
      data: { downloadCount: { increment: 1 } },
    }),
    ...(data.versionId
      ? [
          prisma.extensionVersion.update({
            where: { id: data.versionId },
            data: { downloadCount: { increment: 1 } },
          }),
        ]
      : []),
  ]);
}

// ---------------------------------------------------------------------------
// Get download statistics for an extension
// ---------------------------------------------------------------------------

export async function getDownloadStats(
  extensionId: string,
): Promise<{ total: number; thisMonth: number; thisWeek: number }> {
  const now = new Date();

  // Start of current month (UTC)
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  // Start of current week (Monday, UTC)
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset),
  );

  const [total, thisMonth, thisWeek] = await Promise.all([
    prisma.downloadEvent.count({ where: { extensionId } }),
    prisma.downloadEvent.count({
      where: { extensionId, createdAt: { gte: monthStart } },
    }),
    prisma.downloadEvent.count({
      where: { extensionId, createdAt: { gte: weekStart } },
    }),
  ]);

  return { total, thisMonth, thisWeek };
}

// ---------------------------------------------------------------------------
// Count total downloads across all extensions
// ---------------------------------------------------------------------------

export async function countDownloads(): Promise<number> {
  return prisma.downloadEvent.count();
}
