import { getLocales } from 'expo-localization';

export function getDeviceRegion(): string {
  return getLocales()[0]?.regionCode ?? 'US';
}
