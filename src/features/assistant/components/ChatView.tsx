import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/features/categories';
import { formatDayLabel } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { useChat, type ChatItem } from '../hooks/useChat';
import { RichText } from './RichText';
import { ToolCard } from './ToolCard';
import { TypingDots } from './TypingDots';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Where did most of my money go?',
  'Compare this month with last month',
  'Lunch 850 today',
  'Add a Fuel expense category',
];

/** Full-screen "Ask Money" chat. */
export function ChatView() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, busy, activity, send, respond } = useChat();
  const [text, setText] = useState('');
  const list = useRef<FlatList<ChatItem>>(null);

  const submit = (value = text) => {
    if (!value.trim() || busy) return;
    setText('');
    void send(value);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back} pressedScale={0.88}>
          <Icon name="chevron-back" size={24} />
        </PressableScale>
        <Text variant="title" numberOfLines={1} style={styles.fill}>
          Ask Money
        </Text>
      </View>

      <FlatList
        ref={list}
        data={items}
        keyExtractor={(i) => i.id}
        style={styles.fill}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Suggestions onPick={submit} />}
        ListFooterComponent={
          activity !== null ? (
            <Animated.View entering={FadeIn.duration(160)}>
              <TypingDots label={activity} />
            </Animated.View>
          ) : undefined
        }
        renderItem={({ item }) => <Message item={item} onRespond={respond} />}
      />

      <View
        style={[
          styles.composer,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            gap: spacing.sm,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask about your money…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          accessibilityLabel="Message"
          style={[
            typography.body,
            styles.input,
            { backgroundColor: colors.surface, borderRadius: radius.lg, color: colors.text },
          ]}
        />
        <PressableScale
          onPress={() => submit()}
          disabled={busy || !text.trim()}
          accessibilityLabel="Send"
          style={[
            styles.send,
            { backgroundColor: colors.accent, borderRadius: radius.full, opacity: busy || !text.trim() ? 0.35 : 1 },
          ]}
        >
          <Icon name="arrow-up" size={20} color="onAccent" />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

function Suggestions({ onPick }: { onPick: (s: string) => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={[styles.empty, { gap: spacing.md }]}>
      <Icon name="sparkles-outline" size={32} color="textFaint" />
      <Text variant="body" color="textMuted" align="center">
        Ask anything about your entries, or tell me what you spent.
      </Text>
      <View style={[styles.chips, { gap: spacing.sm }]}>
        {SUGGESTIONS.map((s) => (
          <PressableScale
            key={s}
            onPress={() => onPick(s)}
            style={{ backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text variant="caption">{s}</Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

function Message({ item, onRespond }: { item: ChatItem; onRespond: (id: string, ok: boolean) => void }) {
  const { colors, radius } = useTheme();

  if (item.kind === 'user') {
    return (
      <Animated.View
        entering={FadeInDown.duration(180)}
        style={[styles.bubble, styles.mine, { backgroundColor: colors.accent, borderRadius: radius.lg }]}
      >
        <Text variant="body" color="onAccent">
          {item.text}
        </Text>
      </Animated.View>
    );
  }
  if (item.kind === 'assistant') {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={[styles.bubble, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        <RichText text={item.text} />
      </Animated.View>
    );
  }
  if (item.kind === 'error') {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={[styles.bubble, { backgroundColor: colors.expenseSoft, borderRadius: radius.lg }]}>
        <Text variant="caption" color="expense">
          {item.text}
        </Text>
      </Animated.View>
    );
  }
  if (item.kind === 'tool') return <ToolCard label={item.label} card={item.card} />;
  return <ProposalCard item={item} onRespond={onRespond} />;
}

function ProposalCard({
  item,
  onRespond,
}: {
  item: Extract<ChatItem, { kind: 'proposal' }>;
  onRespond: (id: string, ok: boolean) => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const today = useUiStore((s) => s.today);
  const { proposal: p, status } = item;
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={[styles.bubble, { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, width: '85%' }]}
    >
      <View style={[styles.cardRow, { gap: spacing.md }]}>
        <CategoryIcon category={p.category} />
        <View style={styles.fill}>
          <Text variant="body" style={styles.bold}>
            {p.category.name}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {p.kind === 'entry'
              ? `${formatDayLabel(p.date, today)}${p.note ? ` · ${p.note}` : ''}`
              : `New ${p.category.type} category`}
          </Text>
        </View>
        {p.kind === 'entry' && (
          <Text variant="body" tabular color={p.type === 'income' ? 'income' : 'text'} style={styles.bold}>
            {formatAmount(p.type === 'income' ? p.amount : -p.amount, { signed: true })}
          </Text>
        )}
      </View>
      {status === 'pending' ? (
        <View style={[styles.cardRow, { gap: spacing.sm }]}>
          <Button label="Not now" variant="secondary" onPress={() => onRespond(item.id, false)} style={styles.fill} />
          <Button label={p.kind === 'entry' ? 'Add entry' : 'Create'} onPress={() => onRespond(item.id, true)} style={styles.fill} />
        </View>
      ) : (
        <Text variant="caption" color={status === 'saved' ? 'income' : 'textMuted'}>
          {status === 'saved' ? (p.kind === 'entry' ? '✓ Added' : '✓ Created') : p.kind === 'entry' ? 'Not added' : 'Not created'}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -10, height: 52 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%', alignSelf: 'flex-start' },
  mine: { alignSelf: 'flex-end' },
  bold: { fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11 },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
