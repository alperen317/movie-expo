import { tmdbFetch } from './client';
import type { TMDBMultiSearchResponse } from './types';

export function searchMulti(query: string, page = 1) {
  return tmdbFetch<TMDBMultiSearchResponse>('/search/multi', {
    query,
    page: String(page),
    include_adult: 'false',
  });
}
