import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { queryCache, type Table } from './queryCache';

/**
 * Read cached data for `key`. Re-renders when the data changes.
 * `loading` is true only when this key has never loaded (no stale data from another key).
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>, tables: readonly Table[]) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const tableKey = tables.join(',');
  const subscribe = useCallback(
    (onChange: () => void) =>
      queryCache.subscribe(key, () => fetcherRef.current(), tableKey.split(',') as Table[], onChange),
    [key, tableKey],
  );
  const getSnapshot = useCallback(() => queryCache.snapshot<T>(key), [key]);

  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { data, loading: data === undefined, error: data === undefined ? queryCache.error(key) : null };
}
