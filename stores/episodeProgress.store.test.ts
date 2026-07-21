import {
  markEpisodeWatched,
  markEpisodesWatchedBatch,
  unmarkEpisodeWatched,
} from '../lib/supabase/episodeProgress';
import { useToastStore } from './toast.store';
import { episodeKey, useEpisodeProgressStore } from './episodeProgress.store';

// lib/i18n triggers a synchronous expo-localization call on import, which
// isn't available under plain node -- mock the module boundary the store
// actually touches (i18n.t) instead of chasing that dependency down.
jest.mock('../lib/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

// lib/supabase/episodeProgress imports lib/supabase/client, which throws at
// import time without EXPO_PUBLIC_SUPABASE_* env vars -- mock the whole
// module so the real client is never constructed.
jest.mock('../lib/supabase/episodeProgress', () => ({
  fetchAllEpisodeProgress: jest.fn(),
  markEpisodeWatched: jest.fn(),
  unmarkEpisodeWatched: jest.fn(),
  markEpisodesWatchedBatch: jest.fn(),
  unmarkSeasonWatched: jest.fn(),
}));

const mockMarkEpisodeWatched = markEpisodeWatched as jest.Mock;
const mockUnmarkEpisodeWatched = unmarkEpisodeWatched as jest.Mock;
const mockMarkEpisodesWatchedBatch = markEpisodesWatchedBatch as jest.Mock;

describe('episodeProgress.store', () => {
  beforeEach(() => {
    useEpisodeProgressStore.setState({ entries: {}, isLoading: false, error: null });
    mockMarkEpisodeWatched.mockReset();
    mockUnmarkEpisodeWatched.mockReset();
    mockMarkEpisodesWatchedBatch.mockReset();
  });

  afterEach(() => {
    // Store actions call useToastStore().show(), which sets a 2.2s
    // setTimeout to auto-hide -- hide() clears it. Without this, the last
    // test's timer keeps the process alive and jest warns about an open
    // handle after the suite otherwise passes cleanly.
    useToastStore.getState().hide();
  });

  describe('toggleEpisode', () => {
    it('marks an episode watched optimistically and keeps it once the request succeeds', async () => {
      mockMarkEpisodeWatched.mockResolvedValue(undefined);

      const pending = useEpisodeProgressStore.getState().toggleEpisode(1, 1, 1);
      // The optimistic set() runs synchronously before the first await, so
      // the entry is already there while the request is still in flight.
      expect(useEpisodeProgressStore.getState().isEpisodeWatched(1, 1, 1)).toBe(true);

      await pending;
      expect(useEpisodeProgressStore.getState().isEpisodeWatched(1, 1, 1)).toBe(true);
      expect(mockMarkEpisodeWatched).toHaveBeenCalledWith(1, 1, 1, expect.any(Date));
    });

    it('rolls back the optimistic mark when the request fails', async () => {
      mockMarkEpisodeWatched.mockRejectedValue(new Error('network down'));

      await expect(useEpisodeProgressStore.getState().toggleEpisode(1, 1, 1)).rejects.toThrow(
        'network down',
      );

      expect(useEpisodeProgressStore.getState().isEpisodeWatched(1, 1, 1)).toBe(false);
    });

    it('unmarks a watched episode optimistically and restores it if the request fails', async () => {
      useEpisodeProgressStore.setState({
        entries: {
          [episodeKey(1, 1, 1)]: {
            showId: 1,
            seasonNumber: 1,
            episodeNumber: 1,
            watchedAt: new Date().toISOString(),
          },
        },
      });
      mockUnmarkEpisodeWatched.mockRejectedValue(new Error('network down'));

      await expect(useEpisodeProgressStore.getState().toggleEpisode(1, 1, 1)).rejects.toThrow(
        'network down',
      );

      expect(useEpisodeProgressStore.getState().isEpisodeWatched(1, 1, 1)).toBe(true);
    });
  });

  describe('markSeason', () => {
    it('keeps the optimistic batch once the request succeeds', async () => {
      mockMarkEpisodesWatchedBatch.mockResolvedValue(undefined);

      await useEpisodeProgressStore.getState().markSeason(1, 1, [1, 2]);

      expect(useEpisodeProgressStore.getState().isEpisodeWatched(1, 1, 1)).toBe(true);
      expect(useEpisodeProgressStore.getState().isEpisodeWatched(1, 1, 2)).toBe(true);
    });

    it('restores the full previous snapshot -- not a partial rollback -- when the batch request fails', async () => {
      const unrelatedEntry = {
        showId: 2,
        seasonNumber: 1,
        episodeNumber: 1,
        watchedAt: new Date().toISOString(),
      };
      useEpisodeProgressStore.setState({ entries: { [episodeKey(2, 1, 1)]: unrelatedEntry } });
      mockMarkEpisodesWatchedBatch.mockRejectedValue(new Error('network down'));

      await expect(
        useEpisodeProgressStore.getState().markSeason(1, 1, [1, 2, 3]),
      ).rejects.toThrow('network down');

      // The optimistic season-1 entries for show 1 are gone, and the
      // pre-existing entry for an unrelated show is exactly as it was --
      // set({ entries: previous }) replaces the whole map, not just the
      // keys this call touched.
      expect(useEpisodeProgressStore.getState().entries).toEqual({
        [episodeKey(2, 1, 1)]: unrelatedEntry,
      });
    });
  });

  describe('derived getters', () => {
    it('showIdsInProgress orders shows by most recently watched episode', () => {
      useEpisodeProgressStore.setState({
        entries: {
          [episodeKey(1, 1, 1)]: {
            showId: 1,
            seasonNumber: 1,
            episodeNumber: 1,
            watchedAt: '2026-07-01T00:00:00.000Z',
          },
          [episodeKey(2, 1, 1)]: {
            showId: 2,
            seasonNumber: 1,
            episodeNumber: 1,
            watchedAt: '2026-07-05T00:00:00.000Z',
          },
        },
      });

      expect(useEpisodeProgressStore.getState().showIdsInProgress()).toEqual([2, 1]);
    });

    it('lastWatchedForShow returns the highest season/episode watched for that show', () => {
      useEpisodeProgressStore.setState({
        entries: {
          [episodeKey(1, 1, 5)]: {
            showId: 1,
            seasonNumber: 1,
            episodeNumber: 5,
            watchedAt: '2026-07-01T00:00:00.000Z',
          },
          [episodeKey(1, 2, 1)]: {
            showId: 1,
            seasonNumber: 2,
            episodeNumber: 1,
            watchedAt: '2026-06-01T00:00:00.000Z',
          },
        },
      });

      expect(useEpisodeProgressStore.getState().lastWatchedForShow(1)).toEqual({
        seasonNumber: 2,
        episodeNumber: 1,
        watchedAt: '2026-06-01T00:00:00.000Z',
      });
    });
  });
});
