'use client';

import { Suspense, useState } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { FilterSidebar } from '@/components/search/filter-sidebar';
import { SortSelect } from '@/components/search/sort-select';
import { SearchResults } from '@/components/search/search-results';
import { ExtensionGridSkeleton } from '@/components/extensions/extension-grid';
import { useSearch } from '@/hooks/use-search';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function ExploreContent() {
  const {
    query,
    category,
    type,
    sort,
    setQuery,
    setCategory,
    setType,
    setSort,
    setPage,
    results,
    isLoading,
  } = useSearch();

  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = (category ? 1 : 0) + (type ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Explore Extensions</h1>
        <p className="mt-1 text-muted-foreground">
          Browse and search AI agent extensions
        </p>
      </div>

      {/* Search + Sort + Mobile Filter */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} />
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="px-4 py-2">
                <FilterSidebar
                  selectedCategory={category}
                  selectedType={type}
                  onCategoryChange={(val) => { setCategory(val); }}
                  onTypeChange={(val) => { setType(val); }}
                />
              </div>
            </SheetContent>
          </Sheet>
          <SortSelect
            value={sort as 'downloads' | 'recent' | 'relevance'}
            onChange={setSort}
            hasQuery={!!query}
          />
        </div>
      </div>

      {/* Filters + Results */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <FilterSidebar
            selectedCategory={category}
            selectedType={type}
            onCategoryChange={setCategory}
            onTypeChange={setType}
          />
        </aside>

        <div>
          <SearchResults
            data={results}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8"><ExtensionGridSkeleton /></div>}>
      <ExploreContent />
    </Suspense>
  );
}
