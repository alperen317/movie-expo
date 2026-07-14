import { create } from 'zustand';

import type { AvatarVariant } from '../lib/avatar/generate';
import { getOwnProfile, Profile, updateOwnProfile } from '../lib/supabase/profiles';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: {
    displayName?: string | null;
    avatarVariant?: AvatarVariant;
    avatarSeed?: string | null;
  }) => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
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
    const saved = await updateOwnProfile(updates);
    set({ profile: saved });
  },

  reset: () => set({ profile: null, error: null }),
}));
