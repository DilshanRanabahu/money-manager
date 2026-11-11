import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import type { TransactionType } from '@/features/categories';
import {
  BreakdownRow,
  CARRY_CATEGORY_ID,
  ChangeTag,
  DonutChart,
  DonutLegend,
  donutSlices,
  PaceCard,
  useBreakdownInsights,
} from '@/features/summary';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MonthSwitcher } from '@/shared/ui/MonthSwitcher';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

const OPTIONS = [
  { value: 'expense', label: 'Spending' },
  { value: 'income', label: 'Income' },
] as const;

export default function BreakdownScreen() {
  const { spacing } = useTheme();
  const month = useUiStore((s) => s.month);
  const direction = useUiStore((s) => s.monthDirection);
  const [type, setType] = useState<TransactionType>('expense');
  const { total, rows, totalChange, compareLabel, pace, available, loading } = useBreakdownInsights(month, type);
  const slices = useMemo(() => donutSlices(rows), [rows]);
  // Selected slice; cleared when the month or tab changes.
  const [selection, setSelection] = useState<{ key: string; id: string | null }>({ key: '', id: null });
  const viewKey = `${month}-${type}`;
  const selectedId = selection.key === viewKey ? selection.id : null;

  const openCategory = (id: string) => router.push({ pathname: '/category/[id]', params: { id } });

  return (
    <Screen>
      <View style={styles.header}>
        <MonthSwitcher />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <View style={{ marginTop: spacing.md }}>
          <SegmentedControl options={OPTIONS} value={type} onChange={setType} />
        </View>

        <View style={[styles.chart, { paddingTop: spacing.xl, paddingBottom: spacing.lg }]}>
          <DonutChart
            slices={slices}
            centerLabel={type === 'expense' ? 'Total spent' : 'Total earned'}
            total={total}
            tone={type === 'income' ? 'income' : 'text'}
            selectedId={selectedId}
            onSelect={(id) => setSelection({ key: viewKey, id })}
          />
          <DonutLegend slices={slices} selectedId={selectedId} onSelect={(id) => setSelection({ key: viewKey, id })} />
          {totalChange && (
            <View style={{ marginTop: spacing.md }}>
              <ChangeTag change={totalChange} type={type} suffix={compareLabel} />
            </View>
          )}
        </View>

        <Animated.View key={`${month}-${type}`} entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(220)}>
          {pace && pace.spent > 0 && (
            <View style={{ marginBottom: spacing.lg }}>
              <PaceCard month={month} pace={pace} available={available} />
            </View>
          )}

          {rows.length === 0 && !loading ? (
            <EmptyState
              icon="pie-chart-outline"
              title={type === 'expense' ? 'No spending this month' : 'No income this month'}
            />
          ) : (
            rows.map((row, i) => (
              <BreakdownRow
                key={row.category.id}
                row={row}
                index={i}
                type={type}
                change={row.change}
                highlighted={selectedId === row.category.id}
                onPress={row.category.id === CARRY_CATEGORY_ID ? undefined : () => openCategory(row.category.id)}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  chart: { alignItems: 'center' },
});
