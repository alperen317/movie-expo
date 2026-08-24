import { create } from 'zustand';

import { getOwnProfile, Profile, updateOwnProfile } from '../lib/api/account';
import type { AvatarVariant } from '../lib/avatar/generate';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: {
    displayName?: string | null;
    avatarVariant?: AvatarVariant;
    avatarSeed?: string | null;
    watchRegion?: string | null;
  }) => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await getOwnProfile();
      set({ profile, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load profile.',
        isLoading: false,
      });
    }
  },

  updateProfile: async (updates) => {
    // PUT /me replaces the whole editable profile server-side -- an omitted
    // field is cleared, not left alone. Merge onto what's currently known so
    // callers can keep passing a partial update (e.g. just a new avatar
    // seed) without silently wiping the other fields.
    const current = get().profile;
    const saved = await updateOwnProfile({
      displayName: current?.displayName ?? null,
      avatarVariant: current?.avatarVariant ?? 'beam',
      avatarSeed: current?.avatarSeed ?? null,
      watchRegion: current?.watchRegion ?? null,
      ...updates,
    });
    set({ profile: saved });
  },

  reset: () => set({ profile: null, error: null }),
}));
