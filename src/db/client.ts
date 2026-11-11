import { getRandomBytes } from 'expo-crypto';
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { keyPragmaValue, planOpen, toHex } from './encryptionPlan';

/** Old unencrypted database (Expo Go, and before encryption). */
export const DB_NAME = 'money.db';
/** SQLCipher database (AES-256), keyed with a random key kept in the Android Keystore. */
export const SECURE_DB_NAME = 'money-secure.db';
const KEY_NAME = 'db.encryptionKey';

let instance: SQLite.SQLiteDatabase | null = null;
let encrypted = false;

/** The single app database connection. Only valid after `openAppDb()` (DbProvider awaits it). */
export function getDb(): SQLite.SQLiteDatabase {
  if (!instance) throw new Error('Database is not open yet');
  return instance;
}

/** True when the data on disk is encrypted (false in Expo Go, which has no SQLCipher). */
export const isDbEncrypted = () => encrypted;

export class DatabaseLockedError extends Error {}
/** The key is gone for good: the data can never be read again, so erasing it is safe to offer. */
export class DatabaseKeyLostError extends DatabaseLockedError {}

const fileExists = (name: string) => {
  const dir = String(SQLite.defaultDatabaseDirectory);
  return new File(dir.startsWith('file://') ? dir : `file://${dir}`, name).exists;
};

async function cipherAvailable(): Promise<boolean> {
  const probe = await SQLite.openDatabaseAsync(':memory:');
  try {
    const row = await probe.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    return !!row?.cipher_version;
  } finally {
    await probe.closeAsync();
  }
}

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const key = toHex(getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_NAME, key);
  return key;
}

async function openSecure(key: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(SECURE_DB_NAME);
  // Must be the first statement on the connection.
  await db.execAsync(`PRAGMA key = ${keyPragmaValue(key)};`);
  // Fails with "file is not a database" if the key is wrong.
  await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
  return db;
}

/**
 * Copy the plain database into a new encrypted file, check the copy, then delete the plain file.
 * If anything fails, the plain file is untouched and the next start tries again.
 */
async function migrateToEncrypted(key: string): Promise<void> {
  if (fileExists(SECURE_DB_NAME)) await SQLite.deleteDatabaseAsync(SECURE_DB_NAME); // leftover of a cut-off try
  const plain = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    const target = `${String(SQLite.defaultDatabaseDirectory).replace(/^file:\/\//, '')}/${SECURE_DB_NAME}`;
    const version = (await plain.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
    await plain.execAsync(`ATTACH DATABASE '${target.replace(/'/g, "''")}' AS secure KEY ${keyPragmaValue(key)};`);
    await plain.execAsync(`SELECT sqlcipher_export('secure'); PRAGMA secure.user_version = ${Number(version)};`);
    const counts = await plain.getFirstAsync<{ a: number; b: number; c: number; d: number }>(
      `SELECT (SELECT COUNT(*) FROM main.transactions) AS a, (SELECT COUNT(*) FROM secure.transactions) AS b,
              (SELECT COUNT(*) FROM main.categories) AS c, (SELECT COUNT(*) FROM secure.categories) AS d`,
    );
    await plain.execAsync('DETACH DATABASE secure;');
    if (!counts || counts.a !== counts.b || counts.c !== counts.d) throw new Error('Encrypted copy does not match');
  } finally {
    await plain.closeAsync();
  }
  // Prove the new file opens with the key before removing the original.
  const check = await openSecure(key);
  await check.closeAsync();
  await SQLite.deleteDatabaseAsync(DB_NAME);
}

/** Open (and if needed create or migrate) the app database. */
export async function openAppDb(): Promise<SQLite.SQLiteDatabase> {
  if (instance) return instance;
  const key = await SecureStore.getItemAsync(KEY_NAME);
  const plan = planOpen({
    cipherAvailable: await cipherAvailable(),
    plainExists: fileExists(DB_NAME),
    secureExists: fileExists(SECURE_DB_NAME),
    hasKey: !!key,
  });

  switch (plan) {
    case 'plain':
      instance = await SQLite.openDatabaseAsync(DB_NAME);
      encrypted = false;
      break;
    case 'migrate':
      await migrateToEncrypted(await getOrCreateKey());
      instance = await openSecure((await SecureStore.getItemAsync(KEY_NAME))!);
      encrypted = true;
      break;
    case 'create':
    case 'open':
      instance = await openSecure(key ?? (await getOrCreateKey()));
      encrypted = true;
      break;
    case 'lost-key':
      throw new DatabaseKeyLostError(
        "This phone's data was encrypted with a key that is no longer here. Restore from an exported backup file.",
      );
    case 'unsupported':
      throw new DatabaseLockedError('The data is encrypted and this build cannot open it.');
  }
  return instance!;
}

/** Last resort when the data can't be decrypted: delete it and the key so the app starts empty. */
export async function eraseUnreadableDb(): Promise<void> {
  instance = null;
  if (fileExists(SECURE_DB_NAME)) await SQLite.deleteDatabaseAsync(SECURE_DB_NAME);
  await SecureStore.deleteItemAsync(KEY_NAME);
}
