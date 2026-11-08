import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { TransactionForm, useTransaction, useTransactionActions } from '@/features/transactions';
import { monthOf } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';

export default function EditTransactionSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transaction, loading } = useTransaction(id);
  const { update, remove } = useTransactionActions();
  const setMonth = useUiStore((s) => s.setMonth);
  const { colors } = useTheme();

  if (loading) return <View style={{ height: 600, backgroundColor: colors.surface }} />;
  if (!transaction) {
    return (
      <View style={{ backgroundColor: colors.surface, paddingBottom: 40 }}>
        <EmptyState icon="alert-circle-outline" title="This entry no longer exists" />
      </View>
    );
  }

  return (
    <TransactionForm
      key={transaction.id}
      initial={transaction}
      onSubmit={(draft) => update(transaction.id, draft)}
      onDone={(saved) => {
        setMonth(monthOf(saved.occurredOn));
        router.back();
      }}
      onDelete={() => {
        router.back();
        void remove(transaction.id);
      }}
    />
  );
}
