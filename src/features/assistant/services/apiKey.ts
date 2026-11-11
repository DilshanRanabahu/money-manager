import * as SecureStore from 'expo-secure-store';

/** The user's own Anthropic API key, kept in the Android Keystore. Never bundled or backed up. */
const KEY = 'assistant.anthropicApiKey';

export const looksLikeKey = (s: string) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(s.trim());

/** "sk-ant-…a1b2" */
export const maskKey = (s: string) => `sk-ant-…${s.slice(-4)}`;

export async function loadApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value.trim());
}

export async function removeApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
