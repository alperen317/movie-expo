import type { MediaCardItem } from '../../components/home/MovieCard';
import { supabase } from './client';

export interface WatchLogEntry extends MediaCardItem {
  logId: string;
  watchedAt: string;
  rating: number | null;
  note: string | null;
}

interface WatchLogRow {
  id: string;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  vote_average: number;
  year: string | null;
  genre: string | null;
  watched_at: string;
  rating: number | null;
  note: string | null;
}

function fromRow(row: WatchLogRow): WatchLogEntry {
  return {
    logId: row.id,
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    posterPath: row.poster_path,
    voteAverage: row.vote_average,
    year: row.year,
    genre: row.genre,
    watchedAt: row.watched_at,
    rating: row.rating,
    note: row.note,
  };
}

export async function fetchWatchLog(): Promise<WatchLogEntry[]> {
  const { data, error } = await supabase
    .from('watch_log')
    .select(
      'id, media_id, media_type, title, poster_path, vote_average, year, genre, watched_at, rating, note',
    )
    .order('watched_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function addWatchLogEntry(
  item: MediaCardItem,
  options: { watchedAt: Date; rating: number | null; note?: string | null },
): Promise<WatchLogEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('watch_log')
    .insert({
      user_id: user.id,
      media_id: item.id,
      media_type: item.mediaType,
      title: item.title,
      poster_path: item.posterPath,
      vote_average: item.voteAverage,
      year: item.year,
      genre: item.genre,
      watched_at: options.watchedAt.toISOString(),
      rating: options.rating,
      note: options.note ?? null,
    })
    .select(
      'id, media_id, media_type, title, poster_path, vote_average, year, genre, watched_at, rating, note',
    )
    .single();

  if (error) throw error;
  return fromRow(data);
}

const BATCH_CHUNK_SIZE = 500;

// Bulk insert used by the TV Time / Letterboxd importer. watch_log has no
// uniqueness constraint (rewatches are allowed by design), so this is a
// plain insert, chunked to stay under Supabase's request size limits.
export async function addWatchLogEntriesBatch(
  items: { item: MediaCardItem; watchedAt: Date; rating: number | null }[],
): Promise<void> {
  if (items.length === 0) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const rows = items.map(({ item, watchedAt, rating }) => ({
    user_id: user.id,
    media_id: item.id,
    media_type: item.mediaType,
    title: item.title,
    poster_path: item.posterPath,
    vote_average: item.voteAverage,
    year: item.year,
    genre: item.genre,
    watched_at: watchedAt.toISOString(),
    rating,
    note: null,
  }));

  for (let i = 0; i < rows.length; i += BATCH_CHUNK_SIZE) {
    const { error } = await supabase.from('watch_log').insert(rows.slice(i, i + BATCH_CHUNK_SIZE));
    if (error) throw error;
  }
}

export async function updateWatchLogEntry(
  logId: string,
  options: { watchedAt: Date; rating: number | null; note?: string | null },
): Promise<WatchLogEntry> {
  const { data, error } = await supabase
    .from('watch_log')
    .update({
      watched_at: options.watchedAt.toISOString(),
      rating: options.rating,
      note: options.note ?? null,
    })
    .eq('id', logId)
    .select(
      'id, media_id, media_type, title, poster_path, vote_average, year, genre, watched_at, rating, note',
    )
    .single();

  if (error) throw error;
  return fromRow(data);
}
