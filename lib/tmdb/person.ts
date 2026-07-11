import { tmdbFetch } from './client';
import type { TMDBPersonDetails } from './types';

export function getPersonDetails(id: number) {
  return tmdbFetch<TMDBPersonDetails>(`/person/${id}`, {
    append_to_response: 'combined_credits',
  });
}
