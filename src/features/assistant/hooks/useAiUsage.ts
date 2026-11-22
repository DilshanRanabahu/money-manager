import { useQuery } from '@/db/useQuery';
import type { MonthKey } from '@/shared/lib/dates';
import { monthUsage } from '../services/usage';

const TABLES = ['ai_usage'] as const;

/** Ask Money tokens and cost for a month. */
export function useAiUsage(month: MonthKey) {
  return useQuery(`ai_usage:month:${month}`, () => monthUsage(month), TABLES);
}
