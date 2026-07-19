import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n from '../i18n';
import { getMovieDetails } from './movies';
import { getTVShowDetails } from './tv';

export interface MediaPerson {
  id: number;
  name: string;
}

export interface MediaMetadata {
  runtimeMinutes: number;
  genres: string[];
  /** Leading billed cast, at most TOP_CAST_LIMIT entries. */
  topCast: MediaPerson[];
  /** Movie director, or the first series creator for TV. */
  director: MediaPerson | null;
}

const TOP_CAST_LIMIT = 5;

// v2: entries written before the credits fields existed lack topCast/director,
// so the prefix bump forces a one-time refetch. Old v1 keys are left behind as
// harmless dead weight in AsyncStorage.
const STORAGE_PREFIX = 'media-meta-v2-';
const memoryCache = new Map<string, MediaMetadata>();

// Genres are stored localized (they come from the TMDB detail payload, which is
// now language-aware), so the cache is scoped by language -- otherwise switching
// languages would surface stale genre names on the stats screen.
function cacheKey(mediaType: 'movie' | 'tv', id: number): string {
  return `${i18n.language}-${mediaType}-${id}`;
}

// Runtime/genres/credits never change meaningfully for a given title, so once
// fetched they're cached indefinitely (memory + AsyncStorage) to avoid
// re-fetching TMDB details for every title on every stats/recommendations load.
export async function getMediaMetadata(
  mediaType: 'movie' | 'tv',
  id: number,
): Promise<MediaMetadata> {
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
          const director = details.credits.crew?.find((member) => member.job === 'Director');
          return {
            runtimeMinutes: details.runtime ?? 0,
            genres: details.genres.map((genre) => genre.name),
            topCast: details.credits.cast
              .slice(0, TOP_CAST_LIMIT)
              .map((member) => ({ id: member.id, name: member.name })),
            director: director ? { id: director.id, name: director.name } : null,
          };
        })()
      : await (async () => {
          const details = await getTVShowDetails(id);
          const creator = details.created_by?.[0];
          return {
            runtimeMinutes: details.episode_run_time?.[0] ?? 0,
            genres: details.genres.map((genre) => genre.name),
            topCast: details.credits.cast
              .slice(0, TOP_CAST_LIMIT)
              .map((member) => ({ id: member.id, name: member.name })),
            director: creator ? { id: creator.id, name: creator.name } : null,
          };
        })();

  memoryCache.set(key, metadata);
  AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(metadata)).catch(() => {});
  return metadata;
}
