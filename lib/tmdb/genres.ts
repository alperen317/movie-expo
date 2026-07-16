import i18n from '../i18n';

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
// from these maps rather than the (localized) detail payload. Translate the
// resolved name through i18n, keyed by TMDB genre id, with the English map as
// the fallback for any id that lacks a translation.
export function getPrimaryGenre(
  genreIds: number[],
  scope: 'movie' | 'tv' = 'movie',
): string | null {
  const [first] = genreIds;
  if (first === undefined) return null;
  const fallback = (scope === 'tv' ? TMDB_TV_GENRE_MAP : TMDB_GENRE_MAP)[first];
  if (!fallback) return null;
  return i18n.t(`genres.${scope}.${first}`, { defaultValue: fallback });
}
