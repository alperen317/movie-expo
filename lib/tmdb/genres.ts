import i18n from '../i18n';
import { supportedLanguages } from '../i18n/languagePreference';

export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export const TMDB_TV_GENRE_MAP: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

// List/search/trending responses only carry `genre_ids`, so names are resolved
// from these maps rather than the (localized) detail payload. Translate each
// resolved name through i18n, keyed by TMDB genre id, with the English map as
// the fallback for any id that lacks a translation. Unmapped ids are dropped.
export function getAllGenres(genreIds: number[], scope: 'movie' | 'tv' = 'movie'): string[] {
  const map = scope === 'tv' ? TMDB_TV_GENRE_MAP : TMDB_GENRE_MAP;
  return genreIds
    .filter((id) => map[id])
    .map((id) => i18n.t(`genres.${scope}.${id}`, { defaultValue: map[id] }));
}

export function getPrimaryGenre(
  genreIds: number[],
  scope: 'movie' | 'tv' = 'movie',
): string | null {
  return getAllGenres(genreIds, scope)[0] ?? null;
}

// Stored genre names (watch_log/saved_media/list_items rows) are localized to
// whatever the UI language was when the row was written, so the reverse lookup
// checks the English map plus every supported language's translation.
export function getGenreIdByName(name: string, scope: 'movie' | 'tv' = 'movie'): number | null {
  const map = scope === 'tv' ? TMDB_TV_GENRE_MAP : TMDB_GENRE_MAP;
  for (const [idStr, english] of Object.entries(map)) {
    const id = Number(idStr);
    if (english === name) return id;
    for (const lng of supportedLanguages) {
      if (i18n.t(`genres.${scope}.${id}`, { defaultValue: english, lng }) === name) return id;
    }
  }
  return null;
}

// Re-expresses a stored (possibly stale-locale) genre name in the active UI
// language so taste-profile keys line up with freshly mapped TMDB candidates.
export function normalizeGenreName(name: string): string {
  for (const scope of ['movie', 'tv'] as const) {
    const id = getGenreIdByName(name, scope);
    if (id !== null) {
      const map = scope === 'tv' ? TMDB_TV_GENRE_MAP : TMDB_GENRE_MAP;
      return i18n.t(`genres.${scope}.${id}`, { defaultValue: map[id] });
    }
  }
  return name;
}
