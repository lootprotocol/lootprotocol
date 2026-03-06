import { NextResponse } from 'next/server';
import { getAllPublishedExtensions } from '@/lib/db/queries/extensions';
import type { MarketplaceManifest } from '@lootprotocol/shared-types';

export async function GET() {
  const extensions = await getAllPublishedExtensions();
  const manifest: MarketplaceManifest = {
    version: '1.0',
    extensions: extensions.map((ext) => ({
      slug: ext.slug,
      name: ext.name,
      description: ext.description,
      type: ext.extensionType,
      version: ext.latestVersion,
      downloadUrl: `${process.env.NEXT_PUBLIC_API_URL || '/api'}/extensions/${ext.slug}/download`,
      publisher: ext.publisher?.username || 'unknown',
      tags: ext.tags,
    })),
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(manifest, {
    headers: { 'Cache-Control': 'public, s-maxage=300' },
  });
}
