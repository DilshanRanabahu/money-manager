/**
 * The small bit of markdown the assistant uses, turned into blocks the chat can style:
 * paragraphs, "- " bullets, "1." numbered items, **bold**, and rupee amounts
 * (bold; green when signed "+", red when signed "−"/"-").
 */

export type Tone = 'income' | 'expense';
export type Span = { text: string; bold?: boolean; tone?: Tone };
export type Block =
  | { kind: 'p'; spans: Span[] }
  | { kind: 'bullet'; spans: Span[] }
  | { kind: 'number'; n: string; spans: Span[] }
  | { kind: 'gap' };

const AMOUNT = /([+−-]\s?Rs\.?\s?[\d,]+(?:\.\d{1,2})?|Rs\.?\s?[+−-]?[\d,]+(?:\.\d{1,2})?)/g;

function toneOf(amount: string): Tone | undefined {
  const sign = amount.replace(/Rs\.?\s?/, '').trim()[0];
  if (sign === '+') return 'income';
  if (sign === '−' || sign === '-') return 'expense';
  return undefined;
}

function amountSpans(text: string, bold: boolean): Span[] {
  const out: Span[] = [];
  for (const part of text.split(AMOUNT)) {
    if (!part) continue;
    if (AMOUNT.test(part)) {
      AMOUNT.lastIndex = 0;
      out.push({ text: part, bold: true, tone: toneOf(part) });
    } else {
      out.push(bold ? { text: part, bold } : { text: part });
    }
  }
  return out;
}

export function inlineSpans(text: string): Span[] {
  const clean = text.replace(/`/g, '');
  const out: Span[] = [];
  for (const part of clean.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    const bold = part.length > 4 && part.startsWith('**') && part.endsWith('**');
    out.push(...amountSpans(bold ? part.slice(2, -2) : part, bold));
  }
  return out;
}

export function parseRich(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/^#+\s*/, '').trimEnd();
    if (!line.trim()) {
      if (blocks.length && blocks[blocks.length - 1].kind !== 'gap') blocks.push({ kind: 'gap' });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d{1,2})[.)]\s+(.*)$/.exec(line);
    if (bullet) blocks.push({ kind: 'bullet', spans: inlineSpans(bullet[1]) });
    else if (numbered) blocks.push({ kind: 'number', n: numbered[1], spans: inlineSpans(numbered[2]) });
    else blocks.push({ kind: 'p', spans: inlineSpans(line.trim()) });
  }
  while (blocks.length && blocks[blocks.length - 1].kind === 'gap') blocks.pop();
  return blocks;
}
