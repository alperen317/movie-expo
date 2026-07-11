import { tmdbFetch } from './client';
import type { TMDBDiscoverMovieResponse, TMDBMovieDetails, TMDBTrendingResponse } from './types';

export function getTrendingMovies(window: 'day' | 'week' = 'day', page = 1) {
  return tmdbFetch<TMDBTrendingResponse>(`/trending/movie/${window}`, { page: String(page) });
}

export function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, {
    append_to_response: 'credits,release_dates,images,videos',
  });
}

export function discoverMoviesByGenre(genreId: number, page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/discover/movie', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  });
}
