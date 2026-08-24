import { getOwnProfile, updateOwnProfile } from '../lib/api/account';
import { useProfileStore } from './profile.store';

import type { Profile } from '../lib/api/account';

// lib/api/account imports lib/api/config, which throws at import time
// without EXPO_PUBLIC_API_BASE_URL -- mock the whole module boundary, same
// convention as the other store test files.
jest.mock('../lib/api/account', () => ({
  getOwnProfile: jest.fn(),
  updateOwnProfile: jest.fn(),
}));

const mockGetOwnProfile = getOwnProfile as jest.Mock;
const mockUpdateOwnProfile = updateOwnProfile as jest.Mock;

const profile: Profile = {
  id: 'user-1',
  email: 'a@b.com',
  displayName: 'Ayşe',
  avatarVariant: 'beam',
  avatarSeed: 'ayse',
  watchRegion: 'TR',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('profile.store', () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: null, isLoading: false, error: null });
    jest.clearAllMocks();
  });

  describe('fetchProfile', () => {
    it('populates profile and clears isLoading on success', async () => {
      mockGetOwnProfile.mockResolvedValue(profile);

      await useProfileStore.getState().fetchProfile();

      expect(useProfileStore.getState().profile).toEqual(profile);
      expect(useProfileStore.getState().isLoading).toBe(false);
      expect(useProfileStore.getState().error).toBeNull();
    });

    it('sets an error message and clears isLoading on failure', async () => {
      mockGetOwnProfile.mockRejectedValue(new Error('network down'));

      await useProfileStore.getState().fetchProfile();

      expect(useProfileStore.getState().error).toBe('network down');
      expect(useProfileStore.getState().isLoading).toBe(false);
      expect(useProfileStore.getState().profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('replaces profile with the saved row on success', async () => {
      useProfileStore.setState({ profile });
      const updated = { ...profile, displayName: 'Ayşe K.' };
      mockUpdateOwnProfile.mockResolvedValue(updated);

      await useProfileStore.getState().updateProfile({ displayName: 'Ayşe K.' });

      expect(useProfileStore.getState().profile).toEqual(updated);
    });

    it('sends the full merged profile, not just the partial update -- PUT /me replaces the whole row', async () => {
      useProfileStore.setState({ profile });
      mockUpdateOwnProfile.mockResolvedValue(profile);

      await useProfileStore.getState().updateProfile({ displayName: 'Ayşe K.' });

      expect(mockUpdateOwnProfile).toHaveBeenCalledWith({
        displayName: 'Ayşe K.',
        avatarVariant: profile.avatarVariant,
        avatarSeed: profile.avatarSeed,
        watchRegion: profile.watchRegion,
      });
    });

    it('falls back to defaults for a first update with no profile loaded yet', async () => {
      mockUpdateOwnProfile.mockResolvedValue(profile);

      await useProfileStore.getState().updateProfile({ avatarVariant: 'ring' });

      expect(mockUpdateOwnProfile).toHaveBeenCalledWith({
        displayName: null,
        avatarVariant: 'ring',
        avatarSeed: null,
        watchRegion: null,
      });
    });

    it('propagates the error and leaves profile untouched when the request fails', async () => {
      useProfileStore.setState({ profile });
      mockUpdateOwnProfile.mockRejectedValue(new Error('network down'));

      await expect(
        useProfileStore.getState().updateProfile({ displayName: 'fails' }),
      ).rejects.toThrow('network down');

      expect(useProfileStore.getState().profile).toEqual(profile);
    });
  });

  describe('reset', () => {
    it('clears profile and error', () => {
      useProfileStore.setState({ profile, error: 'stale error' });

      useProfileStore.getState().reset();

      expect(useProfileStore.getState().profile).toBeNull();
      expect(useProfileStore.getState().error).toBeNull();
    });
  });
});
