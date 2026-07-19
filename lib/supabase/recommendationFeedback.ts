import { supabase } from './client';

// Keys use the app-wide `${mediaType}-${mediaId}` convention.
export async function fetchDismissedKeys(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('recommendation_feedback')
    .select('media_id, media_type');
  if (error) throw error;
  return new Set(
    (data ?? []).map((row) => `${row.media_type as string}-${row.media_id as number}`),
  );
}

export async function addDismissed(mediaType: 'movie' | 'tv', mediaId: number): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('recommendation_feedback')
    .upsert(
      { user_id: user.id, media_id: mediaId, media_type: mediaType },
      { onConflict: 'user_id,media_type,media_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}
