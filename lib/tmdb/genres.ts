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

export interface GenreOption {
  name: string;
  movieId: number | null;
  tvId: number | null;
}

// Browsing by filter needs ids, and one display name can stand for a different
// id per scope: Comedy is 35 in both maps, "Sci-Fi & Fantasy" exists only for TV
// and "Science Fiction" only for film. Keying the catalog by the translated name
// keeps the chip list free of duplicates while remembering which scopes can
// actually be queried for it. `language` is optional and only ever needs passing
// by callers that must rebuild when the UI language changes.
export function getGenreCatalog(language?: string): GenreOption[] {
  const byName = new Map<string, GenreOption>();
  const translate = (key: string, fallback: string) =>
    i18n.t(key, { defaultValue: fallback, ...(language ? { lng: language } : {}) });

  for (const [idString, fallback] of Object.entries(TMDB_GENRE_MAP)) {
    const id = Number(idString);
    const name = translate(`genres.movie.${id}`, fallback);
    byName.set(name, { name, movieId: id, tvId: null });
  }

  for (const [idString, fallback] of Object.entries(TMDB_TV_GENRE_MAP)) {
    const id = Number(idString);
    const name = translate(`genres.tv.${id}`, fallback);
    const existing = byName.get(name);
    if (existing) existing.tvId = id;
    else byName.set(name, { name, movieId: null, tvId: id });
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

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
