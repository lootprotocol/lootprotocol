import type { ExtensionType } from './extension';
export interface MarketplaceManifest {
    version: string;
    extensions: MarketplaceEntry[];
    generatedAt: string;
}
export interface MarketplaceEntry {
    slug: string;
    name: string;
    description: string;
    type: ExtensionType;
    version: string;
    downloadUrl: string;
    publisher: string;
    tags: string[];
}
//# sourceMappingURL=marketplace.d.ts.map