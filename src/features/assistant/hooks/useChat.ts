import type Anthropic from '@anthropic-ai/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import { haptics } from '@/shared/lib/haptics';
import { newId } from '@/shared/lib/id';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { loadApiKey } from '../services/apiKey';
import { describeError, makeClient, MAX_HISTORY, runTurn } from '../services/chatEngine';
import { assistantData } from '../services/data';
import type { Card, Proposal } from '../services/tools';
import { toolLabel } from '../services/toolLabel';

export type ProposalStatus = 'pending' | 'saved' | 'declined';

export type ChatItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'proposal'; proposal: Proposal; status: ProposalStatus }
  | { id: string; kind: 'error'; text: string }
  /** What a tool looked at, with its card (real numbers from the phone). */
  | { id: string; kind: 'tool'; label: string; ok: boolean; card?: Card };

/** Shown next to the typing dots while a tool runs. */
const TOOL_ACTIVITY: Record<string, string> = {
  get_month_summary: 'Checking the month',
  get_breakdown: 'Looking at categories',
  search_entries: 'Searching entries',
  list_categories: 'Reading categories',
  add_entry: 'Waiting for you to confirm',
  add_category: 'Waiting for you to confirm',
};

const nextId = newId;

/**
 * One chat session, kept in memory only: leaving the screen ends it.
 * Nothing from the chat is written to the database except entries the user confirms.
 */
export function useChat() {
  const model = useSettingsStore((s) => s.assistantModel);
  const enabled = useSettingsStore((s) => s.assistant);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);

  const history = useRef<Anthropic.MessageParam[]>([]);
  const abort = useRef<AbortController | null>(null);
  const waiting = useRef(new Map<string, (ok: boolean) => void>());

  useEffect(() => {
    const pending = waiting.current;
    return () => {
      abort.current?.abort();
      for (const resolve of pending.values()) resolve(false);
      pending.clear();
    };
  }, []);

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

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
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

      setItems((list) => [...list, { id: nextId(), kind: 'user', text }]);
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
      history.current.push({ role: 'user', content: text });
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
    [busy, enabled, model, patch],
  );

  return { items, busy, activity, send, respond };
}
