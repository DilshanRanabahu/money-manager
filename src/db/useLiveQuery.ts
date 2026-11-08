import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef, useState, type DependencyList } from 'react';

type LiveQuery<T> = { data: T | undefined; error: Error | null; loading: boolean };

/**
 * Runs `query` and re-runs it whenever one of `tables` changes.
 * Writes anywhere in the app update every screen automatically.
 */
export function useLiveQuery<T>(query: () => Promise<T>, tables: readonly string[], deps: DependencyList): LiveQuery<T> {
  const [state, setState] = useState<LiveQuery<T>>({ data: undefined, error: null, loading: true });
  const queryRef = useRef(query);
  const tableKey = tables.join(',');

  // Always call the latest query closure (runs before the effect below).
  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    let cancelled = false;
    let seq = 0;

    const run = () => {
      const mine = ++seq;
      queryRef
        .current()
        .then((data) => {
          if (!cancelled && mine === seq) setState({ data, error: null, loading: false });
        })
        .catch((error: unknown) => {
          if (!cancelled && mine === seq) {
            setState((s) => ({ ...s, error: error instanceof Error ? error : new Error(String(error)), loading: false }));
          }
        });
    };

    run();

    const watched = new Set(tableKey.split(','));
    let scheduled = false;
    const sub = addDatabaseChangeListener((event) => {
      if (!watched.has(event.tableName) || scheduled) return;
      // Coalesce bursts (e.g. a transaction writing many rows) into one re-run.
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        if (!cancelled) run();
      }, 0);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, ...deps]);

  return state;
}
