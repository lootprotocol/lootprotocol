'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BookOpen, Terminal, Upload, Blocks, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';

const sidebarItems = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    icon: BookOpen,
  },
  {
    title: 'Publishing Guide',
    slug: 'publishing-guide',
    icon: Upload,
  },
  {
    title: 'CLI Reference',
    slug: 'cli-reference',
    icon: Terminal,
  },
  {
    title: 'Extension Types',
    slug: 'extension-types',
    icon: Blocks,
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-3 py-4">
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const href = `/docs/${item.slug}`;
        const isActive = pathname === href;
        return (
          <Link
            key={item.slug}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
            {...(isActive && { 'aria-current': 'page' as const })}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-muted/40 md:block">
        <div className="flex h-14 items-center border-b border-border px-6">
          <Link href="/" className="text-sm font-semibold text-foreground">
            Loot Protocol
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/docs/getting-started" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Docs
          </Link>
        </div>
        <SidebarNav />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Open docs navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b border-border px-6">
                <SheetTitle className="text-sm">Documentation</SheetTitle>
              </SheetHeader>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium">Docs</span>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
