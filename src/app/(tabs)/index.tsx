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

import { computeSummary, SummaryHeader } from '@/features/summary';
import {
  DayHeader,
  TransactionRow,
  useMonthTransactions,
  useTransactionActions,
  type DayGroup,
  type TransactionWithCategory,
} from '@/features/transactions';
import { todayISO, type MonthKey } from '@/shared/lib/dates';
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
  | { kind: 'tx'; key: string; tx: TransactionWithCategory };

export default function HomeScreen() {
  const month = useUiStore((s) => s.month);
  const direction = useUiStore((s) => s.monthDirection);
  const { transactions, days, loading } = useMonthTransactions(month);
  const summary = useMemo(() => computeSummary(transactions), [transactions]);

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
          <MonthList month={month} days={days} loading={loading} header={<SummaryHeader summary={summary} />} />
        </LayoutAnimationConfig>
      </Animated.View>
    </Screen>
  );
}

type MonthListProps = {
  month: MonthKey;
  days: DayGroup<TransactionWithCategory>[];
  loading: boolean;
  header: React.ReactElement;
};

/**
 * One month's list. Rows that were already there when the month opened render without
 * an entering animation (fast month switching); rows added later fade in.
 */
const MonthList = memo(function MonthList({ days, loading, header }: MonthListProps) {
  const { spacing } = useTheme();
  const { remove } = useTransactionActions();
  const today = todayISO();

  // Ids present when this month's data first arrived. Anything not in here is new.
  // (Setting state during render is React's pattern for "remember the first value".)
  const [initialIds, setInitialIds] = useState<Set<string> | null>(null);
  if (initialIds === null && !loading) {
    setInitialIds(new Set(days.flatMap((d) => d.items.map((t) => t.id))));
  }

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
    ({ item }: { item: Item }) => {
      if (item.kind === 'day') return <DayHeader date={item.date} net={item.net} today={today} />;
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
