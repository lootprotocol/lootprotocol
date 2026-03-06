import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExtensionTypeBadge } from './extension-type-badge';
import { DownloadBadge } from './download-badge';
import type { Extension } from '@lootprotocol/shared-types';

export function ExtensionCard({ extension }: { extension: Extension }) {
  return (
    <Link href={`/extensions/${extension.slug}`} className="group block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <ExtensionTypeBadge type={extension.extensionType} />
            <DownloadBadge count={extension.downloadCount} />
          </div>
          <CardTitle className="text-base group-hover:text-primary transition-colors">
            {extension.displayName || extension.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">{extension.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {extension.publisher?.username || 'unknown'}
            </span>
            <div className="flex flex-wrap gap-1">
              {extension.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
