import type { ISODate } from '@/shared/lib/dates';
import type { Card, Proposal } from '../services/tools';

/** `expired`: a card from an earlier visit that was never answered (it can't be answered now). */
export type ProposalStatus = 'pending' | 'saved' | 'declined' | 'undone' | 'expired';

/** A photo attached to a message (already resized, JPEG). */
export type Attachment = { uri: string; base64: string };

export type ChatItem =
  | { id: string; kind: 'user'; text: string; imageUri?: string }
  | { id: string; kind: 'assistant'; text: string }
  /** `past`: loaded from history, so actions like Undo are no longer offered. */
  | { id: string; kind: 'proposal'; proposal: Proposal; status: ProposalStatus; past?: boolean }
  | { id: string; kind: 'error'; text: string }
  /** What a tool looked at, with its card (real numbers from the phone). */
  | { id: string; kind: 'tool'; label: string; ok: boolean; card?: Card }
  /** Separates today's earlier messages (Claude doesn't see them) from the new ones. Not saved. */
  | { id: string; kind: 'divider'; text: string };

/** A day in the history list. */
export type ChatDay = {
  day: ISODate;
  messages: number;
  photos: number;
  /** First thing the user asked that day. */
  preview: string;
  /** What that day's chat cost on the API key, in nano-dollars (0 if nothing was recorded). */
  cost: number;
};
