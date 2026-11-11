import { categoryRepo } from '@/db/repositories/categoryRepo';
import { transactionRepo } from '@/db/repositories/transactionRepo';
import { categoryService } from '@/features/categories/services/categoryService';
import { transactionService } from '@/features/transactions/services/instance';
import { monthOf } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import type { AssistantData } from './tools';

/** The assistant's tools, wired to the real repositories. Writes go through the transaction service. */
export const assistantData: AssistantData = {
  async monthEntries(month) {
    const [transactions, carry] = await Promise.all([
      transactionRepo.findByMonth(month),
      transactionRepo.balanceBefore(`${month}-01`),
    ]);
    return { transactions, carry };
  },
  search: (f) => transactionRepo.search(f),
  categories: () => categoryRepo.findAll(),
  async addEntry(draft) {
    const r = await transactionService.create(draft);
    // Show the month the entry went into, like the add sheet does.
    if (r.ok) useUiStore.getState().setMonth(monthOf(r.value.occurredOn));
    return r;
  },
  getEntry: (id) => transactionRepo.findById(id),
  updateEntry: (id, draft) => transactionService.update(id, draft),
  deleteEntry: (id) => transactionService.remove(id),
  addCategory: (input) => categoryService.create(input),
  today: () => useUiStore.getState().today,
};

/** Undo for a delete confirmed in the chat (soft-deleted rows are purged on the next app start). */
export const restoreEntry = (id: string) => transactionService.restore(id);
