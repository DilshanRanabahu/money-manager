import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { categoryRepo } from '@/db/repositories/categoryRepo';
import { transactionRepo } from '@/db/repositories/transactionRepo';
import { todayISO } from '@/shared/lib/dates';
import { err, ok, type Result } from '@/shared/lib/result';
import {
  BACKUP_APP,
  BACKUP_LIMITS,
  BACKUP_VERSION,
  backupSchema,
  EXPORT_FILE_PREFIX,
  type Backup,
} from '../domain/backupSchema';

/**
 * Delete earlier export files from the app cache (audit #6). Run at app start: by then the
 * share sheet has long finished with them. The copy the user saved elsewhere is untouched.
 */
export function cleanupOldExports(): void {
  try {
    for (const item of new Directory(Paths.cache).list()) {
      if (item instanceof File && item.name.startsWith(EXPORT_FILE_PREFIX)) item.delete();
    }
  } catch {
    // Best effort; never block start-up.
  }
}

/** Write all data to a JSON file and open the share sheet. */
export async function exportBackup(): Promise<Result<{ count: number }>> {
  try {
    const backup: Backup = {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      categories: (await categoryRepo.allRows()) as Backup['categories'],
      transactions: (await transactionRepo.allRows()) as Backup['transactions'],
    };

    cleanupOldExports();
    const file = new File(Paths.cache, `${EXPORT_FILE_PREFIX}${todayISO()}.json`);
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(backup, null, 2));

    if (!(await Sharing.isAvailableAsync())) return err('Sharing is not available on this device');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
    return ok({ count: backup.transactions.length });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Export failed');
  }
}

/** Let the user pick a backup file and validate it. Does not write anything yet. */
export async function pickBackup(): Promise<Result<Backup | null>> {
  try {
    // expo-file-system's own picker returns a File the app is allowed to read.
    // (expo-document-picker's cached copy was rejected by File.text() in Expo Go.)
    const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
    if (picked.canceled || !picked.result) return ok(null);

    // Audit #8: refuse huge files before reading them into memory.
    if (picked.result.size > BACKUP_LIMITS.maxFileBytes) return err('This file is too large to be a Money backup');

    const text = await picked.result.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return err('This file is not a valid backup');
    }
    const parsed = backupSchema.safeParse(json);
    if (!parsed.success) return err('This file is not a valid Money backup');
    return ok(parsed.data);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Could not read the file');
  }
}

/** Replace all data with the backup, all or nothing. */
export async function restoreBackup(backup: Backup): Promise<Result<{ count: number }>> {
  try {
    await transactionRepo.replaceAll(backup.categories, backup.transactions);
    return ok({ count: backup.transactions.length });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Import failed');
  }
}
