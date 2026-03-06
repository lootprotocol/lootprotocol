import type { Profile } from './user';

export type ExtensionType = 'skill' | 'mcp_server' | 'plugin';

export interface Extension {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  description: string;
  extensionType: ExtensionType;
  category: string;
  tags: string[];
  latestVersion: string;
  readmeHtml: string | null;
  readmeText: string | null;
  downloadCount: number;
  publisherId: string;
  publisher?: Profile;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtensionVersion {
  id: string;
  extensionId: string;
  version: string;
  s3Key: string;
  packageSizeBytes: number;
  metadata: Record<string, unknown> | null;
  changelog: string | null;
  downloadCount: number;
  createdAt: string;
}

export interface ExtensionListQuery {
  q?: string;
  category?: string;
  type?: ExtensionType;
  sort?: 'downloads' | 'recent' | 'relevance';
  page?: number;
  limit?: number;
}

export interface ExtensionCreatePayload {
  type: ExtensionType;
  archive: Buffer;
  filename: string;
  displayName?: string;
  category: string;
  tags?: string[];
}
