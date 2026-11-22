import { getDb } from '../client';
import { queryCache } from '../queryCache';

export type AiUsageRow = {
  day: string;
  model: string;
  questions: number;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
};

export const aiUsageRepo = {
  /** Add one API call's tokens to that day's total for the model. */
  async add(row: AiUsageRow): Promise<void> {
    await getDb().runAsync(
      `INSERT INTO ai_usage (day, model, questions, requests, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(day, model) DO UPDATE SET
         questions = questions + excluded.questions,
         requests = requests + excluded.requests,
         input_tokens = input_tokens + excluded.input_tokens,
         output_tokens = output_tokens + excluded.output_tokens,
         cache_write_tokens = cache_write_tokens + excluded.cache_write_tokens,
         cache_read_tokens = cache_read_tokens + excluded.cache_read_tokens`,
      row.day,
      row.model,
      row.questions,
      row.requests,
      row.input_tokens,
      row.output_tokens,
      row.cache_write_tokens,
      row.cache_read_tokens,
    );
    queryCache.invalidate(['ai_usage']);
  },

  /** Rows for days in [from, to). */
  between(from: string, to: string): Promise<AiUsageRow[]> {
    return getDb().getAllAsync<AiUsageRow>('SELECT * FROM ai_usage WHERE day >= ? AND day < ? ORDER BY day', from, to);
  },

  /** Rows from `from` (inclusive) on. */
  since(from: string): Promise<AiUsageRow[]> {
    return getDb().getAllAsync<AiUsageRow>('SELECT * FROM ai_usage WHERE day >= ? ORDER BY day', from);
  },
};
