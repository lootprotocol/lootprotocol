export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ExtensionDetail } from '@/components/extensions/extension-detail';
import { getExtensionBySlug } from '@/lib/db/queries/extensions';
import { getVersions } from '@/lib/db/queries/versions';
import { processMarkdown } from '@/components/markdown/markdown-renderer';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const extension = await getExtensionBySlug(slug);
  if (!extension) return { title: 'Not Found' };

  const title = extension.displayName || extension.name;
  const description = extension.description || `${title} — an AI agent extension on Loot Protocol`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} — Loot Protocol`,
      description,
      type: 'article',
      url: `/extensions/${slug}`,
    },
    twitter: {
      card: 'summary',
      title: `${title} — Loot Protocol`,
      description,
    },
  };
}

export default async function ExtensionPage({ params }: Props) {
  const { slug } = await params;
  const extension = await getExtensionBySlug(slug);
  if (!extension) notFound();

  const versions = await getVersions(extension.id);

  // Pre-render README on the server with syntax highlighting + sanitization
  const readmeContent = extension.readmeText || '';
  const renderedReadmeHtml = readmeContent
    ? await processMarkdown(readmeContent, true)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ExtensionDetail
        extension={extension}
        versions={versions}
        readmeHtml={renderedReadmeHtml}
      />
    </div>
  );
}
