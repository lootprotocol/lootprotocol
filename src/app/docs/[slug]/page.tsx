import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';

const DOCS_DIR = path.join(process.cwd(), 'docs');

const VALID_SLUGS = [
  'getting-started',
  'publishing-guide',
  'cli-reference',
  'extension-types',
] as const;

type DocSlug = (typeof VALID_SLUGS)[number];

const SLUG_TITLES: Record<DocSlug, string> = {
  'getting-started': 'Getting Started',
  'publishing-guide': 'Publishing Guide',
  'cli-reference': 'CLI Reference',
  'extension-types': 'Extension Types',
};

interface Frontmatter {
  title: string;
  description: string;
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = raw.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: { title: '', description: '' },
      content: raw,
    };
  }

  const yamlBlock = match[1];
  const content = match[2];

  // Simple YAML key-value parser for title and description
  const frontmatter: Frontmatter = { title: '', description: '' };
  for (const line of yamlBlock.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key === 'title') frontmatter.title = value;
    if (key === 'description') frontmatter.description = value;
  }

  return { frontmatter, content };
}

async function getDoc(slug: string): Promise<{ frontmatter: Frontmatter; content: string } | null> {
  if (!VALID_SLUGS.includes(slug as DocSlug)) {
    return null;
  }

  try {
    const filePath = path.join(DOCS_DIR, `${slug}.mdx`);
    const raw = await readFile(filePath, 'utf-8');
    return parseFrontmatter(raw);
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);

  if (!doc) {
    return { title: 'Not Found — Loot Protocol Docs' };
  }

  return {
    title: `${doc.frontmatter.title} — Loot Protocol Docs`,
    description: doc.frontmatter.description,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);

  if (!doc) {
    notFound();
  }

  const slugIndex = VALID_SLUGS.indexOf(slug as DocSlug);
  const prevSlug = slugIndex > 0 ? VALID_SLUGS[slugIndex - 1] : null;
  const nextSlug = slugIndex < VALID_SLUGS.length - 1 ? VALID_SLUGS[slugIndex + 1] : null;

  return (
    <>
      <article>
        <MarkdownRenderer content={doc.content} />
      </article>

      {/* Previous / Next navigation */}
      <nav className="mt-12 flex items-center justify-between border-t border-border pt-6">
        {prevSlug ? (
          <Link
            href={`/docs/${prevSlug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>{SLUG_TITLES[prevSlug]}</span>
          </Link>
        ) : (
          <span />
        )}
        {nextSlug ? (
          <Link
            href={`/docs/${nextSlug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span>{SLUG_TITLES[nextSlug]}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
