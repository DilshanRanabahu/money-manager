import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';

import { CarryRow, carryLabel, computeSummary, SummaryHeader } from '@/features/summary';
import {
  DayHeader,
  TransactionRow,
  useMonthTransactions,
  useTransactionActions,
  type DayGroup,
  type TransactionWithCategory,
} from '@/features/transactions';
import type { MonthKey } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { MonthSwitcher } from '@/shared/ui/MonthSwitcher';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen } from '@/shared/ui/Screen';

const rowLayout = LinearTransition.springify().damping(22).stiffness(180);
const rowEnter = FadeIn.duration(220);

type Item =
  | { kind: 'day'; key: string; date: string; net: number }
  | { kind: 'tx'; key: string; tx: TransactionWithCategory }
  | { kind: 'carry'; key: string; amount: number; label: string };

export default function HomeScreen() {
  const month = useUiStore((s) => s.month);
  const direction = useUiStore((s) => s.monthDirection);
  const { transactions, days, carry, loading } = useMonthTransactions(month);
  const summary = useMemo(() => computeSummary(transactions, carry), [transactions, carry]);

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

      {/* Keyed by month: the list slides in from the direction of travel. */}
      {/* needsOffscreenAlphaCompositing: while this fades in, draw it as one layer so the
          red delete area behind each row never shows through. */}
      <Animated.View
        key={month}
        entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(200)}
        needsOffscreenAlphaCompositing
        style={styles.fill}
      >
        {/* skipExiting: when the month changes, the old list goes away at once
            instead of every row fading out over the new month. */}
        <LayoutAnimationConfig skipExiting>
          <MonthList
            month={month}
            days={days}
            carry={carry}
            loading={loading}
            header={<SummaryHeader summary={summary} />}
          />
        </LayoutAnimationConfig>
      </Animated.View>
    </Screen>
  );
}

type MonthListProps = {
  month: MonthKey;
  days: DayGroup<TransactionWithCategory>[];
  /** Signed carry-over from earlier months (0 = none). */
  carry: number;
  loading: boolean;
  header: React.ReactElement;
};

/**
 * One month's list. Rows that were already there when the month opened render without
 * an entering animation (fast month switching); rows added later fade in.
 */
const MonthList = memo(function MonthList({ month, days, carry, loading, header }: MonthListProps) {
  const { spacing } = useTheme();
  const { remove } = useTransactionActions();
  const today = useUiStore((s) => s.today);

  // Ids present when this month's data first arrived. Anything not in here is new.
  // (Setting state during render is React's pattern for "remember the first value".)
  const [initialIds, setInitialIds] = useState<Set<string> | null>(null);
  if (initialIds === null && !loading) {
    setInitialIds(new Set(days.flatMap((d) => d.items.map((t) => t.id))));
  }

  const items = useMemo(() => {
    const out: Item[] = [];
    const firstDay = `${month}-01`;
    for (const d of days) {
      // The carry-over belongs to the 1st of the month, so it counts in that day's total.
      const net = d.date === firstDay ? d.net + carry : d.net;
      out.push({ kind: 'day', key: `day-${d.date}`, date: d.date, net });
      for (const t of d.items) out.push({ kind: 'tx', key: t.id, tx: t });
    }
    if (carry !== 0) {
      // Newest first, so the 1st is the last group; create it if the 1st has no entries.
      if (days[days.length - 1]?.date !== firstDay) {
        out.push({ kind: 'day', key: `day-${firstDay}`, date: firstDay, net: carry });
      }
      out.push({ kind: 'carry', key: 'carry', amount: carry, label: carryLabel(month) });
    }
    return out;
  }, [days, carry, month]);

  const openEntry = useCallback((id: string) => router.push({ pathname: '/transaction/[id]', params: { id } }), []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      if (item.kind === 'day') return <DayHeader date={item.date} net={item.net} today={today} />;
      if (item.kind === 'carry') return <CarryRow amount={item.amount} label={item.label} />;
      const isNew = initialIds !== null && !initialIds.has(item.tx.id);
      return (
        // No exiting animation: a swiped row has already slid out by itself.
        <Animated.View entering={isNew ? rowEnter : undefined} layout={rowLayout}>
          <TransactionRow transaction={item.tx} onPress={openEntry} onDelete={remove} />
        </Animated.View>
      );
    },
    [today, openEntry, remove, initialIds],
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.key}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? undefined : (
          <EmptyState icon="receipt-outline" title="Nothing here yet" hint="Tap + to add your first entry." />
        )
      }
      // Small batches spread row creation over frames; a wider window keeps rows ready ahead.
      initialNumToRender={10}
      maxToRenderPerBatch={6}
      updateCellsBatchingPeriod={30}
      windowSize={13}
      removeClippedSubviews
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -8 },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
