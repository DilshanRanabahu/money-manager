import { costNano, formatTokens, savedNano, summarize, type TokenUsage } from './usage';

const u = (p: Partial<TokenUsage>): TokenUsage => ({ input: 0, output: 0, cacheWrite: 0, cacheRead: 0, ...p });

describe('costNano', () => {
  it('prices Haiku 5.5 per million tokens', () => {
    // $0.10 in, $0.50 out per MTok
    expect(costNano('claude-haiku-5-5', u({ input: 1_000_000 }))).toBe(100_000_000); // $0.10
    expect(costNano('claude-haiku-5-5', u({ output: 1_000_000 }))).toBe(500_000_000); // $0.50
  });

  it('prices cache writes at 1.25x and reads at 0.1x input on Haiku', () => {
    expect(costNano('claude-haiku-5-5', u({ cacheWrite: 1_000_000 }))).toBe(125_000_000);
    expect(costNano('claude-haiku-5-5', u({ cacheRead: 1_000_000 }))).toBe(10_000_000);
  });

  it('prices Opus 5.5 with $0.20 cache reads', () => {
    const c = costNano('claude-opus-5-5', u({ input: 1_000, output: 500, cacheWrite: 2_000, cacheRead: 10_000 }));
    // 1000*4000 + 500*20000 + 2000*5000 + 10000*200
    expect(c).toBe(4_000_000 + 10_000_000 + 10_000_000 + 2_000_000);
  });

  it('counts unknown models as free rather than guessing', () => {
    expect(costNano('some-other-model', u({ input: 5_000 }))).toBe(0);
  });
});

describe('savedNano', () => {
  it('is what cached tokens would have cost at the normal input price, minus what they cost', () => {
    // 10K read: 10000*100 - 10000*10 = 900,000; 2K written: 2000*100 - 2000*125 = -50,000
    expect(savedNano('claude-haiku-5-5', u({ cacheRead: 10_000, cacheWrite: 2_000 }))).toBe(850_000);
  });

  it('is zero without caching', () => {
    expect(savedNano('claude-haiku-5-5', u({ input: 3_000, output: 200 }))).toBe(0);
  });
});

describe('summarize', () => {
  it('adds rows of different models', () => {
    const s = summarize([
      { model: 'claude-haiku-5-5', questions: 2, requests: 5, input: 1_000, output: 100, cacheWrite: 0, cacheRead: 0 },
      { model: 'claude-opus-5-5', questions: 1, requests: 2, input: 1_000, output: 0, cacheWrite: 0, cacheRead: 0 },
    ]);
    expect(s.totals).toMatchObject({ questions: 3, requests: 7, input: 2_000, output: 100 });
    expect(s.cost).toBe(1_000 * 100 + 100 * 500 + 1_000 * 4_000);
    expect(s.saved).toBe(0);
  });

  it('is empty for no rows', () => {
    expect(summarize([])).toEqual({
      totals: { questions: 0, requests: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
      cost: 0,
      saved: 0,
    });
  });
});

describe('formatTokens', () => {
  it('shortens large counts', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(12_430)).toBe('12.4K');
    expect(formatTokens(2_000)).toBe('2K');
    expect(formatTokens(1_250_000)).toBe('1.3M');
  });
});
