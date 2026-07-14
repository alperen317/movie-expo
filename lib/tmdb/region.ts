import { getLocales } from 'expo-localization';

export function getDeviceRegion(): string {
  return getLocales()[0]?.regionCode ?? 'US';
}

// A user's explicit "watch region" setting (stored on their profile) takes
// priority over the device locale, for people tracking a foreign catalog.
export function getEffectiveRegion(override?: string | null): string {
  return override || getDeviceRegion();
}
