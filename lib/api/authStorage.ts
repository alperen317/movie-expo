import AsyncStorage from '@react-native-async-storage/async-storage';

// The API client reads and writes its tokens through this adapter. "Remember
// me" decides whether that session outlives an app restart: when the user opts
// out, tokens are kept off disk and held only for the current run, so starting
// the app again returns to the login screen instead of restoring them.

const REMEMBER_PREFERENCE_KEY = 'auth.rememberMe';

const memoryStore = new Map<string, string>();
let persistToDisk = true;

// What "the current run" means differs by platform. On the web a page refresh
// is a routine navigation, not a relaunch -- it throws away the JS heap, so an
// in-memory token would sign the user out on every F5. sessionStorage has
// exactly the intended lifetime there: it survives a reload and is dropped when
// the tab closes. React Native defines `window` but no sessionStorage, and
// can't reload without restarting the process, so the in-memory map already has
// that lifetime on native.
function tabScopedStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage ?? null;
  } catch {
    // Access throws outright when the browser blocks storage (Safari private
    // mode, third-party iframe); fall back to memory rather than crashing.
    return null;
  }
}

const ephemeralStore = {
  get(key: string): string | null {
    const tabStorage = tabScopedStorage();
    return tabStorage ? tabStorage.getItem(key) : (memoryStore.get(key) ?? null);
  },
  set(key: string, value: string): void {
    const tabStorage = tabScopedStorage();
    if (tabStorage) tabStorage.setItem(key, value);
    else memoryStore.set(key, value);
  },
  remove(key: string): void {
    const tabStorage = tabScopedStorage();
    if (tabStorage) tabStorage.removeItem(key);
    else memoryStore.delete(key);
  },
};

// Restore the saved preference before the token store reads its persisted
// tokens on a cold start, so a refresh is written back to the same place the
// tokens were read from. Defaults to persisting if the flag can't be read.
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
    const ephemeral = ephemeralStore.get(key);
    if (ephemeral !== null) return ephemeral;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (persistToDisk) {
      ephemeralStore.remove(key);
      await AsyncStorage.setItem(key, value);
    } else {
      // Hold the token for this run only, and make sure an opted-out session
      // leaves nothing behind on disk to restore later.
      ephemeralStore.set(key, value);
      await AsyncStorage.removeItem(key);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    ephemeralStore.remove(key);
    await AsyncStorage.removeItem(key);
  },
};
