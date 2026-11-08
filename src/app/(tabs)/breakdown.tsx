import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import type { TransactionType } from '@/features/categories';
import { BreakdownRow, CARRY_CATEGORY_ID, ChangeTag, PaceCard, useBreakdownInsights } from '@/features/summary';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AnimatedNumber } from '@/shared/ui/AnimatedNumber';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MonthSwitcher } from '@/shared/ui/MonthSwitcher';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';

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

        <View style={{ paddingTop: spacing.xl, paddingBottom: spacing.md }}>
          <Text variant="caption" color="textMuted">
            {type === 'expense' ? 'Total spent' : 'Total earned'}
          </Text>
          <AnimatedNumber value={total} variant="display" color={type === 'income' ? 'income' : 'text'} style={{ marginTop: spacing.xs }} />
          {totalChange && (
            <View style={{ marginTop: spacing.xs }}>
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
});
