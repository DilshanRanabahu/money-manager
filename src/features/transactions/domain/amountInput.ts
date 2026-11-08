import { groupDigits } from '@/shared/lib/money';

/**
 * Logic for the custom number pad. The input is kept as a raw string like "1250.5".
 * `applyKey` returns the next string, or null when the key is not allowed (UI shakes).
 */

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

export const MAX_INTEGER_DIGITS = 9;
export const MAX_DECIMALS = 2;

export function applyKey(current: string, key: PadKey): string | null {
  if (key === 'back') {
    return current.length > 0 ? current.slice(0, -1) : null;
  }

  const [whole, frac] = current.split('.');
  const hasDot = current.includes('.');

  if (key === '.') {
    if (hasDot) return null;
    return current === '' ? '0.' : current + '.';
  }

  // digit
  if (hasDot) {
    if ((frac ?? '').length >= MAX_DECIMALS) return null;
    return current + key;
  }
  if (whole === '0') return key === '0' ? null : key; // no leading zeros
  if (whole.length >= MAX_INTEGER_DIGITS) return null;
  return current + key;
}

/** "1250.5" -> "1,250.5" for live display while typing. Empty -> "0". */
export function formatInput(raw: string): string {
  if (raw === '') return '0';
  const [whole, frac] = raw.split('.');
  const grouped = groupDigits(whole === '' ? '0' : whole);
  return raw.includes('.') ? `${grouped}.${frac ?? ''}` : grouped;
}

/** Minor units -> raw input string (for editing an existing amount). 125050 -> "1250.5" */
export function minorToInput(minor: number): string {
  const whole = Math.floor(minor / 100);
  const cents = minor % 100;
  if (cents === 0) return String(whole);
  const frac = cents < 10 ? `0${cents}` : String(cents);
  return `${whole}.${frac.replace(/0$/, '')}`;
}
