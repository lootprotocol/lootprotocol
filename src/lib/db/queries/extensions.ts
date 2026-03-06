import type {
  Extension,
  ExtensionListQuery,
  ExtensionType,
  PaginatedResponse,
} from '@lootprotocol/shared-types';
import type { Prisma } from '@prisma/client';
import { prisma } from '../client';
import { mapExtension } from '../mappers';

// ---------------------------------------------------------------------------
// List extensions with filtering, search, sorting, and pagination
// ---------------------------------------------------------------------------

export async function listExtensions(
  query: ExtensionListQuery & { publisherId?: string },
): Promise<PaginatedResponse<Extension>> {
  const {
    q,
    category,
    type,
    sort = 'relevance',
    page = 1,
    limit = 20,
    publisherId,
  } = query;

  const where: Prisma.ExtensionWhereInput = { isPublished: true };

  // --- Filter by search query ---
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { has: q.toLowerCase() } },
    ];
  }

  // --- Filter by category ---
  if (category) {
    where.category = category;
  }

  // --- Filter by extension type ---
  if (type) {
    where.extensionType = type as ExtensionType;
  }

  // --- Filter by publisher ---
  if (publisherId) {
    where.publisherId = publisherId;
  }

  // --- Sort ---
  let orderBy: Prisma.ExtensionOrderByWithRelationInput[];
  switch (sort) {
    case 'downloads':
      orderBy = [{ downloadCount: 'desc' }];
      break;
    case 'recent':
      orderBy = [{ updatedAt: 'desc' }];
      break;
    case 'relevance':
    default:
      orderBy = [{ isFeatured: 'desc' }, { downloadCount: 'desc' }];
      break;
  }

  // --- Count + paginate ---
  const total = await prisma.extension.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const skip = (safePage - 1) * limit;

  const rows = await prisma.extension.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    include: { publisher: true },
  });

  return {
    data: rows.map(mapExtension),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  };
}

// ---------------------------------------------------------------------------
// Get a single extension by slug (includes publisher)
// ---------------------------------------------------------------------------

export async function getExtensionBySlug(
  slug: string,
): Promise<Extension | null> {
  const row = await prisma.extension.findUnique({
    where: { slug },
    include: { publisher: true },
  });

  if (!row || !row.isPublished) return null;
  return mapExtension(row);
}

// ---------------------------------------------------------------------------
// Create a new extension
// ---------------------------------------------------------------------------

export async function createExtension(data: {
  slug: string;
  name: string;
  displayName?: string | null;
  description: string;
  extensionType: ExtensionType;
  category: string;
  tags?: string[];
  latestVersion: string;
  readmeHtml?: string | null;
  readmeText?: string | null;
  publisherId: string;
}): Promise<Extension> {
  const row = await prisma.extension.create({
    data: {
      slug: data.slug,
      name: data.name,
      displayName: data.displayName ?? null,
      description: data.description,
      extensionType: data.extensionType,
      category: data.category,
      tags: data.tags ?? [],
      latestVersion: data.latestVersion,
      readmeHtml: data.readmeHtml ?? null,
      readmeText: data.readmeText ?? null,
      publisherId: data.publisherId,
    },
    include: { publisher: true },
  });

  return mapExtension(row);
}

// ---------------------------------------------------------------------------
// Update an extension
// ---------------------------------------------------------------------------

export async function updateExtension(
  slug: string,
  data: Partial<{
    displayName: string | null;
    description: string;
    category: string;
    tags: string[];
    latestVersion: string;
    readmeHtml: string | null;
    readmeText: string | null;
    isFeatured: boolean;
  }>,
): Promise<Extension> {
  const row = await prisma.extension.update({
    where: { slug },
    data,
    include: { publisher: true },
  });

  return mapExtension(row);
}

// ---------------------------------------------------------------------------
// Delete (soft) an extension
// ---------------------------------------------------------------------------

export async function deleteExtension(slug: string): Promise<void> {
  await prisma.extension.update({
    where: { slug },
    data: { isPublished: false },
  });
}

// ---------------------------------------------------------------------------
// Simple text search across name, description, tags
// ---------------------------------------------------------------------------

export async function searchExtensions(query: string): Promise<Extension[]> {
  const rows = await prisma.extension.findMany({
    where: {
      isPublished: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
      ],
    },
    include: { publisher: true },
    orderBy: { downloadCount: 'desc' },
  });

  return rows.map(mapExtension);
}

// ---------------------------------------------------------------------------
// Get all published extensions (for marketplace.json manifest)
// ---------------------------------------------------------------------------

export async function getAllPublishedExtensions(): Promise<Extension[]> {
  const rows = await prisma.extension.findMany({
    where: { isPublished: true },
    include: { publisher: true },
    orderBy: { downloadCount: 'desc' },
  });

  return rows.map(mapExtension);
}

// ---------------------------------------------------------------------------
// Aggregate counts
// ---------------------------------------------------------------------------

export async function countExtensions(): Promise<number> {
  return prisma.extension.count({ where: { isPublished: true } });
}

export async function countPublishers(): Promise<number> {
  const result = await prisma.extension.findMany({
    where: { isPublished: true },
    select: { publisherId: true },
    distinct: ['publisherId'],
  });
  return result.length;
}
