import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { exportBackup, pickBackup, restoreBackup } from '@/features/backup';
import { haptics } from '@/shared/lib/haptics';
import { useSettingsStore, type ThemePreference } from '@/shared/store/settingsStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function SettingsScreen() {
  const { colors, spacing, radius } = useTheme();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const onExport = async () => {
    setBusy('export');
    const r = await exportBackup();
    setBusy(null);
    if (!r.ok) showToast({ message: r.error });
  };

  const onImport = async () => {
    setBusy('import');
    const picked = await pickBackup();
    setBusy(null);
    if (!picked.ok) {
      haptics.warning();
      showToast({ message: picked.error });
      return;
    }
    const backup = picked.value;
    if (!backup) return;

    Alert.alert(
      'Replace all data?',
      `This backup has ${backup.transactions.length} entries. Everything currently in the app will be replaced.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            const r = await restoreBackup(backup);
            if (r.ok) haptics.success();
            showToast({ message: r.ok ? `Restored ${r.value.count} entries` : r.error });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back} pressedScale={0.88}>
          <Icon name="chevron-back" size={24} />
        </PressableScale>
        <Text variant="title">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
        <Section title="Appearance">
          <SegmentedControl<ThemePreference> options={THEME_OPTIONS} value={theme} onChange={setTheme} />
        </Section>

        <Section title="Backup">
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
            <Row icon="share-outline" label="Export data" hint="Save a JSON file" busy={busy === 'export'} onPress={onExport} />
            <View style={[styles.divider, { backgroundColor: colors.divider, marginLeft: 56 }]} />
            <Row icon="download-outline" label="Import data" hint="Restore from a backup file" busy={busy === 'import'} onPress={onImport} />
          </View>
        </Section>

        <Text variant="caption" color="textFaint" align="center">
          Money · v{Constants.expoConfig?.version ?? '1.0.0'} · Your data stays on this phone
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="micro" color="textMuted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
  busy,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint: string;
  busy: boolean;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={busy} pressedScale={0.98} accessibilityRole="button" style={[styles.row, { padding: spacing.lg }]}>
      <Icon name={icon} size={22} color="textMuted" />
      <View style={styles.rowText}>
        <Text variant="body" style={styles.rowLabel}>
          {label}
        </Text>
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      </View>
      {busy ? <ActivityIndicator color={colors.textMuted} /> : <Icon name="chevron-forward" size={18} color="textFaint" />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -10, height: 52 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowText: { flex: 1 },
  rowLabel: { fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth },
});
