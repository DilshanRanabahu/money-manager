import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import type { ChatItem } from '../domain/types';
import { ProposalCard } from './ProposalCard';
import { RichText } from './RichText';
import { ToolCard } from './ToolCard';

type Props = {
  item: ChatItem;
  /** Omitted for saved (read-only) chats: their cards can't be answered. */
  onRespond?: (id: string, ok: boolean) => void;
  onUndo?: (id: string, entryId: string) => void;
  onOpenImage: (uri: string) => void;
  /** Skip the entering animation (history: everything is already there). */
  still?: boolean;
};

/** One message, card or divider in a chat. */
export const ChatMessage = memo(function ChatMessage({ item, onRespond, onUndo, onOpenImage, still }: Props) {
  const { colors, radius, spacing } = useTheme();
  const fadeIn = still ? undefined : FadeIn.duration(180);

  if (item.kind === 'user') {
    const uri = item.imageUri;
    return (
      <Animated.View
        entering={still ? undefined : FadeInDown.duration(180)}
        style={[styles.bubble, styles.mine, { backgroundColor: colors.accent, borderRadius: radius.lg, gap: spacing.sm }]}
      >
        {uri && (
          <Pressable onPress={() => onOpenImage(uri)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
            <Image source={{ uri }} style={[styles.sent, { borderRadius: radius.md }]} />
          </Pressable>
        )}
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
      <Animated.View entering={fadeIn} style={[styles.bubble, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        <RichText text={item.text} />
      </Animated.View>
    );
  }
  if (item.kind === 'error') {
    return (
      <Animated.View entering={fadeIn} style={[styles.bubble, { backgroundColor: colors.expenseSoft, borderRadius: radius.lg }]}>
        <Text variant="caption" color="expense">
          {item.text}
        </Text>
      </Animated.View>
    );
  }
  if (item.kind === 'divider') {
    return (
      <Animated.View entering={fadeIn} style={[styles.divider, { gap: spacing.sm, marginVertical: spacing.sm }]}>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <Text variant="caption" color="textFaint" align="center" style={styles.dividerText}>
          {item.text}
        </Text>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </Animated.View>
    );
  }
  if (item.kind === 'tool') return <ToolCard label={item.label} card={item.card} />;
  return <ProposalCard item={item} onRespond={onRespond} onUndo={onUndo} />;
});

const styles = StyleSheet.create({
  bubble: { paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%', alignSelf: 'flex-start' },
  mine: { alignSelf: 'flex-end' },
  sent: { width: 180, height: 180 },
  divider: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { flexShrink: 1 },
});
