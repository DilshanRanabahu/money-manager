import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'money.db';

let instance: SQLite.SQLiteDatabase | null = null;

/** The single app database connection. Change listener powers live queries. */
export function getDb(): SQLite.SQLiteDatabase {
  if (!instance) {
    instance = SQLite.openDatabaseSync(DB_NAME, { enableChangeListener: true });
  }
  return instance;
}
