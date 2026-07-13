import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMovieDetails } from './movies';
import { getTVShowDetails } from './tv';

export interface MediaMetadata {
  runtimeMinutes: number;
  genres: string[];
}

const STORAGE_PREFIX = 'media-meta-';
const memoryCache = new Map<string, MediaMetadata>();

function cacheKey(mediaType: 'movie' | 'tv', id: number): string {
  return `${mediaType}-${id}`;
}

// Runtime/genres never change for a given title, so once fetched they're
// cached indefinitely (memory + AsyncStorage) to avoid re-fetching TMDB
// details for every title every time the stats screen loads.
export async function getMediaMetadata(mediaType: 'movie' | 'tv', id: number): Promise<MediaMetadata> {
  const key = cacheKey(mediaType, id);

  const cached = memoryCache.get(key);
  if (cached) return cached;

  const stored = await AsyncStorage.getItem(STORAGE_PREFIX + key);
  if (stored) {
    const parsed = JSON.parse(stored) as MediaMetadata;
    memoryCache.set(key, parsed);
    return parsed;
  }

  const metadata: MediaMetadata =
    mediaType === 'movie'
      ? await (async () => {
          const details = await getMovieDetails(id);
          return {
            runtimeMinutes: details.runtime ?? 0,
            genres: details.genres.map((genre) => genre.name),
          };
        })()
      : await (async () => {
          const details = await getTVShowDetails(id);
          return {
            runtimeMinutes: details.episode_run_time?.[0] ?? 0,
            genres: details.genres.map((genre) => genre.name),
          };
        })();

  memoryCache.set(key, metadata);
  AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(metadata)).catch(() => {});
  return metadata;
}
