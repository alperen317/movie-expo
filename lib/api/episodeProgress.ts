import { api } from './client';

export interface EpisodeProgressEntry {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
}

export function fetchAllEpisodeProgress(): Promise<EpisodeProgressEntry[]> {
  return api.get('/episode-progress');
}

export function markEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  watchedAt: Date = new Date(),
): Promise<void> {
  return api.put(`/episode-progress/${showId}/${seasonNumber}/${episodeNumber}`, {
    watchedAt: watchedAt.toISOString(),
  });
}

export function unmarkEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  return api.delete(`/episode-progress/${showId}/${seasonNumber}/${episodeNumber}`);
}

// The server caps a batch at 2000 episodes (Batches.MaxEpisodes). The old
// Supabase call sent everything in one upsert; markUpToSeason can plausibly
// build a pair list past that for a long-running show, so this chunks
// defensively even though today's callers rarely get close.
const BATCH_CHUNK_SIZE = 2000;

export async function markEpisodesWatchedBatch(
  showId: number,
  episodeNumbers: { seasonNumber: number; episodeNumber: number }[],
  watchedAt: Date = new Date(),
): Promise<void> {
  if (episodeNumbers.length === 0) return;

  for (let i = 0; i < episodeNumbers.length; i += BATCH_CHUNK_SIZE) {
    await api.post('/episode-progress/batch', {
      showId,
      episodes: episodeNumbers.slice(i, i + BATCH_CHUNK_SIZE),
      watchedAt: watchedAt.toISOString(),
    });
  }
}

export function unmarkSeasonWatched(showId: number, seasonNumber: number): Promise<void> {
  return api.delete(`/episode-progress/${showId}/${seasonNumber}`);
}
