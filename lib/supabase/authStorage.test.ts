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

const SESSION_KEY = 'sb-auth-token';

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

  it('removeItem clears both the in-memory and on-disk copies', async () => {
    await setRememberPreference(true);
    await rememberAwareAuthStorage.setItem(SESSION_KEY, 'token');

    await rememberAwareAuthStorage.removeItem(SESSION_KEY);

    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await rememberAwareAuthStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
