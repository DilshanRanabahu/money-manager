/**
 * Ask Money token usage and what it cost, from the API's `usage` numbers. Pure, tested.
 *
 * Costs are integers in nano-dollars (1e-9 USD) so the sums stay exact.
 */

/** Tokens of one API call (or a sum of calls). */
export type TokenUsage = {
  /** Uncached input (full price). */
  input: number;
  output: number;
  /** Input written to the prompt cache (1.25x input price, 5-minute TTL). */
  cacheWrite: number;
  /** Input read from the prompt cache (much cheaper). */
  cacheRead: number;
};

export type UsageTotals = TokenUsage & {
  /** Questions the user sent. */
  questions: number;
  /** API calls (one question can take several when tools run). */
  requests: number;
};

export const EMPTY_USAGE: UsageTotals = { questions: 0, requests: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };

/**
 * Anthropic list prices in thousandths of a dollar per million tokens
 * (so the cost of one token comes out in nano-dollars).
 * Haiku 5.5 prices are for prompts up to 100K tokens; Ask Money's prompts stay far below that.
 */
const PRICES: Record<string, TokenUsage> = {
  'claude-haiku-5-5': { input: 100, output: 500, cacheWrite: 125, cacheRead: 10 },
  'claude-opus-5-5': { input: 4_000, output: 20_000, cacheWrite: 5_000, cacheRead: 200 },
};

export function isPricedModel(model: string): boolean {
  return model in PRICES;
}

/** What these tokens cost, in nano-dollars. Unknown models count as 0. */
export function costNano(model: string, u: TokenUsage): number {
  const p = PRICES[model];
  if (!p) return 0;
  return u.input * p.input + u.output * p.output + u.cacheWrite * p.cacheWrite + u.cacheRead * p.cacheRead;
}

/** How much less this cost than with no prompt caching (cached tokens at the normal input price). */
export function savedNano(model: string, u: TokenUsage): number {
  const p = PRICES[model];
  if (!p) return 0;
  const withoutCache = (u.cacheWrite + u.cacheRead) * p.input;
  const withCache = u.cacheWrite * p.cacheWrite + u.cacheRead * p.cacheRead;
  return withoutCache - withCache;
}

export function addUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    questions: a.questions + b.questions,
    requests: a.requests + b.requests,
    input: a.input + b.input,
    output: a.output + b.output,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    cacheRead: a.cacheRead + b.cacheRead,
  };
}

/** All input + output tokens. */
export function totalTokens(u: TokenUsage): number {
  return u.input + u.output + u.cacheWrite + u.cacheRead;
}

export type ModelUsage = UsageTotals & { model: string };

export type UsageSummary = {
  totals: UsageTotals;
  cost: number;
  saved: number;
};

/** Add up usage rows (one per model). */
export function summarize(rows: readonly ModelUsage[]): UsageSummary {
  return rows.reduce<UsageSummary>(
    (acc, r) => ({
      totals: addUsage(acc.totals, r),
      cost: acc.cost + costNano(r.model, r),
      saved: acc.saved + savedNano(r.model, r),
    }),
    { totals: EMPTY_USAGE, cost: 0, saved: 0 },
  );
}

/** "12.4K tokens" style count. */
export function formatTokens(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(Math.round(n / 100) / 10).toString()}K`;
  return `${(Math.round(n / 100_000) / 10).toString()}M`;
}
