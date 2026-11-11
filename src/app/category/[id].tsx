import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CategoryIcon, useCategories } from '@/features/categories';
import { CategoryEntryRow } from '@/features/summary';
import { useMonthTransactions, type TransactionWithCategory } from '@/features/transactions';
import { formatMonth } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

/** All entries of one category in the selected month, biggest first. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const month = useUiStore((s) => s.month);
  const { transactions, loading } = useMonthTransactions(month);
  const { categories } = useCategories();
  const category = categories.find((c) => c.id === id);
  const today = useUiStore((s) => s.today);

  const { entries, total, typeTotal } = useMemo(() => {
    const list = transactions
      .filter((t) => t.categoryId === id)
      .sort((a, b) => b.amount - a.amount || (a.occurredOn < b.occurredOn ? 1 : -1));
    const sum = list.reduce((s, t) => s + t.amount, 0);
    const type = list[0]?.type ?? category?.type;
    const ofType = transactions.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
    return { entries: list, total: sum, typeTotal: ofType };
  }, [transactions, id, category?.type]);

  const openEntry = useCallback((entryId: string) => router.push({ pathname: '/transaction/[id]', params: { id: entryId } }), []);

  const renderItem = useCallback(
    ({ item }: { item: TransactionWithCategory }) => (
      <CategoryEntryRow transaction={item} today={today} share={total > 0 ? item.amount / total : 0} onPress={openEntry} />
    ),
    [today, total, openEntry],
  );

  const isIncome = category?.type === 'income';
  const share = typeTotal > 0 ? Math.round((total / typeTotal) * 100) : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back} pressedScale={0.88}>
          <Icon name="chevron-back" size={24} />
        </PressableScale>
        <Text variant="caption" color="textMuted">
          {formatMonth(month)}
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          category ? (
            <View style={{ paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md }}>
              <View style={[styles.titleRow, { gap: spacing.md }]}>
                <CategoryIcon category={category} size={48} />
                <Text variant="title" style={styles.flex} numberOfLines={1}>
                  {category.name}
                </Text>
              </View>
              <View style={[styles.stats, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]}>
                <View style={styles.flex}>
                  <Text variant="caption" color="textMuted">
                    {isIncome ? 'Earned' : 'Spent'}
                  </Text>
                  <Text variant="headline" tabular color={isIncome ? 'income' : 'text'} style={{ marginTop: 2 }}>
                    {formatAmount(total)}
                  </Text>
                </View>
                <View style={styles.statRight}>
                  <Text variant="caption" color="textMuted">
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                  </Text>
                  <Text variant="headline" tabular style={{ marginTop: 2 }}>
                    {share}%
                  </Text>
                </View>
              </View>
              {entries.length > 0 && (
                <Text variant="micro" color="textMuted" style={{ marginTop: spacing.sm }}>
                  Biggest first
                </Text>
              )}
            </View>
          ) : undefined
        }
        ListEmptyComponent={loading ? undefined : <EmptyState icon="file-tray-outline" title="No entries this month" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -10, height: 52 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  statRight: { alignItems: 'flex-end' },
});
