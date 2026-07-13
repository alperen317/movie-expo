export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const TMDB_ACCESS_TOKEN = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN;

export type TMDBBackdropSize = 'w780' | 'w1280' | 'original';
export type TMDBPosterSize = 'w185' | 'w342' | 'w500' | 'original';
export type TMDBProfileSize = 'w45' | 'w185' | 'h632' | 'original';
export type TMDBStillSize = 'w185' | 'w300' | 'original';

export function getBackdropUrl(
  path: string | null,
  size: TMDBBackdropSize = 'w1280',
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function getPosterUrl(
  path: string | null,
  size: TMDBPosterSize = 'w342',
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function getProfileUrl(
  path: string | null,
  size: TMDBProfileSize = 'w185',
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function getStillUrl(path: string | null, size: TMDBStillSize = 'w300'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}
