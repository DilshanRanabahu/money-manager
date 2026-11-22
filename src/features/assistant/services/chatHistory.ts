import { chatRepo, type ChatRow } from '@/db/repositories/chatRepo';
import type { ISODate } from '@/shared/lib/dates';
import { changedMessages, chatCutoff, fromStored, previewText, savedKey } from '../domain/chatHistory';
import type { ChatDay, ChatItem } from '../domain/types';
import { costByDay } from './usage';

/**
 * Saves the chat on the phone (inside the encrypted database) and reads it back.
 * Writes run one after another so a slow save never overtakes a newer one.
 */

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
};

/** Remembers what has been written for one conversation, so each save writes only changes. */
export type ChatSaver = {
  /** Mark messages loaded from the database as already written. */
  seed(items: readonly ChatItem[]): void;
  /** Attach a photo to a user message before its first save. */
  attachImage(id: string, base64: string): void;
  save(items: readonly ChatItem[]): Promise<void>;
};

export function createChatSaver(day: ISODate, now: () => number = Date.now): ChatSaver {
  const saved = new Map<string, string>();
  const images = new Map<string, string>();

  return {
    seed(items) {
      for (const m of changedMessages(items, new Map())) saved.set(m.id, savedKey(m.seq, m.payload));
    },
    attachImage(id, base64) {
      images.set(id, base64);
    },
    save(items) {
      const changes = changedMessages(items, saved);
      if (changes.length === 0) return Promise.resolve();
      const rows: ChatRow[] = changes.map((m) => ({
        id: m.id,
        day,
        seq: m.seq,
        kind: m.kind,
        payload: m.payload,
        image: images.get(m.id) ?? null,
        created_at: now(),
      }));
      return serial(async () => {
        await chatRepo.save(rows);
        for (const r of rows) {
          saved.set(r.id, savedKey(r.seq, r.payload));
          images.delete(r.id);
        }
      });
    },
  };
}

/** A day's conversation, oldest message first. */
export async function loadChatDay(day: ISODate): Promise<ChatItem[]> {
  const rows = await chatRepo.findByDay(day);
  return rows.map((r) => fromStored(r)).filter((i): i is ChatItem => i !== null);
}

/** Days that have a chat, newest first (within the kept 90 days). */
export async function listChatDays(today: ISODate): Promise<ChatDay[]> {
  const from = chatCutoff(today);
  const [rows, costs] = await Promise.all([chatRepo.listDays(from), costByDay(from)]);
  return rows.map((r) => ({
    day: r.day,
    messages: r.messages,
    photos: r.photos ?? 0,
    preview: previewText(r.first_user, r.photos ?? 0),
    cost: costs.get(r.day) ?? 0,
  }));
}

export function deleteChatDay(day: ISODate): Promise<void> {
  return serial(() => chatRepo.deleteDay(day));
}

/** Drop chats older than 90 days (run at app start). */
export function purgeOldChats(today: ISODate): Promise<void> {
  return serial(() => chatRepo.purgeBefore(chatCutoff(today)));
}
