import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recent-searches';
const MAX_ITEMS = 8;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  const existing = await getRecentSearches();
  const deduped = existing.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...deduped].slice(0, MAX_ITEMS);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
