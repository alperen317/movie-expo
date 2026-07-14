import { TMDB_ACCESS_TOKEN, TMDB_BASE_URL } from './config';

export async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  if (!TMDB_ACCESS_TOKEN) {
    throw new Error(
      'Missing EXPO_PUBLIC_TMDB_ACCESS_TOKEN. Add it to your .env file and restart Expo.',
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
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
