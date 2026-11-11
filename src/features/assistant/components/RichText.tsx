import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import { parseRich, type Span } from '../services/richText';

/** Assistant reply: paragraphs, bullets, numbered items, bold, and coloured amounts. */
export function RichText({ text }: { text: string }) {
  const { spacing } = useTheme();
  return (
    <View>
      {parseRich(text).map((b, i) => {
        if (b.kind === 'gap') return <View key={i} style={{ height: spacing.sm }} />;
        if (b.kind === 'p') return <Line key={i} spans={b.spans} />;
        return (
          <View key={i} style={styles.item}>
            <Text variant="body" color="textMuted" style={b.kind === 'number' ? styles.number : styles.dot}>
              {b.kind === 'number' ? `${b.n}.` : '•'}
            </Text>
            <View style={styles.fill}>
              <Line spans={b.spans} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Line({ spans }: { spans: Span[] }) {
  return (
    <Text variant="body" style={styles.line}>
      {spans.map((s, i) =>
        s.bold || s.tone ? (
          <Text key={i} variant="body" tabular={!!s.tone} color={s.tone ?? 'text'} style={s.bold ? styles.bold : undefined}>
            {s.text}
          </Text>
        ) : (
          s.text
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  line: { lineHeight: 23 },
  item: { flexDirection: 'row', marginTop: 2 },
  dot: { width: 16, lineHeight: 23 },
  number: { width: 22, lineHeight: 23 },
  bold: { fontWeight: '600' },
});
