import AsyncStorage from '@react-native-async-storage/async-storage';

import { addWatchLogEntry, updateWatchLogEntry } from '../lib/supabase/watchLog';
import { useListsStore } from './lists.store';
import { useToastStore } from './toast.store';
import { dedupeWatchLog, useWatchLogStore } from './watchLog.store';

import type { MediaCardItem } from '../components/home/MovieCard';
import type { WatchLogEntry } from '../lib/supabase/watchLog';

jest.mock('@react-native-async-storage/async-storage', () => {
  // jest.mock factories are hoisted above imports, so a static import can't
  // be referenced here -- require is the supported pattern (see
  // lib/supabase/authStorage.test.ts for the same convention).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

jest.mock('../lib/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

jest.mock('../lib/supabase/watchLog', () => ({
  fetchWatchLog: jest.fn(),
  addWatchLogEntry: jest.fn(),
  updateWatchLogEntry: jest.fn(),
}));

// The store's dropFromWatchlist branch reaches into lists.store -- mocked as
// a unit boundary so this file only exercises watchLog.store's own
// optimistic/rollback logic, not lists.store's (that gets its own test).
jest.mock('./lists.store', () => ({
  useListsStore: { getState: jest.fn() },
}));

const mockAddWatchLogEntry = addWatchLogEntry as jest.Mock;
const mockUpdateWatchLogEntry = updateWatchLogEntry as jest.Mock;
const mockUseListsStoreGetState = useListsStore.getState as jest.Mock;

const item: MediaCardItem = {
  id: 1,
  mediaType: 'movie',
  title: 'Arrival',
  posterPath: null,
  voteAverage: 8,
  year: '2016',
  genres: ['Sci-Fi'],
};

describe('watchLog.store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useWatchLogStore.setState({ entries: [], isLoading: false, error: null });
    mockAddWatchLogEntry.mockReset();
    mockUpdateWatchLogEntry.mockReset();
    mockUseListsStoreGetState.mockReset();
    mockUseListsStoreGetState.mockReturnValue({
      isInWatchlist: jest.fn(() => false),
      toggleWatchlist: jest.fn(),
    });
  });

  afterEach(() => {
    // See episodeProgress.store.test.ts -- clears the toast auto-hide timer
    // so it doesn't keep the process alive after the suite finishes.
    useToastStore.getState().hide();
  });

  describe('logWatch', () => {
    it('adds the entry optimistically and swaps it for the saved row on success', async () => {
      const saved: WatchLogEntry = {
        ...item,
        logId: 'log-1',
        watchedAt: '2026-07-01T00:00:00.000Z',
        rating: 4,
        note: null,
      };
      mockAddWatchLogEntry.mockResolvedValue(saved);

      const pending = useWatchLogStore
        .getState()
        .logWatch(item, { watchedAt: new Date('2026-07-01'), rating: 4 });

      // Optimistic entry is present synchronously, before the request settles.
      expect(useWatchLogStore.getState().isWatched('movie', 1)).toBe(true);
      expect(useWatchLogStore.getState().entries[0].logId).toMatch(/^pending-/);

      await pending;

      expect(useWatchLogStore.getState().entries).toEqual([saved]);
    });

    it('rolls back the optimistic entry when the request fails', async () => {
      mockAddWatchLogEntry.mockRejectedValue(new Error('network down'));

      await expect(
        useWatchLogStore
          .getState()
          .logWatch(item, { watchedAt: new Date('2026-07-01'), rating: 4 }),
      ).rejects.toThrow('network down');

      expect(useWatchLogStore.getState().entries).toEqual([]);
    });

    it('drops the title from the watchlist after a successful log when dropFromWatchlist is set', async () => {
      const saved: WatchLogEntry = {
        ...item,
        logId: 'log-1',
        watchedAt: '2026-07-01T00:00:00.000Z',
        rating: 4,
        note: null,
      };
      mockAddWatchLogEntry.mockResolvedValue(saved);
      const toggleWatchlist = jest.fn().mockResolvedValue(undefined);
      mockUseListsStoreGetState.mockReturnValue({
        isInWatchlist: jest.fn(() => true),
        toggleWatchlist,
      });

      await useWatchLogStore
        .getState()
        .logWatch(item, { watchedAt: new Date('2026-07-01'), rating: 4, dropFromWatchlist: true });

      expect(toggleWatchlist).toHaveBeenCalledWith(item, { silent: true });
    });

    it('does not touch the watchlist when dropFromWatchlist is set but the title was never on it', async () => {
      const saved: WatchLogEntry = {
        ...item,
        logId: 'log-1',
        watchedAt: '2026-07-01T00:00:00.000Z',
        rating: 4,
        note: null,
      };
      mockAddWatchLogEntry.mockResolvedValue(saved);
      const toggleWatchlist = jest.fn();
      mockUseListsStoreGetState.mockReturnValue({
        isInWatchlist: jest.fn(() => false),
        toggleWatchlist,
      });

      await useWatchLogStore
        .getState()
        .logWatch(item, { watchedAt: new Date('2026-07-01'), rating: 4, dropFromWatchlist: true });

      expect(toggleWatchlist).not.toHaveBeenCalled();
    });
  });

  describe('updateWatch', () => {
    const existing: WatchLogEntry = {
      ...item,
      logId: 'log-1',
      watchedAt: '2026-07-01T00:00:00.000Z',
      rating: 3,
      note: 'first watch',
    };

    it('patches the entry optimistically and swaps it for the saved row on success', async () => {
      useWatchLogStore.setState({ entries: [existing] });
      const saved: WatchLogEntry = { ...existing, rating: 5, note: 'rewatch, even better' };
      mockUpdateWatchLogEntry.mockResolvedValue(saved);

      await useWatchLogStore
        .getState()
        .updateWatch('log-1', {
          watchedAt: new Date(existing.watchedAt),
          rating: 5,
          note: 'rewatch, even better',
        });

      expect(useWatchLogStore.getState().entries).toEqual([saved]);
    });

    it('restores the full previous snapshot when the request fails', async () => {
      useWatchLogStore.setState({ entries: [existing] });
      mockUpdateWatchLogEntry.mockRejectedValue(new Error('network down'));

      await expect(
        useWatchLogStore
          .getState()
          .updateWatch('log-1', { watchedAt: new Date(existing.watchedAt), rating: 5 }),
      ).rejects.toThrow('network down');

      expect(useWatchLogStore.getState().entries).toEqual([existing]);
    });
  });

  describe('derived getters', () => {
    it("ratingFor returns the most recently watched entry's rating", () => {
      useWatchLogStore.setState({
        entries: [
          { ...item, logId: 'log-2', watchedAt: '2026-07-05T00:00:00.000Z', rating: 5, note: null },
          { ...item, logId: 'log-1', watchedAt: '2026-07-01T00:00:00.000Z', rating: 2, note: null },
        ],
      });

      expect(useWatchLogStore.getState().ratingFor('movie', 1)).toBe(5);
    });
  });
});

describe('dedupeWatchLog', () => {
  it('keeps only the most recently watched row per title, newest first', () => {
    const entries: WatchLogEntry[] = [
      { ...item, logId: 'log-1', watchedAt: '2026-06-01T00:00:00.000Z', rating: 3, note: null },
      { ...item, logId: 'log-2', watchedAt: '2026-07-01T00:00:00.000Z', rating: 5, note: null },
      {
        ...item,
        id: 2,
        title: 'Ex Machina',
        logId: 'log-3',
        watchedAt: '2026-06-15T00:00:00.000Z',
        rating: 4,
        note: null,
      },
    ];

    expect(dedupeWatchLog(entries)).toEqual([
      { ...item, logId: 'log-2', watchedAt: '2026-07-01T00:00:00.000Z', rating: 5, note: null },
      {
        ...item,
        id: 2,
        title: 'Ex Machina',
        logId: 'log-3',
        watchedAt: '2026-06-15T00:00:00.000Z',
        rating: 4,
        note: null,
      },
    ]);
  });
});
