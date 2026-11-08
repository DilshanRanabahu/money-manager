import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DbProvider } from '@/db/DbProvider';
import { transactionService } from '@/features/transactions';
import { ThemeProvider, useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { ToastHost } from '@/shared/ui/ToastHost';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider>
        <Themed>
          <DbProvider
            onReady={() => transactionService.purge()}
            splash={<Splash />}
            renderError={(error, retry) => <StartupError message={error.message} onRetry={retry} />}
          >
            <RootStack />
          </DbProvider>
          <ToastHost />
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

function StartupError({ message, onRetry }: { message: string; onRetry: () => void }) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
