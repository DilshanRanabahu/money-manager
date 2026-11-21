import { addDays, type ISODate } from '@/shared/lib/dates';
import type { ChatItem } from './types';

/**
 * Chat history: one conversation per day, kept on the phone for 90 days.
 * Saved messages are a read-only snapshot; Claude never sees earlier conversations.
 */

/** Days of chat kept, today included. */
export const CHAT_KEEP_DAYS = 90;

/** Oldest day still kept. */
export function chatCutoff(today: ISODate): ISODate {
  return addDays(today, -(CHAT_KEEP_DAYS - 1));
}

const SAVED_KINDS = new Set<ChatItem['kind']>(['user', 'assistant', 'tool', 'proposal']);

/** Errors and dividers are only for the current visit. */
export function isSaved(item: ChatItem): boolean {
  if (!SAVED_KINDS.has(item.kind)) return false;
  if (item.kind === 'assistant') return item.text.trim().length > 0;
  return true;
}

/** JSON for the `payload` column: the item without id (and without the photo, stored apart). */
export function toPayload(item: ChatItem): string {
  const { id: _id, ...rest } = item;
  if (rest.kind === 'user') {
    const { imageUri: _uri, ...user } = rest;
    return JSON.stringify(user);
  }
  return JSON.stringify(rest);
}

/** Turn a stored message back into a chat item. Unanswered cards become expired. */
export function fromStored(m: { id: string; kind: string; payload: string; image: string | null }): ChatItem | null {
  let data: unknown;
  try {
    data = JSON.parse(m.payload);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || (data as { kind?: unknown }).kind !== m.kind) return null;
  const item = { ...(data as object), id: m.id } as ChatItem;
  if (!SAVED_KINDS.has(item.kind)) return null;

  if (item.kind === 'user') {
    return m.image ? { ...item, imageUri: `data:image/jpeg;base64,${m.image}` } : item;
  }
  if (item.kind === 'proposal') {
    return { ...item, status: item.status === 'pending' ? 'expired' : item.status, past: true };
  }
  return item;
}

/** Key used in the `saved` map of `changedMessages`. */
export const savedKey = (seq: number, payload: string) => `${seq}:${payload}`;

/** What needs writing: messages that are new or changed since the last save. */
export function changedMessages(
  items: readonly ChatItem[],
  saved: ReadonlyMap<string, string>,
): { id: string; seq: number; kind: ChatItem['kind']; payload: string }[] {
  const out: { id: string; seq: number; kind: ChatItem['kind']; payload: string }[] = [];
  let seq = 0;
  for (const item of items) {
    if (!isSaved(item)) continue;
    const payload = toPayload(item);
    if (saved.get(item.id) !== savedKey(seq, payload)) out.push({ id: item.id, seq, kind: item.kind, payload });
    seq++;
  }
  return out;
}

/** Short line for the history list: the day's first question, or a photo label. */
export function previewText(firstUserPayload: string | null, photos: number): string {
  if (firstUserPayload) {
    try {
      const data = JSON.parse(firstUserPayload) as { text?: unknown };
      if (typeof data.text === 'string' && data.text.trim()) return data.text.trim().replace(/\s+/g, ' ');
    } catch {
      // fall through
    }
  }
  return photos > 0 ? 'Receipt photo' : 'Chat';
}
