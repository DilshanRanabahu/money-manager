/**
 * What to do with the database files on start. Pure, so every case is tested.
 *
 * - `money.db`         the old, unencrypted database (removed after migration)
 * - `money-secure.db`  the SQLCipher database, keyed with a random key in expo-secure-store
 */
export type StorageState = {
  /** SQLCipher is compiled in (false in Expo Go). */
  cipherAvailable: boolean;
  plainExists: boolean;
  secureExists: boolean;
  hasKey: boolean;
};

export type OpenPlan =
  /** Expo Go: keep using the plain database. */
  | 'plain'
  /** Copy the plain database into a new encrypted one (redo if a previous try was cut off). */
  | 'migrate'
  | 'open'
  /** First start: new encrypted database. */
  | 'create'
  /** Encrypted file but no key (e.g. restored onto another phone): cannot be read. */
  | 'lost-key'
  /** Encrypted file but this build has no SQLCipher. */
  | 'unsupported';

export function planOpen(s: StorageState): OpenPlan {
  if (!s.cipherAvailable) return s.secureExists && !s.plainExists ? 'unsupported' : 'plain';
  // The plain file is the source of truth until migration finished and deleted it.
  if (s.plainExists) return 'migrate';
  if (s.secureExists) return s.hasKey ? 'open' : 'lost-key';
  return 'create';
}

/** 32 random bytes -> SQLCipher raw key literal (skips the slow passphrase KDF). */
export function keyPragmaValue(hex: string): string {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('Invalid database key');
  return `"x'${hex}'"`;
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}
