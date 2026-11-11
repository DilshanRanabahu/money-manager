import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DbProvider } from '@/db/DbProvider';
import { cleanupOldExports } from '@/features/backup';
import { AppLockOverlay, useAppLockLifecycle } from '@/features/security';
import { transactionService } from '@/features/transactions';
import { useDayRollover } from '@/shared/hooks/useDayRollover';
import { ThemeProvider, useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { ToastHost } from '@/shared/ui/ToastHost';

export default function RootLayout() {
  useAppLockLifecycle();
  useDayRollover();
  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider>
        <Themed>
          <DbProvider
            onReady={async () => {
              await transactionService.purge();
              cleanupOldExports();
            }}
            splash={<Splash />}
            renderError={(error, retry, erase) => <StartupError message={error.message} onRetry={retry} onErase={erase} />}
          >
            <RootStack />
          </DbProvider>
          <ToastHost />
          {/* Last, so it covers everything above (when app lock is on). */}
          <AppLockOverlay />
        </Themed>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Themed({ children }: { children: React.ReactNode }) {
  const { colors, scheme } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

function RootStack() {
  const { colors } = useTheme();
  const sheet = {
    presentation: 'formSheet',
    sheetAllowedDetents: 'fitToContents',
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    contentStyle: { backgroundColor: colors.surface },
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="assistant" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="category/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="transaction/new" options={sheet} />
      <Stack.Screen name="transaction/[id]" options={sheet} />
    </Stack>
  );
}

function Splash() {
  const { colors } = useTheme();
  return <View style={[styles.fill, { backgroundColor: colors.bg }]} />;
}

function StartupError({
  message,
  onRetry,
  onErase,
}: {
  message: string;
  onRetry: () => void;
  onErase?: () => Promise<void>;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: colors.bg, padding: spacing.xl }]}>
      <Text variant="title" align="center">
        Something went wrong
      </Text>
      <Text variant="body" color="textMuted" align="center" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
        {message}
      </Text>
      <Button label="Try again" onPress={onRetry} />
      {onErase && (
        <Button
          label="Erase and start over"
          variant="ghost"
          style={{ marginTop: spacing.md }}
          onPress={() =>
            Alert.alert('Erase all data?', 'The encrypted data on this phone will be deleted. You can then import a backup file.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Erase', style: 'destructive', onPress: () => void onErase() },
            ])
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
