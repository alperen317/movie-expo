import { tmdbFetch } from './client';
import type { TMDBMovieDetails, TMDBTrendingResponse } from './types';

export function getTrendingMovies(window: 'day' | 'week' = 'day', page = 1) {
  return tmdbFetch<TMDBTrendingResponse>(`/trending/movie/${window}`, { page: String(page) });
}

export function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, {
    append_to_response: 'credits,release_dates,images,videos',
  });
}
