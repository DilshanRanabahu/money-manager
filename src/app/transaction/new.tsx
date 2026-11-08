import { router } from 'expo-router';

import { TransactionForm, useTransactionActions } from '@/features/transactions';
import { monthOf } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';

export default function NewTransactionSheet() {
  const { create } = useTransactionActions();
  const setMonth = useUiStore((s) => s.setMonth);

  return (
    <TransactionForm
      onSubmit={create}
      onDone={(saved) => {
        // Show the month the entry landed in, so the new row is visible.
        setMonth(monthOf(saved.occurredOn));
        router.back();
      }}
    />
  );
}
