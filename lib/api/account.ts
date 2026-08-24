import { api } from './client';
import type { AvatarVariant } from '../avatar/generate';

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarVariant: AvatarVariant;
  avatarSeed: string | null;
  watchRegion: string | null;
  createdAt: string;
}

export function getOwnProfile(): Promise<Profile> {
  return api.get('/me');
}

/**
 * `PUT /me` replaces the whole editable profile -- an omitted field is
 * cleared, not left alone. This function's signature makes that the caller's
 * problem to solve *before* calling it (see `profile.store.ts#updateProfile`,
 * which merges onto the currently-known profile so components can keep
 * passing partial updates).
 */
export function updateOwnProfile(profile: {
  displayName: string | null;
  avatarVariant: AvatarVariant;
  avatarSeed: string | null;
  watchRegion: string | null;
}): Promise<Profile> {
  return api.put('/me', profile);
}

// Cascades through every table the user owns server-side. The access token
// stays valid until it expires even though the row is gone, so the caller
// must still sign out locally afterwards.
export function deleteAccount(): Promise<void> {
  return api.delete('/me');
}
