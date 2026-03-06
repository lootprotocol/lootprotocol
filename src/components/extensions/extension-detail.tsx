'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User } from 'lucide-react';
import { ExtensionTypeBadge } from './extension-type-badge';
import { DownloadBadge } from './download-badge';
import { InstallMethods } from './install-methods';
import { MarkdownContent } from '@/components/markdown/code-block-copy-button';
import '@/components/markdown/markdown-renderer.css';
import type { Extension, ExtensionVersion } from '@lootprotocol/shared-types';

interface ExtensionDetailProps {
  extension: Extension;
  versions: ExtensionVersion[];
  readmeHtml?: string;
}

export function ExtensionDetail({ extension, versions, readmeHtml }: ExtensionDetailProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
      {/* Main Content - README */}
      <div className="min-w-0">
        {readmeHtml ? (
          <MarkdownContent
            html={readmeHtml}
            className="markdown-body prose prose-neutral max-w-none dark:prose-invert"
          />
        ) : (
          <div className="text-muted-foreground py-12 text-center">No README available</div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <ExtensionTypeBadge type={extension.extensionType} />
            <h2 className="text-lg font-semibold">
              {extension.displayName || extension.name}
            </h2>
            <p className="text-sm text-muted-foreground">{extension.description}</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Publisher</span>
              <span className="flex items-center gap-1">
                <User className="size-3.5" />
                {extension.publisher?.username || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span>{extension.latestVersion}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="secondary">{extension.category}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Downloads</span>
              <DownloadBadge count={extension.downloadCount} />
            </div>
          </div>

          <Separator />

          {extension.tags.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1">
                {extension.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Separator />
            </>
          )}

          <InstallMethods slug={extension.slug} />
        </div>

        {/* Versions */}
        {versions.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Versions</h3>
            <div className="space-y-2">
              {versions.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{v.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {versions.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{versions.length - 5} more versions
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
