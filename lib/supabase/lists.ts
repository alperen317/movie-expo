import type { MediaCardItem } from '../../components/home/MovieCard';
import { supabase } from './client';

export type ListType = 'favorite' | 'watchlist';

export interface SavedMediaItem extends MediaCardItem {
  savedAt: string;
}

interface SavedMediaRow {
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  vote_average: number;
  year: string | null;
  genre: string | null;
  created_at: string;
}

function fromRow(row: SavedMediaRow): SavedMediaItem {
  return {
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    posterPath: row.poster_path,
    voteAverage: row.vote_average,
    year: row.year,
    genre: row.genre,
    savedAt: row.created_at,
  };
}

export async function fetchSavedMedia(listType: ListType): Promise<SavedMediaItem[]> {
  const { data, error } = await supabase
    .from('saved_media')
    .select('media_id, media_type, title, poster_path, vote_average, year, genre, created_at')
    .eq('list_type', listType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function addSavedMedia(item: MediaCardItem, listType: ListType): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase.from('saved_media').insert({
    user_id: user.id,
    list_type: listType,
    media_id: item.id,
    media_type: item.mediaType,
    title: item.title,
    poster_path: item.posterPath,
    vote_average: item.voteAverage,
    year: item.year,
    genre: item.genre,
  });

  if (error) throw error;
}

export async function removeSavedMedia(
  mediaId: number,
  mediaType: 'movie' | 'tv',
  listType: ListType,
): Promise<void> {
  const { error } = await supabase
    .from('saved_media')
    .delete()
    .eq('media_id', mediaId)
    .eq('media_type', mediaType)
    .eq('list_type', listType);

  if (error) throw error;
}
