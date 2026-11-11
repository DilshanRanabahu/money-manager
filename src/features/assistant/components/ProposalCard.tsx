import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CategoryIcon, type Category } from '@/features/categories';
import { formatDayLabel, type ISODate } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import type { ChatItem } from '../hooks/useChat';

type Item = Extract<ChatItem, { kind: 'proposal' }>;
type Row = { type: 'income' | 'expense'; amount: number; category: Category; date: ISODate; note: string | null };

/** Confirm card for anything the assistant wants to change. Nothing is saved until the user taps. */
export function ProposalCard({
  item,
  onRespond,
  onUndo,
}: {
  item: Item;
  onRespond: (id: string, ok: boolean) => void;
  onUndo: (id: string, entryId: string) => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const { proposal: p, status } = item;
  const pending = status === 'pending';

  const copy = {
    entries: {
      title: p.kind === 'entries' && p.items.length > 1 ? `Add ${p.items.length} entries` : null,
      yes: p.kind === 'entries' && p.items.length > 1 ? `Add all (${p.items.length})` : 'Add entry',
      saved: p.kind === 'entries' && p.items.length > 1 ? `✓ Added ${p.items.length} entries` : '✓ Added',
      declined: 'Not added',
    },
    category: { title: null, yes: 'Create', saved: '✓ Created', declined: 'Not created' },
    update: { title: 'Change this entry?', yes: 'Save', saved: '✓ Updated', declined: 'Not changed' },
    delete: { title: 'Delete this entry?', yes: 'Delete', saved: 'Deleted', declined: 'Not deleted' },
  }[p.kind];

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg }]}
    >
      {copy.title && (
        <Text variant="caption" color="textMuted">
          {copy.title}
        </Text>
      )}

      {p.kind === 'entries' && (
        <>
          {p.items.map((e, i) => (
            <EntryRow key={i} row={e} />
          ))}
          {p.items.length > 1 && (
            <View style={[styles.row, styles.between, styles.footer, { borderTopColor: colors.divider, paddingTop: spacing.sm }]}>
              <Text variant="caption" color="textMuted">
                Total
              </Text>
              <Text variant="body" tabular style={styles.bold}>
                {formatAmount(
                  p.items.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0),
                  { signed: true },
                )}
              </Text>
            </View>
          )}
        </>
      )}

      {p.kind === 'category' && (
        <View style={[styles.row, { gap: spacing.md }]}>
          <CategoryIcon category={p.category} />
          <View style={styles.fill}>
            <Text variant="body" style={styles.bold}>
              {p.category.name}
            </Text>
            <Text variant="caption" color="textMuted">
              New {p.category.type} category
            </Text>
          </View>
        </View>
      )}

      {p.kind === 'update' && (
        <>
          <EntryRow row={{ ...p.before, date: p.before.occurredOn }} faded />
          <Text variant="caption" color="textMuted" align="center">
            ↓
          </Text>
          <EntryRow row={p.after} />
        </>
      )}

      {p.kind === 'delete' && <EntryRow row={{ ...p.entry, date: p.entry.occurredOn }} faded={status === 'saved'} />}

      {pending ? (
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Button label="Not now" variant="secondary" onPress={() => onRespond(item.id, false)} style={styles.fill} />
          <Button label={copy.yes} onPress={() => onRespond(item.id, true)} style={styles.fill} />
        </View>
      ) : p.kind === 'delete' && status === 'saved' ? (
        <View style={[styles.row, styles.between]}>
          <Text variant="caption" color="expense">
            {copy.saved}
          </Text>
          <Button label="Undo" variant="ghost" onPress={() => onUndo(item.id, p.entry.id)} style={styles.undo} />
        </View>
      ) : (
        <Text variant="caption" color={status === 'saved' ? 'income' : 'textMuted'}>
          {status === 'undone' ? '↺ Restored' : status === 'saved' ? copy.saved : copy.declined}
        </Text>
      )}
    </Animated.View>
  );
}

function EntryRow({ row, faded }: { row: Row; faded?: boolean }) {
  const { spacing } = useTheme();
  const today = useUiStore((s) => s.today);
  return (
    <View style={[styles.row, { gap: spacing.md }, faded && styles.faded]}>
      <CategoryIcon category={row.category} size={36} />
      <View style={styles.fill}>
        <Text variant="body" numberOfLines={1} style={styles.bold}>
          {row.note || row.category.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {formatDayLabel(row.date, today)}
          {row.note ? ` · ${row.category.name}` : ''}
        </Text>
      </View>
      <Text
        variant="body"
        tabular
        color={row.type === 'income' ? 'income' : 'text'}
        style={[styles.bold, faded && styles.struck]}
      >
        {formatAmount(row.type === 'income' ? row.amount : -row.amount, { signed: true })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '88%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  fill: { flex: 1 },
  bold: { fontWeight: '600' },
  faded: { opacity: 0.5 },
  struck: { textDecorationLine: 'line-through' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  undo: { height: 36, paddingHorizontal: 12 },
});
