'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useExtensions } from './use-extensions';
import type { ExtensionListQuery, ExtensionType } from '@lootprotocol/shared-types';

export function useSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query: ExtensionListQuery = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      type: (searchParams.get('type') as ExtensionType) || undefined,
      sort: (searchParams.get('sort') as 'downloads' | 'recent' | 'relevance') || 'recent',
      page: parseInt(searchParams.get('page') || '1'),
      limit: 20,
    }),
    [searchParams],
  );

  const { data, isLoading, error, mutate } = useExtensions(query);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      // Reset page when changing filters
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const setQuery = useCallback(
    (q: string) => updateParams({ q: q || undefined }),
    [updateParams],
  );

  const setCategory = useCallback(
    (category: string | undefined) => updateParams({ category }),
    [updateParams],
  );

  const setType = useCallback(
    (type: ExtensionType | undefined) => updateParams({ type }),
    [updateParams],
  );

  const setSort = useCallback(
    (sort: string) => updateParams({ sort }),
    [updateParams],
  );

  const setPage = useCallback(
    (page: number) => updateParams({ page: String(page) }),
    [updateParams],
  );

  return {
    query: query.q || '',
    category: query.category,
    type: query.type,
    sort: query.sort || 'recent',
    page: query.page || 1,
    setQuery,
    setCategory,
    setType,
    setSort,
    setPage,
    results: data,
    isLoading,
    error,
    mutate,
  };
}
