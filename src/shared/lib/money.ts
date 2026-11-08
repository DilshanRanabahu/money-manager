/**
 * Money is always an integer number of minor units (cents).
 * Rs. 1,250.50 === 125050. Never use floats for money.
 *
 * Functions marked 'worklet' can also run on the UI thread (AnimatedNumber).
 */

export const CURRENCY_SYMBOL = 'Rs.';

/** Largest amount we accept: 999,999,999.99 */
export const MAX_AMOUNT = 99_999_999_999;

/** Parse user text ("1,250.50") into minor units. Returns null if invalid or not > 0. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > MAX_AMOUNT) return null;
  return minor;
}

/** Insert thousands separators into a string of digits. */
export function groupDigits(digits: string): string {
  'worklet';
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ',';
  }
  return out;
}

/** 125050 -> "1,250.50" */
export function formatNumber(minor: number): string {
  'worklet';
  const rounded = Math.round(Math.abs(minor));
  const whole = Math.floor(rounded / 100);
  const cents = rounded % 100;
  const sign = minor < 0 && rounded !== 0 ? '-' : '';
  return sign + groupDigits(String(whole)) + '.' + (cents < 10 ? '0' : '') + String(cents);
}

export type FormatOptions = {
  /** Prefix "+" for positive values and "−" for negative values. */
  signed?: boolean;
  /** Hide the currency symbol. */
  bare?: boolean;
  /** Round to whole rupees and drop the cents (for estimates and averages). */
  whole?: boolean;
};

/** 125050 -> "Rs. 1,250.50" (with `whole`: "Rs. 1,251") */
export function formatAmount(minor: number, options: FormatOptions = {}): string {
  'worklet';
  const body = options.whole
    ? groupDigits(String(Math.round(Math.abs(minor) / 100)))
    : formatNumber(Math.abs(minor));
  const symbol = options.bare ? '' : CURRENCY_SYMBOL + ' ';
  let sign = '';
  if (minor < 0) sign = '−';
  else if (options.signed && minor > 0) sign = '+';
  return sign + symbol + body;
}

/** Short form for tight spaces: 12500000 -> "Rs. 125K" */
export function formatAmountCompact(minor: number): string {
  const value = Math.abs(minor) / 100;
  const sign = minor < 0 ? '−' : '';
  const units: [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (value >= size) {
      const n = value / size;
      const text = n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '');
      return `${sign}${CURRENCY_SYMBOL} ${text}${suffix}`;
    }
  }
  return `${sign}${CURRENCY_SYMBOL} ${Math.round(value)}`;
}

/** Spoken form for screen readers: 125050 -> "1,250 rupees 50 cents" */
export function amountForA11y(minor: number): string {
  const whole = Math.floor(Math.abs(minor) / 100);
  const cents = Math.abs(minor) % 100;
  const base = `${groupDigits(String(whole))} rupees`;
  return cents ? `${base} ${cents} cents` : base;
}
