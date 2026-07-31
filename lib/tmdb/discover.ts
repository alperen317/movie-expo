import { tmdbFetch } from './client';
import type { TMDBDiscoverMovieResponse, TMDBPopularTVResponse } from './types';

export type DiscoverSort = 'popularity' | 'rating' | 'title' | 'year';

export interface DiscoverQuery {
  // Ids for the scope being queried -- the caller resolves display names to
  // per-scope ids, since the same name can be movie-only or TV-only.
  genreIds: number[];
  minRating: number | null;
  decade: number | null;
  sort: DiscoverSort;
  page: number;
}

// A rating floor with no vote floor surfaces titles holding a perfect 10 off
// three votes, which reads as broken. Same threshold the decade rails use.
const MIN_VOTE_COUNT = '200';

const MOVIE_SORT: Record<DiscoverSort, string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  title: 'title.asc',
  year: 'primary_release_date.desc',
};

const TV_SORT: Record<DiscoverSort, string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  title: 'name.asc',
  year: 'first_air_date.desc',
};

function buildParams(
  query: DiscoverQuery,
  dateField: 'primary_release_date' | 'first_air_date',
  sortMap: Record<DiscoverSort, string>,
): Record<string, string> {
  const params: Record<string, string> = {
    include_adult: 'false',
    page: String(query.page),
    sort_by: sortMap[query.sort],
  };

  // Pipe is TMDB's OR; a comma would demand every genre at once, which matches
  // neither the chips' behaviour on search results nor what a viewer means by
  // ticking two genres.
  if (query.genreIds.length > 0) params.with_genres = query.genreIds.join('|');

  if (query.minRating !== null) {
    params['vote_average.gte'] = String(query.minRating);
    params['vote_count.gte'] = MIN_VOTE_COUNT;
  } else if (query.sort === 'rating') {
    // Sorting by score has the same problem as filtering by it.
    params['vote_count.gte'] = MIN_VOTE_COUNT;
  }

  if (query.decade !== null) {
    params[`${dateField}.gte`] = `${query.decade}-01-01`;
    params[`${dateField}.lte`] = `${query.decade + 9}-12-31`;
  }

  return params;
}

export function discoverMovies(query: DiscoverQuery) {
  return tmdbFetch<TMDBDiscoverMovieResponse>(
    '/discover/movie',
    buildParams(query, 'primary_release_date', MOVIE_SORT),
  );
}

export function discoverTVShows(query: DiscoverQuery) {
  return tmdbFetch<TMDBPopularTVResponse>(
    '/discover/tv',
    buildParams(query, 'first_air_date', TV_SORT),
  );
}
