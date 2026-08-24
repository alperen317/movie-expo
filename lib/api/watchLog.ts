import { api } from './client';
import type { MediaCardItem } from '../../components/home/MovieCard';

export interface WatchLogEntry extends MediaCardItem {
  logId: string;
  watchedAt: string;
  rating: number | null;
  note: string | null;
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

export function fetchWatchLog(): Promise<WatchLogEntry[]> {
  return api.get('/watch-log');
}

export function addWatchLogEntry(
  item: MediaCardItem,
  options: { watchedAt: Date; rating: number | null; note?: string | null },
): Promise<WatchLogEntry> {
  return api.post('/watch-log', {
    title: titleRequest(item),
    watchedAt: options.watchedAt.toISOString(),
    rating: options.rating,
    note: options.note ?? null,
  });
}

const BATCH_CHUNK_SIZE = 500;

// Bulk insert used by the TV Time / Letterboxd importer. No uniqueness
// constraint on watch-log rows (rewatches are allowed by design), so this is
// a plain insert, chunked at the server's own per-request ceiling
// (Batches.MaxTitles).
export async function addWatchLogEntriesBatch(
  items: { item: MediaCardItem; watchedAt: Date; rating: number | null }[],
): Promise<void> {
  if (items.length === 0) return;

  const bodies = items.map(({ item, watchedAt, rating }) => ({
    title: titleRequest(item),
    watchedAt: watchedAt.toISOString(),
    rating,
    note: null,
  }));

  for (let i = 0; i < bodies.length; i += BATCH_CHUNK_SIZE) {
    await api.post('/watch-log/batch', bodies.slice(i, i + BATCH_CHUNK_SIZE));
  }
}

// Undoing a "watched" mark deletes every row for that title, not just the
// latest: the flag the UI shows is "has any watch-log row", so leaving an
// earlier rewatch behind would keep the title marked watched.
export async function deleteWatchLogEntries(logIds: string[]): Promise<void> {
  if (logIds.length === 0) return;
  await api.delete('/watch-log', { ids: logIds });
}

export function updateWatchLogEntry(
  logId: string,
  options: { watchedAt: Date; rating: number | null; note?: string | null },
): Promise<WatchLogEntry> {
  return api.put(`/watch-log/${logId}`, {
    watchedAt: options.watchedAt.toISOString(),
    rating: options.rating,
    note: options.note ?? null,
  });
}
