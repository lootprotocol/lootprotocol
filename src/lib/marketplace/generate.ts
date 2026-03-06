import { getAllPublishedExtensions } from '@/lib/db/queries/extensions';
import type { MarketplaceManifest } from '@lootprotocol/shared-types';

export async function generateMarketplaceManifest(): Promise<MarketplaceManifest> {
  const extensions = await getAllPublishedExtensions();
  return {
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
}
