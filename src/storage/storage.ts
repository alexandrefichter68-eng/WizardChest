import AsyncStorage from '@react-native-async-storage/async-storage';

const NAMESPACE = 'wizardchest';

export const STORAGE_KEYS = {
  profile: `${NAMESPACE}:profile`,
  auth: `${NAMESPACE}:auth`,
  settings: `${NAMESPACE}:settings`,
  history: `${NAMESPACE}:history`,
  leaderboard: `${NAMESPACE}:leaderboard`,
  achievements: `${NAMESPACE}:achievements`,
} as const;

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] Failed to read "${key}"`, error);
    return null;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[storage] Failed to write "${key}"`, error);
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[storage] Failed to remove "${key}"`, error);
  }
}

export async function clearAllWizardChestData(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => removeKey(key)));
}
