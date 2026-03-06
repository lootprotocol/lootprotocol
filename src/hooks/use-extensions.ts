'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Extension, ExtensionListQuery, ExtensionVersion, PaginatedResponse } from '@lootprotocol/shared-types';

function buildQueryString(query: ExtensionListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.type) params.set('type', query.type);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  return params.toString();
}

export function useExtensions(query: ExtensionListQuery) {
  const [data, setData] = useState<PaginatedResponse<Extension>>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const qs = buildQueryString(query);
      const res = await fetch(`/api/extensions?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.q, query.category, query.type, query.sort, query.page, query.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, mutate: fetchData };
}

export function useExtension(slug: string) {
  const [data, setData] = useState<Extension & { versions: ExtensionVersion[] }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/extensions/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [slug]);

  return { data, isLoading, error };
}
