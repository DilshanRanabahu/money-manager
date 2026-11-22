import type Anthropic from '@anthropic-ai/sdk';

import { aiUsageRepo, type AiUsageRow } from '@/db/repositories/aiUsageRepo';
import { monthRange, type ISODate, type MonthKey } from '@/shared/lib/dates';
import { costNano, summarize, type ModelUsage, type UsageSummary } from '../domain/usage';

function toModelUsage(r: AiUsageRow): ModelUsage {
  return {
    model: r.model,
    questions: r.questions,
    requests: r.requests,
    input: r.input_tokens,
    output: r.output_tokens,
    cacheWrite: r.cache_write_tokens,
    cacheRead: r.cache_read_tokens,
  };
}

/**
 * Add one API call to the day's totals. `firstCall` marks the first call of a question,
 * so questions are counted once even when tools need several calls.
 */
export function recordUsage(day: ISODate, model: string, usage: Anthropic.Usage, firstCall: boolean): Promise<void> {
  return aiUsageRepo.add({
    day,
    model,
    questions: firstCall ? 1 : 0,
    requests: 1,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_tokens: usage.cache_read_input_tokens ?? 0,
  });
}

/** Usage and cost for one month, all models together. */
export async function monthUsage(month: MonthKey): Promise<UsageSummary> {
  const { start, end } = monthRange(month);
  const rows = await aiUsageRepo.between(start, end);
  return summarize(rows.map(toModelUsage));
}

/** Cost per day (nano-dollars) from `from` on, for the chat history list. */
export async function costByDay(from: ISODate): Promise<Map<string, number>> {
  const rows = await aiUsageRepo.since(from);
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + costNano(r.model, toModelUsage(r)));
  return byDay;
}
