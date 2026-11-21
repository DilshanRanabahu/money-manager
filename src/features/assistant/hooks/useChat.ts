import type Anthropic from '@anthropic-ai/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import { haptics } from '@/shared/lib/haptics';
import { newId } from '@/shared/lib/id';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useUiStore } from '@/shared/store/uiStore';
import type { Attachment, ChatItem } from '../domain/types';
import { loadApiKey } from '../services/apiKey';
import { describeError, makeClient, MAX_HISTORY, runTurn } from '../services/chatEngine';
import { createChatSaver, loadChatDay } from '../services/chatHistory';
import { assistantData, restoreEntry } from '../services/data';
import { toolLabel } from '../services/toolLabel';

export type { Attachment, ChatItem, ProposalStatus } from '../domain/types';

/** Shown next to the typing dots while a tool runs. */
const TOOL_ACTIVITY: Record<string, string> = {
  get_month_summary: 'Checking the month',
  get_breakdown: 'Looking at categories',
  search_entries: 'Searching entries',
  list_categories: 'Reading categories',
  add_entries: 'Waiting for you to confirm',
  update_entry: 'Waiting for you to confirm',
  delete_entry: 'Waiting for you to confirm',
  add_category: 'Waiting for you to confirm',
};

const nextId = newId;

/** Wait this long after the last change before saving (streaming text changes often). */
const SAVE_DELAY_MS = 400;

/**
 * Today's chat. Messages are saved on the phone (one conversation per day) and shown again
 * when the chat is reopened, but Claude only sees what was said since the screen opened:
 * earlier messages are a read-only snapshot above a divider.
 */
export function useChat() {
  const model = useSettingsStore((s) => s.assistantModel);
  const enabled = useSettingsStore((s) => s.assistant);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);

  const history = useRef<Anthropic.MessageParam[]>([]);
  const abort = useRef<AbortController | null>(null);
  const waiting = useRef(new Map<string, (ok: boolean) => void>());

  // The conversation belongs to the day it was opened, even if it runs past midnight.
  const [day] = useState(() => useUiStore.getState().today);
  const [saver] = useState(() => createChatSaver(day));
  const latest = useRef<ChatItem[]>([]);

  useEffect(() => {
    const pending = waiting.current;
    return () => {
      abort.current?.abort();
      for (const resolve of pending.values()) resolve(false);
      pending.clear();
    };
  }, []);

  // Show what was said earlier today. Claude starts fresh below the divider.
  useEffect(() => {
    let cancelled = false;
    loadChatDay(day)
      .then((earlier) => {
        if (cancelled) return;
        saver.seed(earlier);
        if (earlier.length > 0) {
          setItems((list) => [
            ...earlier,
            { id: nextId(), kind: 'divider', text: "New conversation · Claude doesn't see the messages above" },
            ...list,
          ]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [day, saver]);

  // Save changes shortly after they happen, and right away when the screen closes.
  useEffect(() => {
    latest.current = items;
    if (!loaded) return;
    const timer = setTimeout(() => void saver.save(items).catch(() => {}), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items, loaded, saver]);

  useEffect(
    () => () => {
      void saver.save(latest.current).catch(() => {});
    },
    [saver],
  );

  const patch = useCallback((id: string, fn: (item: ChatItem) => ChatItem) => {
    setItems((list) => list.map((i) => (i.id === id ? fn(i) : i)));
  }, []);

  /** Answer a confirm card. */
  const respond = useCallback(
    (id: string, accept: boolean) => {
      const resolve = waiting.current.get(id);
      if (!resolve) return;
      waiting.current.delete(id);
      if (accept) haptics.success();
      patch(id, (i) => (i.kind === 'proposal' ? { ...i, status: accept ? 'saved' : 'declined' } : i));
      resolve(accept);
    },
    [patch],
  );

  /** Undo a delete confirmed in this chat. */
  const undo = useCallback(
    async (id: string, entryId: string) => {
      await restoreEntry(entryId);
      haptics.light();
      patch(id, (i) => (i.kind === 'proposal' ? { ...i, status: 'undone' } : i));
    },
    [patch],
  );

  const send = useCallback(
    async (raw: string, image?: Attachment) => {
      const text = raw.trim() || (image ? 'Add this receipt.' : '');
      if (!text || busy) return;
      // The route can be opened by a deep link even when the feature is off.
      if (!enabled) {
        setItems((list) => [...list, { id: nextId(), kind: 'error', text: 'Ask Money is turned off in Settings.' }]);
        return;
      }
      if (history.current.length >= MAX_HISTORY) {
        setItems((list) => [
          ...list,
          { id: nextId(), kind: 'error', text: 'This chat is getting long. Go back and open Ask Money again to start fresh.' },
        ]);
        return;
      }

      const userId = nextId();
      if (image) saver.attachImage(userId, image.base64);
      setItems((list) => [...list, { id: userId, kind: 'user', text: raw.trim(), imageUri: image?.uri }]);
      setBusy(true);
      setActivity('');

      const apiKey = await loadApiKey();
      if (!apiKey) {
        setItems((list) => [...list, { id: nextId(), kind: 'error', text: 'Add your API key in Settings first.' }]);
        setBusy(false);
        setActivity(null);
        return;
      }

      const before = history.current.length;
      history.current.push({
        role: 'user',
        content: image
          ? [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.base64 } },
              { type: 'text', text },
            ]
          : text,
      });
      const controller = new AbortController();
      abort.current = controller;

      let current: string | null = null;
      const appendText = (delta: string) => {
        setActivity(null);
        if (!current) {
          const id = nextId();
          current = id;
          setItems((list) => [...list, { id, kind: 'assistant', text: delta }]);
        } else {
          const id = current;
          patch(id, (i) => (i.kind === 'assistant' ? { ...i, text: i.text + delta } : i));
        }
      };

      try {
        await runTurn({
          client: makeClient(apiKey),
          model,
          history: history.current,
          data: assistantData,
          signal: controller.signal,
          confirm: (proposal) =>
            new Promise<boolean>((resolve) => {
              const id = nextId();
              current = null;
              waiting.current.set(id, resolve);
              haptics.light();
              setItems((list) => [...list, { id, kind: 'proposal', proposal, status: 'pending' }]);
            }),
          events: {
            onText: appendText,
            onNewBlock: () => {
              current = null;
              setActivity('');
            },
            onToolStart: (name) => setActivity(TOOL_ACTIVITY[name] ?? ''),
            onToolDone: (name, input, ok, card) => {
              const label = toolLabel(name, input, assistantData.today().slice(0, 4));
              if (!label) return;
              current = null;
              setItems((list) => [...list, { id: nextId(), kind: 'tool', label, ok, card }]);
            },
          },
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        // Drop the failed turn so the conversation stays valid for the next question.
        history.current.length = before;
        haptics.warning();
        setItems((list) => [...list, { id: nextId(), kind: 'error', text: describeError(e) }]);
      } finally {
        if (!controller.signal.aborted) {
          setBusy(false);
          setActivity(null);
        }
      }
    },
    [busy, enabled, model, patch, saver],
  );

  return { items, loaded, busy, activity, send, respond, undo };
}
