import { NextResponse } from 'next/server';
import { getExtensionBySlug } from '@/lib/db/queries/extensions';
import { getLatestVersion } from '@/lib/db/queries/versions';
import { recordDownload } from '@/lib/db/queries/downloads';
import { getObjectStream } from '@/lib/s3';
import { requireDownloadAuth, handleAuthError } from '@/lib/auth/guards';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const user = await requireDownloadAuth(request);
    const extension = await getExtensionBySlug(slug);
    if (!extension) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Extension not found' } }, { status: 404 });
    }

    const latestVersion = await getLatestVersion(extension.id);
    if (!latestVersion) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No versions available' } }, { status: 404 });
    }

    const source = (request.headers.get('X-Download-Source') || 'web') as 'web' | 'cli' | 'in-agent';
    await recordDownload({
      extensionId: extension.id,
      versionId: latestVersion.id,
      userId: user.id,
      source,
    });

    const s3Object = await getObjectStream(latestVersion.s3Key);
    const filename = `${slug}-${latestVersion.version}.tar.gz`;

    const headers = new Headers();
    headers.set('Content-Type', s3Object.contentType || 'application/gzip');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    if (s3Object.contentLength !== undefined) {
      headers.set('Content-Length', String(s3Object.contentLength));
    }
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');

    return new Response(s3Object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
