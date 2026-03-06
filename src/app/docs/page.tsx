import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, Terminal, Upload, Blocks } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation — Loot Protocol',
  description: 'Learn how to use, publish, and extend the Loot Protocol marketplace',
};

const docs = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    description: 'Set up your environment and install your first extension',
    icon: BookOpen,
  },
  {
    title: 'Publishing Guide',
    slug: 'publishing-guide',
    description: 'Package and publish your own extensions to the marketplace',
    icon: Upload,
  },
  {
    title: 'CLI Reference',
    slug: 'cli-reference',
    description: 'Complete reference for the lootprotocol CLI commands',
    icon: Terminal,
  },
  {
    title: 'Extension Types',
    slug: 'extension-types',
    description: 'Learn about skills, MCP servers, and plugins',
    icon: Blocks,
  },
];

export default function DocsIndexPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        Everything you need to get started with Loot Protocol.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {docs.map((doc) => {
          const Icon = doc.icon;
          return (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="group rounded-lg border border-border p-5 transition-colors hover:border-foreground/20 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                <h2 className="text-lg font-semibold group-hover:text-foreground">
                  {doc.title}
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {doc.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
