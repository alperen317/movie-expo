import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadRememberPreference,
  rememberAwareAuthStorage,
  setRememberPreference,
} from './authStorage';

jest.mock('@react-native-async-storage/async-storage', () => {
  // jest.mock factories are hoisted above the imports, so a static import can't
  // be referenced here — require is the supported pattern for mock factories.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const SESSION_KEY = 'previously.session';

describe('rememberAwareAuthStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await setRememberPreference(true);
    await rememberAwareAuthStorage.removeItem(SESSION_KEY);
  });

  it('persists the session to disk when remember me is on', async () => {
    await setRememberPreference(true);
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

    expect(await AsyncStorage.getItem(SESSION_KEY)).toBe('token');
    expect(await rememberAwareAuthStorage.getItem(SESSION_KEY)).toBe('token');
  });

  it('keeps the session out of disk storage when remember me is off', async () => {
    await setRememberPreference(false);
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

    // Readable during the running session...
    expect(await rememberAwareAuthStorage.getItem(SESSION_KEY)).toBe('token');
    // ...but never written to disk, so a cold start won't restore it.
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('drops an already-persisted token once remember me is turned off', async () => {
    await setRememberPreference(true);
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

    await setRememberPreference(false);
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'refreshed-token');

    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restores the saved preference from disk on a cold start', async () => {
    await setRememberPreference(false);
    // Simulate a fresh launch re-reading the flag before the session loads.
    await loadRememberPreference();
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });

  // A browser refresh throws away the JS heap, so an opted-out session held in
  // memory would sign the user out on every reload. sessionStorage survives the
  // reload and still dies with the tab.
  describe('on web', () => {
    const globals = globalThis as { window?: unknown };

    function fakeSessionStorage() {
      const entries = new Map<string, string>();
      return {
        getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, value: string) => void entries.set(key, value),
        removeItem: (key: string) => void entries.delete(key),
      };
    }

    afterEach(() => {
      delete globals.window;
    });

    it('parks an opted-out session in sessionStorage, not on disk', async () => {
      const sessionStorage = fakeSessionStorage();
      globals.window = { sessionStorage };

      await setRememberPreference(false);
      await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

      expect(sessionStorage.getItem(SESSION_KEY)).toBe('token');
      expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
      expect(await rememberAwareAuthStorage.getItem(SESSION_KEY)).toBe('token');
    });

    it('keeps a remembered session on disk rather than in sessionStorage', async () => {
      const sessionStorage = fakeSessionStorage();
      globals.window = { sessionStorage };

      await setRememberPreference(true);
      await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(SESSION_KEY)).toBe('token');
    });
  });

  it('removeItem clears both the in-memory and on-disk copies', async () => {
    await setRememberPreference(true);
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

    await rememberAwareAuthStorage.removeItem(SESSION_KEY);

    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await rememberAwareAuthStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
