import { categoryRepo } from '@/db/repositories/categoryRepo';
import { transactionRepo } from '@/db/repositories/transactionRepo';
import { createTransactionService } from './transactionService';

/** The app's transaction service, wired to the real SQLite repositories. */
export const transactionService = createTransactionService({
  transactions: transactionRepo,
  categories: categoryRepo,
});
