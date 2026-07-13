import type { AvatarVariant } from '../avatar/generate';
import { supabase } from './client';

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarVariant: AvatarVariant;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_variant: string;
}

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarVariant: row.avatar_variant as AvatarVariant,
  };
}

export async function getOwnProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_variant')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function updateOwnProfile(updates: {
  displayName?: string | null;
  avatarVariant?: AvatarVariant;
}): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(updates.displayName !== undefined ? { display_name: updates.displayName } : {}),
      ...(updates.avatarVariant !== undefined ? { avatar_variant: updates.avatarVariant } : {}),
    })
    .eq('id', user.id)
    .select('id, email, display_name, avatar_variant')
    .single();

  if (error) throw error;
  return fromRow(data);
}
