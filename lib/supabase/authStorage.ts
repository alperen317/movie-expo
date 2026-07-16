import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase reads and writes the auth session through this adapter. "Remember
// me" decides whether that session outlives an app restart: when the user opts
// out, tokens are held only in memory for the current run and kept off disk, so
// relaunching the app returns to the login screen instead of restoring them.

const REMEMBER_PREFERENCE_KEY = 'auth.rememberMe';

const memoryStore = new Map<string, string>();
let persistToDisk = true;

// Restore the saved preference before Supabase reads the stored session on a
// cold start, so token refreshes are written back to the same place the
// session was read from. Defaults to persisting if the flag can't be read.
export async function loadRememberPreference(): Promise<void> {
  const value = await AsyncStorage.getItem(REMEMBER_PREFERENCE_KEY);
  persistToDisk = value !== 'false';
}

export async function setRememberPreference(remember: boolean): Promise<void> {
  persistToDisk = remember;
  await AsyncStorage.setItem(REMEMBER_PREFERENCE_KEY, remember ? 'true' : 'false');
}

export const rememberAwareAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (memoryStore.has(key)) return memoryStore.get(key) ?? null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (persistToDisk) {
      memoryStore.delete(key);
      await AsyncStorage.setItem(key, value);
    } else {
      // Keep the token in memory for this run only and make sure an opted-out
      // session leaves nothing behind on disk to restore later.
      memoryStore.set(key, value);
      await AsyncStorage.removeItem(key);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    await AsyncStorage.removeItem(key);
  },
};
