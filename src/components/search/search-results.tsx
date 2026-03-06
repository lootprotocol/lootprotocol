'use client';

import { Button } from '@/components/ui/button';
import { ExtensionGrid, ExtensionGridSkeleton } from '@/components/extensions/extension-grid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Extension, PaginatedResponse } from '@lootprotocol/shared-types';

interface SearchResultsProps {
  data: PaginatedResponse<Extension> | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function SearchResults({ data, isLoading, onPageChange }: SearchResultsProps) {
  if (isLoading) {
    return <ExtensionGridSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { pagination } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pagination.total} extension{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      <ExtensionGrid extensions={data.data} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
