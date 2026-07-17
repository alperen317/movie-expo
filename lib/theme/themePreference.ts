import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

export const THEME_STORAGE_KEY = 'previously:theme';

export const themePreferences = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

export async function getStoredThemePreference(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export async function setStoredThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
}

// Drives NativeWind's color scheme, which toggles the `dark` class (and thus the
// CSS variables in global.css) globally — including inside RN Modals.
export function applyThemePreference(preference: ThemePreference): void {
  colorScheme.set(preference);
}

export async function applyStoredThemePreference(): Promise<void> {
  applyThemePreference(await getStoredThemePreference());
}

export async function changeThemePreference(preference: ThemePreference): Promise<void> {
  await setStoredThemePreference(preference);
  applyThemePreference(preference);
}
