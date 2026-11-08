import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker, useCategories } from '@/features/categories';
import { todayISO, type ISODate } from '@/shared/lib/dates';
import { haptics } from '@/shared/lib/haptics';
import type { Result } from '@/shared/lib/result';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { applyKey, minorToInput, type PadKey } from '../domain/amountInput';
import { MAX_NOTE_LENGTH, type Transaction, type TransactionDraft, type TransactionType } from '../domain/types';
import { draftSchema } from '../domain/validation';
import { AmountDisplay } from './AmountDisplay';
import { AmountPad } from './AmountPad';
import { DateStepper } from './DateStepper';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

type Props = {
  /** Existing entry when editing. */
  initial?: Transaction;
  onSubmit: (draft: TransactionDraft) => Promise<Result<Transaction>>;
  onDone: (saved: Transaction) => void;
  onDelete?: () => void;
};

/** Add / edit form shown inside the bottom sheet. */
export function TransactionForm({ initial, onSubmit, onDone, onDelete }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const lastCategory = useSettingsStore((s) => s.lastCategory);
  const setLastCategory = useSettingsStore((s) => s.setLastCategory);

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [raw, setRaw] = useState(initial ? minorToInput(initial.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [date, setDate] = useState<ISODate>(initial?.occurredOn ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(Boolean(initial?.note));
  const [shakeKey, setShakeKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { categories } = useCategories(type);

  // Pick a sensible default category: current choice if still valid, else last used, else first.
  const selectedCategory = useMemo(() => {
    if (categoryId && categories.some((c) => c.id === categoryId)) return categoryId;
    const last = lastCategory[type];
    if (last && categories.some((c) => c.id === last)) return last;
    return categories[0]?.id ?? null;
  }, [categoryId, categories, lastCategory, type]);

  const draft: TransactionDraft = {
    type,
    amountText: raw,
    categoryId: selectedCategory ?? '',
    occurredOn: date,
    note,
  };
  const isValid = draftSchema.safeParse(draft).success;

  const onKey = useCallback((key: PadKey) => {
    setError(null);
    setRaw((current) => {
      const next = applyKey(current, key);
      if (next === null) {
        haptics.warning();
        setShakeKey((k) => k + 1);
        return current;
      }
      return next;
    });
  }, []);

  const changeType = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
    setError(null);
  };

  const save = async () => {
    if (!isValid) {
      haptics.warning();
      setShakeKey((k) => k + 1);
      return;
    }
    setSaving(true);
    const result = await onSubmit(draft);
    setSaving(false);
    if (!result.ok) {
      haptics.warning();
      setError(result.error);
      return;
    }
    haptics.success();
    setLastCategory(type, result.value.categoryId);
    onDone(result.value);
  };

  return (
    <View style={{ paddingTop: spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.surface }}>
      <View style={[styles.topRow, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.toggle}>
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} />
        </View>
        {onDelete && (
          <PressableScale
            onPress={onDelete}
            accessibilityLabel="Delete entry"
            style={[styles.iconButton, { backgroundColor: colors.expenseSoft, borderRadius: radius.md }]}
          >
            <Icon name="trash-outline" size={20} color="expense" />
          </PressableScale>
        )}
      </View>

      <View style={{ paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
        <AmountDisplay raw={raw} type={type} shakeKey={shakeKey} />
        {error && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
            <Text variant="caption" color="expense" align="center" style={{ marginTop: spacing.xs }}>
              {error}
            </Text>
          </Animated.View>
        )}
      </View>

      <CategoryPicker categories={categories} value={selectedCategory} onChange={setCategoryId} />

      <View style={[styles.metaRow, { paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.sm }]}>
        <View style={styles.flex}>
          <DateStepper value={date} onChange={setDate} />
        </View>
        {noteOpen ? (
          <Animated.View entering={FadeIn.duration(150)} style={styles.flex}>
            <TextInput
              autoFocus={!initial?.note}
              value={note}
              onChangeText={setNote}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="Note"
              placeholderTextColor={colors.textFaint}
              returnKeyType="done"
              style={[
                typography.caption,
                styles.note,
                { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, color: colors.text },
              ]}
            />
          </Animated.View>
        ) : (
          <PressableScale
            onPress={() => setNoteOpen(true)}
            accessibilityLabel="Add a note"
            style={[styles.flex, styles.addNote, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]}
          >
            <Icon name="create-outline" size={16} color="textMuted" />
            <Text variant="caption" color="textMuted" style={styles.bold}>
              Add note
            </Text>
          </PressableScale>
        )}
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
        <AmountPad onKey={onKey} />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <Button label={initial ? 'Save changes' : 'Save'} onPress={save} disabled={!isValid || saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { flex: 1 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row' },
  flex: { flex: 1 },
  note: { height: 44, paddingHorizontal: 12 },
  addNote: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bold: { fontWeight: '600' },
});
