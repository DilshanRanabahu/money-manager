import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';

import { formatMonth, monthOf, type ISODate } from '@/shared/lib/dates';
import { CURRENCY_SYMBOL } from '@/shared/lib/money';
import { runTool, TOOL_DEFINITIONS, type AssistantData, type Card, type ConfirmFn } from './tools';

export type AssistantModel = 'claude-haiku-5-5' | 'claude-opus-5-5';
export const DEFAULT_MODEL: AssistantModel = 'claude-haiku-5-5';

/** Messages in one chat before we ask for a fresh one (keeps cost per question bounded). */
export const MAX_HISTORY = 60;

/** Max model calls in one user turn (each tool round is one call). */
const MAX_STEPS = 8;

export function makeClient(apiKey: string) {
  return new Anthropic({
    apiKey,
    // Pinned so nothing (env vars, config) can send the key elsewhere.
    baseURL: 'https://api.anthropic.com',
    // Never log requests; debug logs would include message contents.
    logLevel: 'off',
    // React Native's built-in fetch can't stream; expo/fetch can.
    fetch: expoFetch as unknown as typeof fetch,
    // Not a browser, but the SDK can't tell. The key is the user's own, kept in secure storage.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

function systemPrompt(today: ISODate) {
  return `You are "Ask Money", the assistant inside a personal money tracker app on the user's phone.
Today is ${today} (current month ${monthOf(today)}, ${formatMonth(monthOf(today))}). Currency is Sri Lankan rupees, written "${CURRENCY_SYMBOL} 1,250.00".

Use the tools to read the user's real data; never guess numbers. Months without data simply have no entries.
"Carry-over" is what was left from earlier months; it is already part of a month's income (or expense if negative).

Questions about past money ("how much", "kiyada", "kiyak", "keeyada giye", "kohenda") are questions: answer them with the read tools (search_entries with a text like "bus", or get_breakdown). Only add an entry when the user states an amount they spent or received.
When the user tells you about spending or income, add it with add_entries (call list_categories first to pick the best category; default date is today). Put everything from one message into ONE add_entries call ("lunch 850, bus 160" is two entries on one card). The app asks the user to confirm, so just call the tool; afterwards say briefly what was saved or declined.
To fix or remove an entry ("the bus was 180 not 160", "delete yesterday's KFC"), find it with search_entries (narrow by text and date), then call update_entry or delete_entry with its id. If several entries match and it's unclear which one, ask. Never guess an id.
A write tool only returns after the user tapped the card, so its result is final: "Saved"/"Updated"/"Deleted" means it is already done (say it in the past tense, briefly), and "declined" means nothing changed. Never ask the user to confirm again.
When the user sends a photo of a receipt or bill: read the shop name, date and amounts. Usually add ONE entry for the total (note: shop name); only split into items if the user asks. Use the receipt's date if it is readable and not in the future, else today. If the photo isn't a receipt or can't be read, say so briefly and add nothing.
If the user asks for a new category, call add_category right away (pick a fitting icon); the confirm card lets them decline, so don't ask first. When adding an entry and no existing category fits, you may also propose one with add_category, then use its id.

The user may write in English, Sinhala, or Singlish (Sinhala in English letters). Reply in the same style they use.
The app shows the results of get_month_summary, get_breakdown and search_entries to the user as cards (totals, category bars, entry rows). Don't repeat those numbers as lists; say what they mean.
Lead with a one-sentence answer, then at most 3 short bullets of insight (biggest change, something to watch), each one line. Mention an amount only when it is the point; don't count entries.
This is a small phone screen: plain short lines, simple "- " bullets if needed, no tables, no headings, no code formatting. Use **bold** sparingly for the key fact. An emoji is fine occasionally.
You can give practical budgeting suggestions based on their data, but you are not a licensed financial advisor.`;
}

export type StepEvents = {
  onText(delta: string): void;
  /** A new assistant message starts (after tool calls). */
  onNewBlock(): void;
  onToolStart(name: string): void;
  /** A tool finished; `card` is what the chat shows for it, if anything. */
  onToolDone(name: string, input: unknown, ok: boolean, card?: Card): void;
};

export class ChatError extends Error {}

export function describeError(e: unknown): string {
  if (e instanceof ChatError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'The API key was rejected. Check it in Settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use the model.';
  if (e instanceof Anthropic.RateLimitError) return 'Too many requests right now. Try again in a minute.';
  if (e instanceof Anthropic.APIConnectionError) return 'No connection. Check your internet and try again.';
  if (e instanceof Anthropic.APIError) {
    if (e.status === 529 || e.status === 503) return 'Claude is busy right now. Try again shortly.';
    if (e.status === 400 && /credit|billing/i.test(e.message)) return 'Your Anthropic account is out of credit.';
    return `Something went wrong (${e.status ?? 'error'}).`;
  }
  return 'Something went wrong.';
}

/**
 * Run one user turn: call the model, run any tools it asks for, repeat until it answers.
 * `history` is mutated in place: assistant content is kept exactly as returned, since
 * thinking blocks must be replayed unchanged.
 */
export async function runTurn(opts: {
  client: Anthropic;
  model: AssistantModel;
  history: Anthropic.MessageParam[];
  data: AssistantData;
  confirm: ConfirmFn;
  events: StepEvents;
  signal: AbortSignal;
}): Promise<void> {
  const { client, model, history, data, confirm, events, signal } = opts;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (step > 0) events.onNewBlock();
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 8000,
        system: [{ type: 'text', text: systemPrompt(data.today()), cache_control: { type: 'ephemeral' } }],
        tools: TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
        messages: history,
      },
      { signal },
    );
    stream.on('text', events.onText);
    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') throw new ChatError("Claude can't help with that one.");

    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    history.push({ role: 'assistant', content: message.content });

    if (message.stop_reason === 'pause_turn') continue;
    if (toolUses.length === 0) return;
    if (message.stop_reason === 'max_tokens') throw new ChatError('The answer got too long. Try a narrower question.');

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      events.onToolStart(use.name);
      let outcome: Awaited<ReturnType<typeof runTool>>;
      try {
        outcome = await runTool(use.name, use.input, data, confirm);
      } catch {
        outcome = { ok: false, content: 'The app could not read its data.' };
      }
      events.onToolDone(use.name, use.input, outcome.ok, outcome.card);
      results.push({ type: 'tool_result', tool_use_id: use.id, content: outcome.content, is_error: !outcome.ok });
    }
    history.push({ role: 'user', content: results });
  }
  throw new ChatError('That took too many steps. Try asking more simply.');
}

/** Cheap check that a key works: list one model. */
export async function testKey(apiKey: string): Promise<string | null> {
  try {
    await makeClient(apiKey).models.list({ limit: 1 });
    return null;
  } catch (e) {
    return describeError(e);
  }
}
