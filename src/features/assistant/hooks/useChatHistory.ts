import { useQuery } from '@/db/useQuery';
import type { ISODate } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import { listChatDays, loadChatDay } from '../services/chatHistory';

const TABLES = ['chat'] as const;

/** Days with a chat, newest first. */
export function useChatDays() {
  const today = useUiStore((s) => s.today);
  return useQuery(`chat:days:${today}`, () => listChatDays(today), TABLES);
}

/** One saved day, read-only. */
export function useChatDay(day: ISODate) {
  return useQuery(`chat:day:${day}`, () => loadChatDay(day), TABLES);
}
