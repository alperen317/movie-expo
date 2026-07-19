import { tmdbFetch } from './client';
import type { TMDBPopularTVResponse, TMDBSeasonDetails, TMDBTVShowDetails } from './types';

export function getPopularTVShows(page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>('/tv/popular', { page: String(page) });
}

export function getTopRatedTVShows(page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>('/tv/top_rated', { page: String(page) });
}

export function getTVRecommendations(id: number, page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>(`/tv/${id}/recommendations`, { page: String(page) });
}

export function getSimilarTVShows(id: number, page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>(`/tv/${id}/similar`, { page: String(page) });
}

export function discoverTVShowsByGenre(genreId: number, page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>('/discover/tv', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

export function getTVShowDetails(id: number) {
  return tmdbFetch<TMDBTVShowDetails>(`/tv/${id}`, {
    append_to_response: 'credits,content_ratings,images,videos,watch/providers',
    // Keep the gallery rich regardless of UI language: the localized `language`
    // filter would otherwise drop backdrops that aren't tagged for that locale.
    include_image_language: 'en,null',
  });
}

export function getSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch<TMDBSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}
