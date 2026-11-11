import { isDbEncrypted } from '@/db/client';

/** Whether entries are encrypted on disk (SQLCipher). False in Expo Go. */
export const isDataEncrypted = isDbEncrypted;
