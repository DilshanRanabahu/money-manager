import { changedMessages, chatCutoff, fromStored, isSaved, previewText, savedKey, toPayload } from './chatHistory';
import type { ChatItem } from './types';

const user: ChatItem = { id: 'u1', kind: 'user', text: 'Lunch 850', imageUri: 'file:///cache/a.jpg' };
const reply: ChatItem = { id: 'a1', kind: 'assistant', text: 'Added **Rs. 850.00**.' };
const proposal = (status: 'pending' | 'saved'): ChatItem => ({
  id: 'p1',
  kind: 'proposal',
  status,
  proposal: { kind: 'entries', items: [] },
});

describe('chatCutoff', () => {
  it('keeps 90 days including today', () => {
    expect(chatCutoff('2026-11-21')).toBe('2026-08-24');
  });

  it('crosses a year', () => {
    expect(chatCutoff('2027-01-10')).toBe('2026-10-13');
  });
});

describe('isSaved', () => {
  it('saves messages, tool and proposal cards', () => {
    expect(isSaved(user)).toBe(true);
    expect(isSaved(reply)).toBe(true);
    expect(isSaved(proposal('pending'))).toBe(true);
    expect(isSaved({ id: 't', kind: 'tool', label: 'Checked November', ok: true })).toBe(true);
  });

  it('skips errors, dividers and empty replies', () => {
    expect(isSaved({ id: 'e', kind: 'error', text: 'Network' })).toBe(false);
    expect(isSaved({ id: 'd', kind: 'divider', text: '' })).toBe(false);
    expect(isSaved({ id: 'a', kind: 'assistant', text: '  ' })).toBe(false);
  });
});

describe('toPayload / fromStored', () => {
  it('round-trips a reply', () => {
    const back = fromStored({ id: 'a1', kind: 'assistant', payload: toPayload(reply), image: null });
    expect(back).toEqual(reply);
  });

  it('drops the local photo uri and restores it from the stored image', () => {
    const payload = toPayload(user);
    expect(payload).not.toContain('file://');
    expect(fromStored({ id: 'u1', kind: 'user', payload, image: 'QUJD' })).toEqual({
      id: 'u1',
      kind: 'user',
      text: 'Lunch 850',
      imageUri: 'data:image/jpeg;base64,QUJD',
    });
  });

  it('marks loaded cards as past and unanswered ones as expired', () => {
    expect(fromStored({ id: 'p1', kind: 'proposal', payload: toPayload(proposal('pending')), image: null })).toMatchObject({
      status: 'expired',
      past: true,
    });
    expect(fromStored({ id: 'p1', kind: 'proposal', payload: toPayload(proposal('saved')), image: null })).toMatchObject({
      status: 'saved',
      past: true,
    });
  });

  it('rejects broken or mismatched rows', () => {
    expect(fromStored({ id: 'x', kind: 'user', payload: '{oops', image: null })).toBeNull();
    expect(fromStored({ id: 'x', kind: 'user', payload: toPayload(reply), image: null })).toBeNull();
    expect(fromStored({ id: 'x', kind: 'error', payload: '{"kind":"error","text":"x"}', image: null })).toBeNull();
  });
});

describe('changedMessages', () => {
  it('numbers saved messages in order, skipping unsaved kinds', () => {
    const items: ChatItem[] = [user, { id: 'e', kind: 'error', text: 'x' }, reply];
    expect(changedMessages(items, new Map()).map((m) => [m.id, m.seq])).toEqual([
      ['u1', 0],
      ['a1', 1],
    ]);
  });

  it('returns only new or changed messages', () => {
    const items: ChatItem[] = [user, proposal('pending')];
    const saved = new Map(changedMessages(items, new Map()).map((m) => [m.id, savedKey(m.seq, m.payload)]));
    expect(changedMessages(items, saved)).toEqual([]);

    const answered: ChatItem[] = [user, proposal('saved')];
    expect(changedMessages(answered, saved).map((m) => m.id)).toEqual(['p1']);
  });
});

describe('previewText', () => {
  it('uses the first question, on one line', () => {
    expect(previewText(toPayload({ id: 'u', kind: 'user', text: ' How much\non food? ' }), 0)).toBe('How much on food?');
  });

  it('falls back for photo-only or missing messages', () => {
    expect(previewText(toPayload({ id: 'u', kind: 'user', text: '' }), 1)).toBe('Receipt photo');
    expect(previewText(null, 0)).toBe('Chat');
  });
});
