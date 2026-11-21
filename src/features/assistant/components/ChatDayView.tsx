import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDayLabel, type ISODate } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { useChatDay } from '../hooks/useChatHistory';
import { deleteChatDay } from '../services/chatHistory';
import { ChatMessage } from './ChatMessage';
import { ImageViewer } from './ImageViewer';
import { ScreenHeader } from './ScreenHeader';

/** A saved day's chat, read-only. */
export function ChatDayView({ day }: { day: ISODate }) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const today = useUiStore((s) => s.today);
  const showToast = useUiStore((s) => s.showToast);
  const { data, loading } = useChatDay(day);
  const [viewing, setViewing] = useState<string | null>(null);
  const openImage = useCallback((uri: string) => setViewing(uri), []);
  const label = formatDayLabel(day, today);

  const confirmDelete = () =>
    Alert.alert(`Delete ${label}'s chat?`, 'The messages and photos are removed from this phone. Entries you added stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChatDay(day);
          router.back();
          showToast({ message: 'Chat deleted' });
        },
      },
    ]);

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScreenHeader
        title={label}
        subtitle="Read only"
        right={
          data && data.length > 0 ? (
            <PressableScale onPress={confirmDelete} accessibilityLabel="Delete this chat" style={styles.icon} pressedScale={0.88}>
              <Icon name="trash-outline" size={21} color="textMuted" />
            </PressableScale>
          ) : undefined
        }
      />
      {loading ? (
        <ActivityIndicator color={colors.textMuted} style={{ marginTop: spacing.xxxl }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="Nothing saved for this day" />}
          renderItem={({ item }) => <ChatMessage item={item} onOpenImage={openImage} still />}
        />
      )}
      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            borderTopColor: colors.divider,
            gap: spacing.sm,
          },
        ]}
      >
        <View style={[styles.lock, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Icon name="lock-closed-outline" size={14} color="textMuted" />
        </View>
        <Text variant="caption" color="textMuted" style={styles.fill}>
          Past chats are read-only. Ask new questions in today&apos;s chat.
        </Text>
      </View>
      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  lock: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
