import { keyPragmaValue, planOpen, toHex, type StorageState } from './encryptionPlan';

const s = (p: Partial<StorageState>): StorageState => ({
  cipherAvailable: true,
  plainExists: false,
  secureExists: false,
  hasKey: false,
  ...p,
});

describe('planOpen', () => {
  it.each<[Partial<StorageState>, string]>([
    [{}, 'create'],
    [{ plainExists: true }, 'migrate'],
    [{ plainExists: true, secureExists: true, hasKey: true }, 'migrate'], // interrupted migration: redo
    [{ secureExists: true, hasKey: true }, 'open'],
    [{ secureExists: true }, 'lost-key'],
    [{ cipherAvailable: false }, 'plain'],
    [{ cipherAvailable: false, plainExists: true }, 'plain'],
    [{ cipherAvailable: false, secureExists: true, hasKey: true }, 'unsupported'],
  ])('%p -> %s', (state, plan) => {
    expect(planOpen(s(state))).toBe(plan);
  });
});

describe('key helpers', () => {
  it('formats a raw 256-bit key', () => {
    const hex = toHex(new Uint8Array(32).fill(171));
    expect(hex).toBe('ab'.repeat(32));
    expect(keyPragmaValue(hex)).toBe(`"x'${'ab'.repeat(32)}'"`);
  });

  it('rejects anything else', () => {
    expect(() => keyPragmaValue("ab'; DROP TABLE x; --")).toThrow();
    expect(() => keyPragmaValue('ab')).toThrow();
  });
});
