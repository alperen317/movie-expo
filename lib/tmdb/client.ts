import { TMDB_ACCESS_TOKEN, TMDB_BASE_URL } from './config';
import i18n from '../i18n';

// TMDB expects an ISO 639-1 (optionally region-qualified) language tag. Map the
// app's active UI language to it so titles, overviews, genre names, and
// biographies come back in the same language as the rest of the UI. TMDB falls
// back to English automatically for any field that lacks a translation.
function activeTmdbLanguage(): string {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US';
}

export async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  if (!TMDB_ACCESS_TOKEN) {
    throw new Error(
      'Missing EXPO_PUBLIC_TMDB_ACCESS_TOKEN. Add it to your .env file and restart Expo.',
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  // Default to the active language; an explicit `language` in params still wins.
  url.searchParams.set('language', activeTmdbLanguage());
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
