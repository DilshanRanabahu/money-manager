import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CategoryIcon } from '@/features/categories';
import { formatDayLabel } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { Card } from '../services/tools';

const ICONS: Record<Card['kind'], IconName> = {
  summary: 'calendar-outline',
  breakdown: 'pie-chart-outline',
  entries: 'search-outline',
};

/** "What I looked at" chip plus the real numbers from the phone, drawn like the rest of the app. */
export function ToolCard({ label, card }: { label: string; card?: Card }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={{ gap: spacing.sm }}>
      <View style={[styles.chip, { backgroundColor: colors.surfaceMuted, borderRadius: radius.full }]}>
        <Icon name={card ? ICONS[card.kind] : 'search-outline'} size={13} color="textMuted" />
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      </View>
      {card && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]}>
          {card.kind === 'summary' && <Summary card={card} />}
          {card.kind === 'breakdown' && <Breakdown card={card} />}
          {card.kind === 'entries' && <Entries card={card} />}
        </View>
      )}
    </Animated.View>
  );
}

function Summary({ card }: { card: Extract<Card, { kind: 'summary' }> }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <View>
        <Text variant="caption" color="textMuted">
          Balance
        </Text>
        <Text variant="title" tabular color={card.balance < 0 ? 'expense' : 'text'}>
          {formatAmount(card.balance)}
        </Text>
      </View>
      <View style={[styles.row, { gap: spacing.lg }]}>
        <Stat icon="arrow-down" label="Income" value={card.income} tone="income" />
        <Stat icon="arrow-up" label="Expense" value={card.expense} tone="expense" />
      </View>
      {card.carry !== 0 && (
        <Text variant="caption" color="textFaint">
          Includes {formatAmount(card.carry, { signed: true })} carried from earlier months
        </Text>
      )}
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  tone: 'income' | 'expense';
}) {
  return (
    <View style={styles.fill}>
      <View style={[styles.row, styles.tight]}>
        <Icon name={icon} size={13} color={tone} />
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      </View>
      <Text variant="body" tabular style={styles.bold}>
        {formatAmount(value, { bare: true })}
      </Text>
    </View>
  );
}

function Breakdown({ card }: { card: Extract<Card, { kind: 'breakdown' }> }) {
  const { colors, spacing } = useTheme();
  const max = Math.max(...card.rows.map((r) => r.share), 0.0001);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.row, styles.between]}>
        <Text variant="caption" color="textMuted">
          {card.type === 'income' ? 'Total income' : 'Total spent'}
        </Text>
        <Text variant="body" tabular style={styles.bold}>
          {formatAmount(card.total)}
        </Text>
      </View>
      {card.rows.map((r) => {
        const hue = colors.category[r.category.color] ?? colors.category.gray;
        return (
          <View key={r.category.id} style={styles.barGroup}>
            <View style={[styles.row, styles.between]}>
              <Text variant="caption" numberOfLines={1} style={[styles.fill, styles.bold]}>
                {r.category.name}
              </Text>
              <Text variant="caption" tabular color="textMuted">
                {formatAmount(r.amount, { whole: true })} · {Math.round(r.share * 100)}%
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.bar, { width: `${Math.max((r.share / max) * 100, 2)}%`, backgroundColor: hue.fg }]} />
            </View>
          </View>
        );
      })}
      {card.more > 0 && (
        <Text variant="caption" color="textFaint">
          + {card.more} more {card.more === 1 ? 'category' : 'categories'}
        </Text>
      )}
    </View>
  );
}

function Entries({ card }: { card: Extract<Card, { kind: 'entries' }> }) {
  const { colors, spacing } = useTheme();
  const today = useUiStore((s) => s.today);
  return (
    <View style={{ gap: spacing.md }}>
      {card.rows.map((t) => (
        <View key={t.id} style={[styles.row, { gap: spacing.md }]}>
          <CategoryIcon category={t.category} size={32} />
          <View style={styles.fill}>
            <Text variant="caption" numberOfLines={1} style={styles.bold}>
              {t.note || t.category.name}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {formatDayLabel(t.occurredOn, today)}
              {t.note ? ` · ${t.category.name}` : ''}
            </Text>
          </View>
          <Text variant="caption" tabular color={t.type === 'income' ? 'income' : 'text'} style={styles.bold}>
            {formatAmount(t.type === 'income' ? t.amount : -t.amount, { signed: true })}
          </Text>
        </View>
      ))}
      {card.count > card.rows.length && (
        <View style={[styles.row, styles.between, styles.footer, { borderTopColor: colors.divider, paddingTop: spacing.sm }]}>
          <Text variant="caption" color="textMuted">
            {card.count} entries in all
          </Text>
          <Text variant="caption" tabular color="textMuted">
            Net {formatAmount(card.total, { signed: true })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  card: { width: '85%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  tight: { gap: 4 },
  between: { justifyContent: 'space-between' },
  fill: { flex: 1 },
  bold: { fontWeight: '600' },
  barGroup: { gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
