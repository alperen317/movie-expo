import { api } from './client';
import type { MediaCardItem } from '../../components/home/MovieCard';

export type ListType = 'favorite' | 'watchlist';

export interface SavedMediaItem extends MediaCardItem {
  savedAt: string;
}

function titleRequest(item: MediaCardItem) {
  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    year: item.year,
    genres: item.genres,
  };
}

export function fetchSavedMedia(listType: ListType): Promise<SavedMediaItem[]> {
  return api.get('/saved-media', { listType });
}

export async function addSavedMedia(item: MediaCardItem, listType: ListType): Promise<void> {
  await api.post('/saved-media', titleRequest(item), { listType });
}

const BATCH_CHUNK_SIZE = 500;

// Bulk save used by the TV Time / Letterboxd importer. The server silently
// skips titles already saved (same as the old Supabase unique-constraint
// upsert), so re-running an import doesn't error or duplicate rows. Chunked
// at the server's own per-request ceiling (Batches.MaxTitles).
export async function addSavedMediaBatch(
  items: MediaCardItem[],
  listType: ListType,
): Promise<void> {
  if (items.length === 0) return;

  for (let i = 0; i < items.length; i += BATCH_CHUNK_SIZE) {
    await api.post(
      '/saved-media/batch',
      items.slice(i, i + BATCH_CHUNK_SIZE).map(titleRequest),
      { listType },
    );
  }
}

export function removeSavedMedia(
  mediaId: number,
  mediaType: 'movie' | 'tv',
  listType: ListType,
): Promise<void> {
  return api.delete(`/saved-media/${mediaType}/${mediaId}`, undefined, { listType });
}
