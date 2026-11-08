import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, LinearTransition } from 'react-native-reanimated';

import { computeSummary, SummaryHeader } from '@/features/summary';
import {
  DayHeader,
  TransactionRow,
  useMonthTransactions,
  useTransactionActions,
  type TransactionWithCategory,
} from '@/features/transactions';
import { todayISO } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { MonthSwitcher } from '@/shared/ui/MonthSwitcher';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen } from '@/shared/ui/Screen';

const rowLayout = LinearTransition.springify().damping(22).stiffness(180);

type Item =
  | { kind: 'day'; key: string; date: string; net: number }
  | { kind: 'tx'; key: string; tx: TransactionWithCategory };

export default function HomeScreen() {
  const { spacing } = useTheme();
  const month = useUiStore((s) => s.month);
  const direction = useUiStore((s) => s.monthDirection);
  const { transactions, days, loading } = useMonthTransactions(month);
  const { remove } = useTransactionActions();
  const summary = useMemo(() => computeSummary(transactions), [transactions]);
  const today = todayISO();

  // Flat list of day headers + rows. Sticky headers are off on purpose:
  // on Android (RN 0.88) they stopped the rows from rendering.
  const items = useMemo(() => {
    const out: Item[] = [];
    for (const d of days) {
      out.push({ kind: 'day', key: `day-${d.date}`, date: d.date, net: d.net });
      for (const t of d.items) out.push({ kind: 'tx', key: t.id, tx: t });
    }
    return out;
  }, [days]);

  const openEntry = useCallback((id: string) => router.push({ pathname: '/transaction/[id]', params: { id } }), []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) =>
      item.kind === 'day' ? (
        <DayHeader date={item.date} net={item.net} today={today} />
      ) : (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={rowLayout}>
          <TransactionRow transaction={item.tx} onPress={openEntry} onDelete={remove} />
        </Animated.View>
      ),
    [today, openEntry, remove],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <MonthSwitcher />
        <PressableScale
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          pressedScale={0.88}
          style={styles.settings}
        >
          <Icon name="settings-outline" size={22} color="textMuted" />
        </PressableScale>
      </View>

      <Animated.View key={month} entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(220)} style={styles.fill}>
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          renderItem={renderItem}
          ListHeaderComponent={<SummaryHeader summary={summary} />}
          ListEmptyComponent={
            loading ? undefined : (
              <EmptyState icon="receipt-outline" title="Nothing here yet" hint="Tap + to add your first entry." />
            )
          }
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -8 },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
