import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/features/categories';
import { formatDayLabel } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import { signedAmount, type TransactionWithCategory } from '../domain/types';

/**
 * Asks before an entry is deleted, showing the entry itself.
 * onCancel also runs on Back, a tap outside, or when the app locks.
 */
export function confirmDeleteEntry(
  t: TransactionWithCategory,
  { onDelete, onCancel }: { onDelete: () => void; onCancel?: () => void },
) {
  useUiStore.getState().askConfirm({
    title: 'Delete this entry?',
    message: 'You can undo it right after.',
    icon: 'trash-outline',
    destructive: true,
    confirmLabel: 'Delete',
    content: <EntryPreview t={t} />,
    onConfirm: onDelete,
    onCancel,
  });
}

function EntryPreview({ t }: { t: TransactionWithCategory }) {
  const { colors, spacing, radius } = useTheme();
  const today = useUiStore((s) => s.today);
  const isIncome = t.type === 'income';
  const meta = [formatDayLabel(t.occurredOn, today), t.note].filter(Boolean).join(' · ');
  return (
    <View
      style={[styles.row, { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, gap: spacing.md }]}
    >
      <CategoryIcon category={t.category} size={36} />
      <View style={styles.middle}>
        <Text variant="body" numberOfLines={1} style={styles.name}>
          {t.category.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text variant="body" tabular color={isIncome ? 'income' : 'text'} style={styles.amount}>
        {formatAmount(signedAmount(t), { signed: true, bare: true })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, minWidth: 0 },
  name: { fontWeight: '500' },
  amount: { fontWeight: '600' },
});
