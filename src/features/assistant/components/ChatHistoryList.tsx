import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDayLabel, formatMonth, monthOf, type ISODate } from '@/shared/lib/dates';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { CHAT_KEEP_DAYS } from '../domain/chatHistory';
import type { ChatDay } from '../domain/types';
import { useChatDays } from '../hooks/useChatHistory';
import { ScreenHeader } from './ScreenHeader';

type Row =
  | { key: string; kind: 'month'; label: string }
  | { key: string; kind: 'day'; day: ChatDay; first: boolean; last: boolean };

/** Group days under month headers; first/last mark the rounded ends of each card. */
function toRows(days: readonly ChatDay[]): Row[] {
  const rows: Row[] = [];
  days.forEach((d, i) => {
    const month = monthOf(d.day);
    const first = i === 0 || monthOf(days[i - 1].day) !== month;
    const last = i === days.length - 1 || monthOf(days[i + 1].day) !== month;
    if (first) rows.push({ key: `m:${month}`, kind: 'month', label: formatMonth(month) });
    rows.push({ key: d.day, kind: 'day', day: d, first, last });
  });
  return rows;
}

/** Past Ask Money chats, one per day, newest first. */
export function ChatHistoryList() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const today = useUiStore((s) => s.today);
  const { data, loading } = useChatDays();
  const rows = useMemo(() => toRows(data ?? []), [data]);

  const open = (day: ISODate) => {
    // Today's chat is the live one we came from.
    if (day === today) router.back();
    else router.push({ pathname: '/assistant/day/[day]', params: { day } });
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScreenHeader title="Chat history" />
      {loading ? (
        <ActivityIndicator color={colors.textMuted} style={{ marginTop: spacing.xxxl }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No chats yet"
              hint={`Your Ask Money chats are kept here for ${CHAT_KEEP_DAYS} days.`}
            />
          }
          ListFooterComponent={
            rows.length > 0 ? (
              <Text variant="caption" color="textFaint" align="center" style={{ marginTop: spacing.xl }}>
                Chats stay on this phone for {CHAT_KEEP_DAYS} days and are not in backups.
              </Text>
            ) : undefined
          }
          renderItem={({ item }) =>
            item.kind === 'month' ? (
              <Text variant="micro" color="textMuted" style={{ marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.xs }}>
                {item.label}
              </Text>
            ) : (
              <DayRow day={item.day} today={today} first={item.first} last={item.last} onOpen={open} />
            )
          }
        />
      )}
    </View>
  );
}

const DayRow = memo(function DayRow({
  day,
  today,
  first,
  last,
  onOpen,
}: {
  day: ChatDay;
  today: ISODate;
  first: boolean;
  last: boolean;
  onOpen: (day: ISODate) => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const isToday = day.day === today;
  const meta = [
    `${day.messages} ${day.messages === 1 ? 'message' : 'messages'}`,
    day.photos > 0 ? `${day.photos} ${day.photos === 1 ? 'photo' : 'photos'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        onPress={() => onOpen(day.day)}
        accessibilityRole="button"
        accessibilityLabel={`${formatDayLabel(day.day, today)}: ${day.preview}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            gap: spacing.md,
            borderTopLeftRadius: first ? radius.lg : 0,
            borderTopRightRadius: first ? radius.lg : 0,
            borderBottomLeftRadius: last ? radius.lg : 0,
            borderBottomRightRadius: last ? radius.lg : 0,
          },
        ]}
      >
        <View style={[styles.badge, { backgroundColor: isToday ? colors.accent : colors.surfaceMuted }]}>
          <Icon
            name={day.photos > 0 ? 'receipt-outline' : 'chatbubble-ellipses-outline'}
            size={18}
            color={isToday ? 'onAccent' : 'textMuted'}
          />
        </View>
        <View style={styles.fill}>
          <Text variant="body" numberOfLines={1} style={styles.bold}>
            {formatDayLabel(day.day, today)}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {day.preview}
          </Text>
          <Text variant="caption" color="textFaint" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color="textFaint" />
      </Pressable>
      {!last && <View style={[styles.sep, { backgroundColor: colors.divider, marginLeft: spacing.lg + 40 + spacing.md }]} />}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bold: { fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth },
});
