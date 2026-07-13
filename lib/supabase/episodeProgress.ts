import { supabase } from './client';

export interface EpisodeProgressEntry {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
}

interface EpisodeProgressRow {
  show_id: number;
  season_number: number;
  episode_number: number;
  watched_at: string;
}

function fromRow(row: EpisodeProgressRow): EpisodeProgressEntry {
  return {
    showId: row.show_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    watchedAt: row.watched_at,
  };
}

export async function fetchAllEpisodeProgress(): Promise<EpisodeProgressEntry[]> {
  const { data, error } = await supabase
    .from('episode_progress')
    .select('show_id, season_number, episode_number, watched_at')
    .order('watched_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  return user.id;
}

export async function markEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  watchedAt: Date = new Date(),
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('episode_progress').upsert(
    {
      user_id: userId,
      show_id: showId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      watched_at: watchedAt.toISOString(),
    },
    { onConflict: 'user_id,show_id,season_number,episode_number' },
  );
  if (error) throw error;
}

export async function unmarkEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('show_id', showId)
    .eq('season_number', seasonNumber)
    .eq('episode_number', episodeNumber);
  if (error) throw error;
}

export async function markEpisodesWatchedBatch(
  showId: number,
  episodeNumbers: { seasonNumber: number; episodeNumber: number }[],
  watchedAt: Date = new Date(),
): Promise<void> {
  if (episodeNumbers.length === 0) return;
  const userId = await requireUserId();
  const rows = episodeNumbers.map((ep) => ({
    user_id: userId,
    show_id: showId,
    season_number: ep.seasonNumber,
    episode_number: ep.episodeNumber,
    watched_at: watchedAt.toISOString(),
  }));
  const { error } = await supabase
    .from('episode_progress')
    .upsert(rows, { onConflict: 'user_id,show_id,season_number,episode_number' });
  if (error) throw error;
}

export async function unmarkSeasonWatched(showId: number, seasonNumber: number): Promise<void> {
  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('show_id', showId)
    .eq('season_number', seasonNumber);
  if (error) throw error;
}
