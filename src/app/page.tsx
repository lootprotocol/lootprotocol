export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExtensionGrid } from '@/components/extensions/extension-grid';
import { listExtensions, countExtensions, countPublishers } from '@/lib/db/queries/extensions';
import { countDownloads } from '@/lib/db/queries/downloads';
import { ArrowRight, Download, Package, Users } from 'lucide-react';

export default async function Home() {
  const [featured, stats] = await Promise.all([
    listExtensions({ sort: 'downloads', limit: 6 }),
    Promise.all([countExtensions(), countDownloads(), countPublishers()]),
  ]);

  const [totalExtensions, totalDownloads, totalPublishers] = stats;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            The Marketplace for
            <br />
            <span className="text-primary">AI Agent Extensions</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Discover, install, and publish extensions for Claude Code and other AI agents.
            Skills, MCP servers, and plugins — all in one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/explore">
                Explore Extensions
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/publish">Publish Yours</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b">
        <div className="mx-auto grid max-w-4xl grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 py-8">
          {[
            { label: 'Extensions', value: totalExtensions, icon: Package },
            { label: 'Downloads', value: totalDownloads, icon: Download },
            { label: 'Publishers', value: totalPublishers, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-4">
              <Icon className="size-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{value.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Extensions */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Popular Extensions</h2>
          <Button asChild variant="ghost">
            <Link href="/explore?sort=downloads">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ExtensionGrid extensions={featured.data} />
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Browse',
                description: 'Explore extensions by category, type, or search for what you need.',
              },
              {
                step: '2',
                title: 'Install',
                description: 'Use the CLI or ask your AI agent to install with a single command.',
              },
              {
                step: '3',
                title: 'Use',
                description: 'Extensions are automatically available in your AI agent environment.',
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step}
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Creators */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold">For Creators</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Build',
                description: 'Create a skill, MCP server, or plugin using our development guides.',
              },
              {
                step: '2',
                title: 'Publish',
                description: 'Upload your extension through the web or CLI. We validate and host it.',
              },
              {
                step: '3',
                title: 'Share',
                description: 'Your extension becomes discoverable to thousands of AI agent users.',
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                  {step}
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/publish">
                Start Publishing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
