import { QueryCache } from './queryCache';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('QueryCache', () => {
  it('loads on subscribe and notifies', async () => {
    const cache = new QueryCache();
    const fetcher = jest.fn(async () => [1, 2]);
    const listener = jest.fn();
    cache.subscribe('a', fetcher, ['transactions'], listener);
    expect(cache.snapshot('a')).toBeUndefined();
    await flush();
    expect(cache.snapshot('a')).toEqual([1, 2]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps data per key, never mixing keys', async () => {
    const cache = new QueryCache();
    cache.subscribe('nov', async () => 'november', ['transactions'], () => {});
    cache.subscribe('dec', async () => 'december', ['transactions'], () => {});
    await flush();
    expect(cache.snapshot('nov')).toBe('november');
    expect(cache.snapshot('dec')).toBe('december');
  });

  it('shares one fetch between subscribers of the same key', async () => {
    const cache = new QueryCache();
    const fetcher = jest.fn(async () => 1);
    cache.subscribe('a', fetcher, ['transactions'], () => {});
    cache.subscribe('a', fetcher, ['transactions'], () => {});
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches watched keys on invalidate, only for matching tables', async () => {
    const cache = new QueryCache();
    let n = 0;
    const tx = jest.fn(async () => ++n);
    const cats = jest.fn(async () => 'c');
    cache.subscribe('tx', tx, ['transactions', 'categories'], () => {});
    cache.subscribe('cats', cats, ['categories'], () => {});
    await flush();
    cache.invalidate(['transactions']);
    await flush();
    expect(tx).toHaveBeenCalledTimes(2);
    expect(cats).toHaveBeenCalledTimes(1);
    expect(cache.snapshot('tx')).toBe(2);
  });

  it('marks unwatched keys stale and refetches them on next subscribe, keeping old data meanwhile', async () => {
    const cache = new QueryCache();
    let n = 0;
    const fetcher = jest.fn(async () => ++n);
    const unsub = cache.subscribe('a', fetcher, ['transactions'], () => {});
    await flush();
    unsub();
    cache.invalidate(['transactions']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    cache.subscribe('a', fetcher, ['transactions'], () => {});
    expect(cache.snapshot('a')).toBe(1); // shown instantly
    await flush();
    expect(cache.snapshot('a')).toBe(2);
  });

  it('runs again when invalidated during a fetch', async () => {
    const cache = new QueryCache();
    let n = 0;
    let release!: () => void;
    const fetcher = jest.fn(() => {
      n += 1;
      const value = n;
      return n === 1 ? new Promise<number>((r) => (release = () => r(value))) : Promise.resolve(value);
    });
    cache.subscribe('a', fetcher, ['transactions'], () => {});
    cache.invalidate(['transactions']); // while first fetch is running
    release();
    await flush();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cache.snapshot('a')).toBe(2);
  });

  it('prefetch loads without subscribing', async () => {
    const cache = new QueryCache();
    const fetcher = jest.fn(async () => 'x');
    await cache.prefetch('a', fetcher, ['transactions']);
    await cache.prefetch('a', fetcher, ['transactions']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.snapshot('a')).toBe('x');
  });

  it('drops the oldest idle entries beyond the limit', async () => {
    const cache = new QueryCache(2);
    for (const k of ['a', 'b', 'c', 'd']) {
      const unsub = cache.subscribe(k, async () => k, ['transactions'], () => {});
      await flush();
      unsub();
    }
    expect(cache.size).toBe(2);
    expect(cache.snapshot('a')).toBeUndefined();
    expect(cache.snapshot('d')).toBe('d');
  });

  it('keeps the error for a failed load', async () => {
    const cache = new QueryCache();
    cache.subscribe('a', async () => Promise.reject(new Error('boom')), ['transactions'], () => {});
    await flush();
    expect(cache.snapshot('a')).toBeUndefined();
    expect(cache.error('a')?.message).toBe('boom');
  });
});
