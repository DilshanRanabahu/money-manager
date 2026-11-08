import { StyleSheet, View } from 'react-native';

import type { TransactionType } from '@/features/categories';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { Change } from '../domain/insights';

type Props = {
  change: Change;
  /** Spending going up is bad (red); income going up is good (green). */
  type: TransactionType;
  /** Optional trailing text, e.g. "vs Oct 1–8". */
  suffix?: string;
};

/** "▲ 18%" / "▼ 6%" / "New" / "Same" compared with the previous period. */
export function ChangeTag({ change, type, suffix }: Props) {
  const { ratio } = change;

  if (ratio === null) {
    return (
      <Text variant="caption" color="textMuted">
        New{suffix ? ` ${suffix}` : ''}
      </Text>
    );
  }

  const pct = Math.round(Math.abs(ratio) * 100);
  if (pct === 0) {
    return (
      <Text variant="caption" color="textMuted">
        Same{suffix ? ` ${suffix}` : ''}
      </Text>
    );
  }

  const up = ratio > 0;
  const good = type === 'income' ? up : !up;
  const color = good ? 'income' : 'expense';
  const label = pct > 999 ? '999%+' : `${pct}%`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${up ? 'Up' : 'Down'} ${pct} percent${suffix ? ` ${suffix}` : ''}`}
    >
      <Icon name={up ? 'caret-up' : 'caret-down'} size={12} color={color} />
      <Text variant="caption" color={color} tabular style={styles.bold}>
        {label}
      </Text>
      {suffix ? (
        <Text variant="caption" color="textMuted">
          {' '}
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bold: { fontWeight: '600' },
});
