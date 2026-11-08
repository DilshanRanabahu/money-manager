import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'money.db';

let instance: SQLite.SQLiteDatabase | null = null;

/** The single app database connection. Screens refresh through queryCache. */
export function getDb(): SQLite.SQLiteDatabase {
  if (!instance) {
    instance = SQLite.openDatabaseSync(DB_NAME);
  }
  return instance;
}
