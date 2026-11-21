import { useLocalSearchParams } from 'expo-router';

import { ChatDayView } from '@/features/assistant';
import { isValidISODate } from '@/shared/lib/dates';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';

export default function ChatDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  if (!day || !isValidISODate(day)) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Chat not found" />
      </Screen>
    );
  }
  return <ChatDayView day={day} />;
}
