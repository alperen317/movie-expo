import { tmdbFetch } from './client';
import type { TMDBPopularTVResponse, TMDBSeasonDetails, TMDBTVShowDetails } from './types';

export function getPopularTVShows(page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>('/tv/popular', { page: String(page) });
}

export function getTVShowDetails(id: number) {
  return tmdbFetch<TMDBTVShowDetails>(`/tv/${id}`, {
    append_to_response: 'credits,content_ratings,images,videos,watch/providers',
  });
}

export function getSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch<TMDBSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}
