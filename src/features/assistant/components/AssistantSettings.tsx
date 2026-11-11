import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { haptics } from '@/shared/lib/haptics';
import { useSettingsStore, type AssistantModelPreference } from '@/shared/store/settingsStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { loadApiKey, looksLikeKey, maskKey, removeApiKey, saveApiKey } from '../services/apiKey';
import { testKey } from '../services/chatEngine';

const MODELS = [
  { value: 'claude-haiku-5-5', label: 'Haiku · cheaper' },
  { value: 'claude-opus-5-5', label: 'Opus · smartest' },
] as const;

/** "Ask Money" switch, API key, and model choice, for the Settings screen. */
export function AssistantSettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const enabled = useSettingsStore((s) => s.assistant);
  const setEnabled = useSettingsStore((s) => s.setAssistant);
  const model = useSettingsStore((s) => s.assistantModel);
  const setModel = useSettingsStore((s) => s.setAssistantModel);
  const showToast = useUiStore((s) => s.showToast);

  const [saved, setSaved] = useState<string | null | undefined>(undefined); // undefined = loading
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadApiKey().then((k) => alive && setSaved(k));
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    const key = draft.trim();
    if (!looksLikeKey(key)) {
      haptics.warning();
      showToast({ message: 'That doesn\'t look like an Anthropic key (sk-ant-…)' });
      return;
    }
    setBusy(true);
    const problem = await testKey(key);
    if (problem) {
      setBusy(false);
      haptics.warning();
      showToast({ message: problem });
      return;
    }
    await saveApiKey(key);
    setBusy(false);
    setSaved(key);
    setDraft('');
    haptics.success();
    showToast({ message: 'API key saved' });
  };

  const test = async () => {
    if (!saved) return;
    setBusy(true);
    const problem = await testKey(saved);
    setBusy(false);
    showToast({ message: problem ?? 'The key works' });
  };

  const remove = () =>
    Alert.alert('Remove API key?', 'Ask Money will stop working until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeApiKey();
          setSaved(null);
          showToast({ message: 'API key removed' });
        },
      },
    ]);

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
      <View style={[styles.row, { padding: spacing.lg }]}>
        <Icon name="sparkles-outline" size={22} color="textMuted" />
        <View style={styles.flex}>
          <Text variant="body" style={styles.label}>
            Ask Money
          </Text>
          <Text variant="caption" color="textMuted">
            Chat about your money with Claude
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          accessibilityLabel="Ask Money"
          trackColor={{ false: colors.surfaceMuted, true: colors.income }}
          thumbColor={colors.onAccent === '#FFFFFF' ? '#FFFFFF' : colors.text}
        />
      </View>

      {enabled && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Text variant="caption" color="textMuted">
              Anthropic API key
            </Text>

            {saved === undefined ? (
              <ActivityIndicator color={colors.textMuted} />
            ) : saved ? (
              <View style={[styles.row, { gap: spacing.sm }]}>
                <View style={[styles.keyBox, styles.flex, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]}>
                  <Icon name="key-outline" size={16} color="textMuted" />
                  <Text variant="caption" style={styles.label}>
                    {maskKey(saved)}
                  </Text>
                </View>
                <Button label={busy ? '…' : 'Test'} variant="secondary" onPress={test} disabled={busy} style={styles.small} />
                <Button label="Remove" variant="ghost" onPress={remove} disabled={busy} style={styles.small} />
              </View>
            ) : (
              <View style={[styles.row, { gap: spacing.sm }]}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="sk-ant-…"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  accessibilityLabel="Anthropic API key"
                  style={[
                    typography.caption,
                    styles.flex,
                    styles.input,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, color: colors.text },
                  ]}
                />
                <Button label={busy ? 'Checking…' : 'Save'} onPress={save} disabled={busy || !draft.trim()} style={styles.small} />
              </View>
            )}

            <Text variant="caption" color="textMuted">
              Model
            </Text>
            <SegmentedControl<AssistantModelPreference> options={MODELS} value={model} onChange={setModel} />

            <Text variant="caption" color="textFaint">
              The key stays encrypted on this phone. When you ask a question, only the totals and entries needed to
              answer it (and any photo you attach) are sent to Anthropic. Nothing is sent unless you chat. Tip: set a monthly spend limit in the
              Anthropic Console.
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1 },
  label: { fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  keyBox: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  input: { height: 44, paddingHorizontal: 12, paddingVertical: 0 },
  small: { height: 44, paddingHorizontal: 14 },
});
