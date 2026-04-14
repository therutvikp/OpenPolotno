'use client';

import { useRef, useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';

export const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface UseInfiniteAPIOptions<T = any> {
  defaultQuery?: string;
  timeout?: number;
  getAPI: (params: { query: string; page: number }) => string;
  getSize?: (page: T) => number;
  fetchFunc?: (url: string) => Promise<T>;
}

export function useInfiniteAPI<T = any>({
  defaultQuery = '',
  timeout = 1000,
  getAPI,
  getSize = (page: any) => page.total_pages,
  fetchFunc = fetcher,
}: UseInfiniteAPIOptions<T>) {
  const queryRef = useRef(defaultQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const { data, error, size, setSize, mutate } = useSWRInfinite(
    (index) => getAPI({ query: queryRef.current, page: index + 1 }),
    fetchFunc,
    { revalidateAll: false, revalidateOnFocus: false },
  );

  const isLoading = (!data && !error) || (size > 0 && data && data[size - 1] === undefined);
  const isEmpty = (data?.[0] as any)?.length === 0;
  const lastPage = data?.[data.length - 1];
  const isReachingEnd = isEmpty || (lastPage && getSize(lastPage) === size);

  const setQuery = useCallback(
    (query: string) => {
      queryRef.current = query;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        mutate([]);
      }, timeout);
    },
    [timeout, mutate],
  );

  return {
    setQuery,
    isLoading,
    loadMore: () => {
      if (!isReachingEnd) setSize(size + 1);
    },
    isReachingEnd,
    data: data?.filter(Boolean),
    items: data?.flat() || [],
    hasMore: !isReachingEnd,
    reset: mutate,
    error,
  };
}
