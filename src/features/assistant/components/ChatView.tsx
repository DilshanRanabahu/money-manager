import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/shared/lib/haptics';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { useChat, type Attachment, type ChatItem } from '../hooks/useChat';
import { pickImage } from '../services/receiptImage';
import { ProposalCard } from './ProposalCard';
import { RichText } from './RichText';
import { ToolCard } from './ToolCard';
import { TypingDots } from './TypingDots';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Where did most of my money go?',
  'Compare this month with last month',
  'Lunch 850, bus 160 today',
  'Add a Fuel expense category',
];

/** Full-screen "Ask Money" chat. */
export function ChatView() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, busy, activity, send, respond, undo } = useChat();
  const showToast = useUiStore((s) => s.showToast);
  const [text, setText] = useState('');
  const [image, setImage] = useState<Attachment | null>(null);
  const list = useRef<FlatList<ChatItem>>(null);
  const canSend = !busy && (!!text.trim() || !!image);

  const submit = (value = text) => {
    if (busy || (!value.trim() && !image)) return;
    setText('');
    setImage(null);
    void send(value, image ?? undefined);
  };

  const attach = (source: 'camera' | 'library') => async () => {
    const r = await pickImage(source);
    if (!r.ok) {
      haptics.warning();
      showToast({ message: r.error });
      return;
    }
    if (r.value) setImage(r.value);
  };

  const chooseSource = () =>
    Alert.alert('Add a receipt', 'The photo is sent to Claude only when you send the message.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photo', onPress: attach('library') },
      { text: 'Take photo', onPress: attach('camera') },
    ]);

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
        renderItem={({ item }) => <Message item={item} onRespond={respond} onUndo={undo} />}
      />

      {image && (
        <View style={[styles.preview, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <Image source={{ uri: image.uri }} style={[styles.thumb, { borderRadius: radius.md }]} />
          <PressableScale
            onPress={() => setImage(null)}
            accessibilityLabel="Remove photo"
            style={[styles.remove, { backgroundColor: colors.surfaceMuted, borderRadius: radius.full }]}
          >
            <Icon name="close" size={14} />
          </PressableScale>
        </View>
      )}

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
        <PressableScale
          onPress={chooseSource}
          disabled={busy}
          accessibilityLabel="Add a receipt photo"
          style={[styles.send, { backgroundColor: colors.surface, borderRadius: radius.full }]}
        >
          <Icon name="camera-outline" size={20} color="textMuted" />
        </PressableScale>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={image ? 'Add a note (optional)…' : 'Ask about your money…'}
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
          disabled={!canSend}
          accessibilityLabel="Send"
          style={[
            styles.send,
            { backgroundColor: colors.accent, borderRadius: radius.full, opacity: canSend ? 1 : 0.35 },
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

function Message({
  item,
  onRespond,
  onUndo,
}: {
  item: ChatItem;
  onRespond: (id: string, ok: boolean) => void;
  onUndo: (id: string, entryId: string) => void;
}) {
  const { colors, radius, spacing } = useTheme();

  if (item.kind === 'user') {
    return (
      <Animated.View
        entering={FadeInDown.duration(180)}
        style={[styles.bubble, styles.mine, { backgroundColor: colors.accent, borderRadius: radius.lg, gap: spacing.sm }]}
      >
        {item.imageUri && <Image source={{ uri: item.imageUri }} style={[styles.sent, { borderRadius: radius.md }]} />}
        {!!item.text && (
          <Text variant="body" color="onAccent">
            {item.text}
          </Text>
        )}
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
  return <ProposalCard item={item} onRespond={onRespond} onUndo={onUndo} />;
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
  preview: { flexDirection: 'row' },
  thumb: { width: 64, height: 64 },
  remove: { position: 'absolute', top: 2, left: 54, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  sent: { width: 180, height: 180 },
});
