import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

export const LANGUAGE_STORAGE_KEY = 'previously:language';

export const supportedLanguages = ['en', 'tr'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

// 'system' follows the device locale; the explicit codes override it.
export type LanguagePreference = 'system' | SupportedLanguage;

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}

// Follow the device language when we support it, otherwise fall back to English.
export function detectDeviceLanguage(): SupportedLanguage {
  const deviceLanguage = getLocales()[0]?.languageCode;
  return isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'en';
}

export async function getStoredLanguagePreference(): Promise<LanguagePreference> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'system' || isSupportedLanguage(stored)) return stored;
    return 'system';
  } catch {
    return 'system';
  }
}

export async function setStoredLanguagePreference(preference: LanguagePreference): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
}

// The actual language code to load for a given preference.
export function resolveLanguage(preference: LanguagePreference): SupportedLanguage {
  return preference === 'system' ? detectDeviceLanguage() : preference;
}
