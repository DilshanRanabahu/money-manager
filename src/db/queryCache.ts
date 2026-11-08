/**
 * Tiny shared query cache for the local database.
 *
 * - Results are cached per key (e.g. "tx:month:2026-11") and shared by every screen.
 * - Repositories call `invalidate([...tables])` once after a write (or once after a bulk
 *   import), so screens never re-query in the middle of a transaction.
 * - Data for a key always belongs to that key: switching months never shows the old month.
 * - `prefetch` warms neighbouring months so switching is instant.
 *
 * Pure TypeScript (no React) so it can be unit tested; the hook lives in useQuery.ts.
 */

export type Table = 'transactions' | 'categories';

type Listener = () => void;

type Entry = {
  key: string;
  fetcher: () => Promise<unknown>;
  tables: readonly Table[];
  data: unknown;
  hasData: boolean;
  error: Error | null;
  inFlight: Promise<void> | null;
  /** Invalidated while a fetch was running: fetch again when it finishes. */
  rerun: boolean;
  /** Invalidated while nobody was watching: refetch on next subscribe. */
  stale: boolean;
  listeners: Set<Listener>;
  lastUsed: number;
};

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

export class QueryCache {
  private entries = new Map<string, Entry>();
  private clock = 0;

  /** Keep at most this many unwatched entries (oldest are dropped first). */
  constructor(private readonly maxIdleEntries = 12) {}

  private ensure(key: string, fetcher: () => Promise<unknown>, tables: readonly Table[]): Entry {
    let e = this.entries.get(key);
    if (!e) {
      e = {
        key,
        fetcher,
        tables,
        data: undefined,
        hasData: false,
        error: null,
        inFlight: null,
        rerun: false,
        stale: false,
        listeners: new Set(),
        lastUsed: 0,
      };
      this.entries.set(key, e);
    } else {
      e.fetcher = fetcher;
      e.tables = tables;
    }
    e.lastUsed = ++this.clock;
    return e;
  }

  private run(e: Entry): Promise<void> {
    if (e.inFlight) {
      e.rerun = true;
      return e.inFlight;
    }
    e.rerun = false;
    e.stale = false;
    e.inFlight = e
      .fetcher()
      .then(
        (data) => {
          e.data = data;
          e.hasData = true;
          e.error = null;
        },
        (err: unknown) => {
          e.error = toError(err);
        },
      )
      .finally(() => {
        e.inFlight = null;
        e.listeners.forEach((l) => l());
        if (e.rerun) void this.run(e);
      });
    return e.inFlight;
  }

  /** Current data for a key, or undefined if it has never loaded. Stable reference. */
  snapshot<T>(key: string): T | undefined {
    const e = this.entries.get(key);
    return e?.hasData ? (e.data as T) : undefined;
  }

  error(key: string): Error | null {
    return this.entries.get(key)?.error ?? null;
  }

  /** Watch a key. Loads it if missing or stale. Returns an unsubscribe function. */
  subscribe(key: string, fetcher: () => Promise<unknown>, tables: readonly Table[], listener: Listener): () => void {
    const e = this.ensure(key, fetcher, tables);
    e.listeners.add(listener);
    // A fetch already running will deliver fresh data; don't start a second one.
    if ((!e.hasData || e.stale) && !e.inFlight) void this.run(e);
    return () => {
      e.listeners.delete(listener);
      e.lastUsed = ++this.clock;
      this.gc();
    };
  }

  /** Load a key in the background without watching it. */
  prefetch(key: string, fetcher: () => Promise<unknown>, tables: readonly Table[]): Promise<void> {
    const e = this.ensure(key, fetcher, tables);
    if (e.inFlight) return e.inFlight;
    if (e.hasData && !e.stale) return Promise.resolve();
    return this.run(e);
  }

  /** Mark every query that reads one of `tables` as out of date; watched ones refetch now. */
  invalidate(tables: readonly Table[]): void {
    for (const e of this.entries.values()) {
      if (!e.tables.some((t) => tables.includes(t))) continue;
      if (e.listeners.size > 0) void this.run(e);
      else e.stale = true;
    }
  }

  /** Drop everything (tests). */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private gc(): void {
    const idle = [...this.entries.values()]
      .filter((e) => e.listeners.size === 0 && !e.inFlight)
      .sort((a, b) => a.lastUsed - b.lastUsed);
    while (idle.length > this.maxIdleEntries) {
      const e = idle.shift()!;
      this.entries.delete(e.key);
    }
  }
}

/** The app-wide cache. */
export const queryCache = new QueryCache();
