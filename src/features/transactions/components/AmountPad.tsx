import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import type { PadKey } from '../domain/amountInput';

const ROWS: PadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

type Props = { onKey: (key: PadKey) => void };

/** Large custom number pad, so the system keyboard never jumps in. */
function AmountPadBase({ onKey }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {ROWS.map((row, i) => (
        <View key={i} style={[styles.row, { gap: spacing.xs }]}>
          {row.map((key) => (
            <Key key={key} value={key} onPress={onKey} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Key({ value, onPress }: { value: PadKey; onPress: (k: PadKey) => void }) {
  const { radius } = useTheme();
  return (
    <PressableScale
      onPress={() => onPress(value)}
      onLongPress={value === 'back' ? () => onPress('back') : undefined}
      pressedScale={0.92}
      haptic="light"
      accessibilityRole="keyboardkey"
      accessibilityLabel={value === 'back' ? 'Delete' : value === '.' ? 'Decimal point' : value}
      style={[styles.key, { borderRadius: radius.md }]}
    >
      {value === 'back' ? (
        <Icon name="backspace-outline" size={24} />
      ) : (
        <Text variant="title" style={styles.digit}>
          {value}
        </Text>
      )}
    </PressableScale>
  );
}

export const AmountPad = memo(AmountPadBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  key: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center' },
  digit: { fontWeight: '500' },
});
