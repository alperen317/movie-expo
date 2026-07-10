import { tmdbFetch } from './client';
import type { TMDBTrendingResponse } from './types';

export function getTrendingMovies(window: 'day' | 'week' = 'day') {
  return tmdbFetch<TMDBTrendingResponse>(`/trending/movie/${window}`);
}
