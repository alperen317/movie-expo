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

export function getTopRatedMovies(page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/movie/top_rated', { page: String(page) });
}

export function getUpcomingMovies(page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/movie/upcoming', { page: String(page) });
}

export function getMovieRecommendations(id: number, page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>(`/movie/${id}/recommendations`, {
    page: String(page),
  });
}

export function getSimilarMovies(id: number, page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>(`/movie/${id}/similar`, { page: String(page) });
}

// Backs the "because you watch <person>" rail: everything TMDB credits the
// person on (cast or crew), most popular first.
export function discoverMoviesByPerson(personId: number, page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/discover/movie', {
    with_people: String(personId),
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

// The decade rows only want titles that are actually from that decade and have
// enough votes to be worth recommending, hence the vote_count floor.
export function discoverMoviesByDecade(decadeStart: number, page = 1) {
  return tmdbFetch<TMDBDiscoverMovieResponse>('/discover/movie', {
    'primary_release_date.gte': `${decadeStart}-01-01`,
    'primary_release_date.lte': `${decadeStart + 9}-12-31`,
    sort_by: 'popularity.desc',
    'vote_count.gte': '200',
    page: String(page),
  });
}
