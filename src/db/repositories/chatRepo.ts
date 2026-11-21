import { getDb } from '../client';
import { queryCache } from '../queryCache';

/** Tell watching screens (chat history) that messages changed. */
const changed = () => queryCache.invalidate(['chat']);

export type ChatRow = {
  id: string;
  day: string;
  seq: number;
  kind: string;
  payload: string;
  /** JPEG base64; written once on insert, never updated. */
  image: string | null;
  created_at: number;
};

export type ChatDayRow = {
  day: string;
  messages: number;
  photos: number;
  /** Payload of the day's first user message, if any. */
  first_user: string | null;
};

export const chatRepo = {
  /** Insert new messages or update the payload/order of existing ones (the image is kept). */
  async save(rows: readonly ChatRow[]): Promise<void> {
    if (rows.length === 0) return;
    const db = getDb();
    for (const r of rows) {
      await db.runAsync(
        `INSERT INTO chat_messages (id, day, seq, kind, payload, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET seq = excluded.seq, payload = excluded.payload`,
        r.id,
        r.day,
        r.seq,
        r.kind,
        r.payload,
        r.image,
        r.created_at,
      );
    }
    changed();
  },

  findByDay(day: string): Promise<ChatRow[]> {
    return getDb().getAllAsync<ChatRow>('SELECT * FROM chat_messages WHERE day = ? ORDER BY seq', day);
  },

  /** One row per day since `from` (inclusive), newest first. Does not read images. */
  listDays(from: string): Promise<ChatDayRow[]> {
    return getDb().getAllAsync<ChatDayRow>(
      `SELECT m.day AS day,
              COUNT(*) AS messages,
              SUM(m.image IS NOT NULL) AS photos,
              (SELECT u.payload FROM chat_messages u
                WHERE u.day = m.day AND u.kind = 'user' ORDER BY u.seq LIMIT 1) AS first_user
       FROM chat_messages m
       WHERE m.day >= ?
       GROUP BY m.day
       ORDER BY m.day DESC`,
      from,
    );
  },

  async deleteDay(day: string): Promise<void> {
    await getDb().runAsync('DELETE FROM chat_messages WHERE day = ?', day);
    changed();
  },

  /** Remove every message older than `day`. */
  async purgeBefore(day: string): Promise<void> {
    await getDb().runAsync('DELETE FROM chat_messages WHERE day < ?', day);
    changed();
  },
};
