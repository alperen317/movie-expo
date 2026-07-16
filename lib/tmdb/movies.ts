import { tmdbFetch } from './client';
import type { TMDBDiscoverMovieResponse, TMDBMovieDetails, TMDBTrendingResponse } from './types';

export function getTrendingMovies(window: 'day' | 'week' = 'day', page = 1) {
  return tmdbFetch<TMDBTrendingResponse>(`/trending/movie/${window}`, { page: String(page) });
}

export function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, {
    append_to_response: 'credits,release_dates,images,videos,watch/providers',
    // Keep the gallery rich regardless of UI language: the localized `language`
    // filter would otherwise drop backdrops that aren't tagged for that locale.
    include_image_language: 'en,null',
  });
}

export function discoverMoviesByGenre(genreId: number, page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/discover/movie', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  });
}
