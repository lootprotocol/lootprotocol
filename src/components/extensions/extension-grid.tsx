import { ExtensionCard } from './extension-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Extension } from '@lootprotocol/shared-types';

export function ExtensionGrid({ extensions }: { extensions: Extension[] }) {
  if (extensions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No extensions found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {extensions.map((ext) => (
        <ExtensionCard key={ext.id} extension={ext} />
      ))}
    </div>
  );
}

export function ExtensionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
