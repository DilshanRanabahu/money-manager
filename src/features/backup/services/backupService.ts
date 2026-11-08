import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { categoryRepo } from '@/db/repositories/categoryRepo';
import { transactionRepo } from '@/db/repositories/transactionRepo';
import { todayISO } from '@/shared/lib/dates';
import { err, ok, type Result } from '@/shared/lib/result';
import { BACKUP_APP, BACKUP_VERSION, backupSchema, type Backup } from '../domain/backupSchema';

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

    const file = new File(Paths.cache, `money-backup-${todayISO()}.json`);
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
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return ok(null);

    const text = await new File(picked.assets[0].uri).text();
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
