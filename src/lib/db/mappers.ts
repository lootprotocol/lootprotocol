import type {
  Profile as PrismaProfile,
  Extension as PrismaExtension,
  ExtensionVersion as PrismaVersion,
} from '@prisma/client';
import type {
  Profile,
  Extension,
  ExtensionVersion,
  AuthProvider,
} from '@lootprotocol/shared-types';

// Prisma returns BigInt for githubId and Date for timestamps.
// Shared-types expects number and ISO strings.

type PrismaProfileRow = PrismaProfile;
type PrismaExtensionRow = PrismaExtension & { publisher?: PrismaProfileRow };
type PrismaVersionRow = PrismaVersion;

export function mapProfile(p: PrismaProfileRow): Profile {
  return {
    id: p.id,
    cognitoSub: p.cognitoSub,
    username: p.username,
    email: p.email ?? null,
    authProvider: p.authProvider as AuthProvider,
    githubUsername: p.githubUsername ?? null,
    githubId: p.githubId ? Number(p.githubId) : null,
    googleId: p.googleId ?? null,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    websiteUrl: p.websiteUrl,
    role: p.role,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function mapExtension(e: PrismaExtensionRow): Extension {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    displayName: e.displayName,
    description: e.description,
    extensionType: e.extensionType,
    category: e.category,
    tags: e.tags,
    latestVersion: e.latestVersion,
    readmeHtml: e.readmeHtml,
    readmeText: e.readmeText,
    downloadCount: e.downloadCount,
    publisherId: e.publisherId,
    publisher: e.publisher ? mapProfile(e.publisher) : undefined,
    isPublished: e.isPublished,
    isFeatured: e.isFeatured,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function mapVersion(v: PrismaVersionRow): ExtensionVersion {
  return {
    id: v.id,
    extensionId: v.extensionId,
    version: v.version,
    s3Key: v.s3Key,
    packageSizeBytes: v.packageSizeBytes,
    metadata: v.metadata as Record<string, unknown> | null,
    changelog: v.changelog,
    downloadCount: v.downloadCount,
    createdAt: v.createdAt.toISOString(),
  };
}
