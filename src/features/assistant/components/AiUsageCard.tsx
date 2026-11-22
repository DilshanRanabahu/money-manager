import { StyleSheet, View } from 'react-native';

import { formatMonth, monthOf } from '@/shared/lib/dates';
import { formatUsd } from '@/shared/lib/money';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import { formatTokens, totalTokens } from '../domain/usage';
import { useAiUsage } from '../hooks/useAiUsage';

/** This month's Ask Money usage: cost, questions, tokens, and what prompt caching saved. */
export function AiUsageCard() {
  const { colors, spacing, radius } = useTheme();
  const today = useUiStore((s) => s.today);
  const month = monthOf(today);
  const { data } = useAiUsage(month);

  const t = data?.totals;
  const inputAll = t ? t.input + t.cacheWrite + t.cacheRead : 0;
  const cachedPct = t && inputAll > 0 ? Math.round((t.cacheRead / inputAll) * 100) : 0;

  return (
    <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs }}>
      <Text variant="caption" color="textMuted">
        {formatMonth(month)} · usage
      </Text>
      {!t || t.requests === 0 ? (
        <Text variant="caption" color="textFaint">
          Nothing used yet this month.
        </Text>
      ) : (
        <>
          <View style={styles.row}>
            <Text variant="headline" tabular>
              {formatUsd(data.cost)}
            </Text>
            <Text variant="caption" color="textMuted" tabular>
              {t.questions} {t.questions === 1 ? 'question' : 'questions'} · {formatTokens(totalTokens(t))} tokens
            </Text>
          </View>
          {data.saved > 0 && (
            <Text variant="caption" color="income">
              Prompt caching saved {formatUsd(data.saved)} ({cachedPct}% of input read from cache)
            </Text>
          )}
          <Text variant="caption" color="textFaint">
            Estimated from Anthropic list prices. Your exact bill is in the Anthropic Console.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
});
