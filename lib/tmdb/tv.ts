import { tmdbFetch } from './client';
import type { TMDBPopularTVResponse, TMDBTVShowDetails } from './types';

export function getPopularTVShows(page = 1) {
  return tmdbFetch<TMDBPopularTVResponse>('/tv/popular', { page: String(page) });
}

export function getTVShowDetails(id: number) {
  return tmdbFetch<TMDBTVShowDetails>(`/tv/${id}`, {
    append_to_response: 'credits,content_ratings,images,videos',
  });
}
