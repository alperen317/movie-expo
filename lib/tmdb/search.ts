import { tmdbFetch } from './client';
import type {
  TMDBDiscoverMovieResponse,
  TMDBMultiSearchResponse,
  TMDBPopularTVResponse,
} from './types';

export function searchMulti(query: string, page = 1) {
  return tmdbFetch<TMDBMultiSearchResponse>('/search/multi', {
    query,
    page: String(page),
    include_adult: 'false',
  });
}

// Media-type-specific search, used by the import matcher: more precise than
// /search/multi since the source data already tells us movie vs tv.
export function searchMovies(query: string, year?: string | null) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/search/movie', {
    query,
    include_adult: 'false',
    ...(year ? { primary_release_year: year } : {}),
  });
}

export function searchTVShows(query: string, year?: string | null) {
  return tmdbFetch<TMDBPopularTVResponse>('/search/tv', {
    query,
    include_adult: 'false',
    ...(year ? { first_air_date_year: year } : {}),
  });
}
