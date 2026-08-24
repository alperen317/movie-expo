import { api } from './client';

interface DismissedMediaDto {
  mediaId: number;
  mediaType: 'movie' | 'tv';
}

// Keys use the app-wide `${mediaType}-${mediaId}` convention.
export async function fetchDismissedKeys(): Promise<Set<string>> {
  const items = await api.get<DismissedMediaDto[]>('/recommendation-feedback');
  return new Set(items.map((item) => `${item.mediaType}-${item.mediaId}`));
}

export function addDismissed(mediaType: 'movie' | 'tv', mediaId: number): Promise<void> {
  return api.post('/recommendation-feedback', { mediaId, mediaType });
}
