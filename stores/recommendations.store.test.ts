import { addDismissed, fetchDismissedKeys } from '../lib/api/recommendationFeedback';
import { fetchListItems, fetchListWatchSummary, fetchMyLists } from '../lib/api/sharedLists';
import { getGenreIdByName } from '../lib/tmdb/genres';
import { getMediaMetadata } from '../lib/tmdb/mediaMetadataCache';
import {
  discoverMoviesByDecade,
  discoverMoviesByGenre,
  discoverMoviesByPerson,
} from '../lib/tmdb/movies';
import { discoverTVShowsByGenre } from '../lib/tmdb/tv';
import { useListsStore } from './lists.store';
import { useRecommendationsStore } from './recommendations.store';
import { useWatchLogStore } from './watchLog.store';

import type { MediaCardItem } from '../components/home/MovieCard';
import type { WatchLogEntry } from '../lib/api/watchLog';

// components/home/MovieCard pulls in react-native / expo-image / reanimated,
// none of which run under the plain node test environment -- mock the
// boundary. The conversions are simple field mappings, not logic under test,
// so a pass-through-with-defaults stub is enough (aggregateFriendsWatched and
// rankCandidates -- exercised for real below -- only care about the shape).
jest.mock('../components/home/MovieCard', () => ({
  toMovieCardItem: jest.fn((m: Record<string, unknown>) => ({ ...m, mediaType: 'movie' })),
  toTVCardItem: jest.fn((s: Record<string, unknown>) => ({ ...s, mediaType: 'tv' })),
}));

jest.mock('../lib/tmdb/genres', () => ({
  getGenreIdByName: jest.fn(),
  normalizeGenreName: jest.fn((name: string) => name),
}));
jest.mock('../lib/tmdb/mediaMetadataCache', () => ({ getMediaMetadata: jest.fn() }));
jest.mock('../lib/tmdb/movies', () => ({
  discoverMoviesByDecade: jest.fn(),
  discoverMoviesByGenre: jest.fn(),
  discoverMoviesByPerson: jest.fn(),
}));
jest.mock('../lib/tmdb/tv', () => ({ discoverTVShowsByGenre: jest.fn() }));
jest.mock('../lib/api/recommendationFeedback', () => ({
  addDismissed: jest.fn(),
  fetchDismissedKeys: jest.fn(),
}));
jest.mock('../lib/api/sharedLists', () => ({
  fetchListItems: jest.fn(),
  fetchListWatchSummary: jest.fn(),
  fetchMyLists: jest.fn(),
}));
// lists.store/watchLog.store both use zustand's persist(AsyncStorage) --
// mocked as unit boundaries, same rationale as watchLog.store.test.ts.
jest.mock('./lists.store', () => ({ useListsStore: { getState: jest.fn() } }));
jest.mock('./watchLog.store', () => ({ useWatchLogStore: { getState: jest.fn() } }));

const mockAddDismissed = addDismissed as jest.Mock;
const mockFetchDismissedKeys = fetchDismissedKeys as jest.Mock;
const mockFetchListItems = fetchListItems as jest.Mock;
const mockFetchListWatchSummary = fetchListWatchSummary as jest.Mock;
const mockFetchMyLists = fetchMyLists as jest.Mock;
const mockGetGenreIdByName = getGenreIdByName as jest.Mock;
const mockGetMediaMetadata = getMediaMetadata as jest.Mock;
const mockDiscoverMoviesByDecade = discoverMoviesByDecade as jest.Mock;
const mockDiscoverMoviesByGenre = discoverMoviesByGenre as jest.Mock;
const mockDiscoverMoviesByPerson = discoverMoviesByPerson as jest.Mock;
const mockDiscoverTVShowsByGenre = discoverTVShowsByGenre as jest.Mock;
const mockUseListsStoreGetState = useListsStore.getState as jest.Mock;
const mockUseWatchLogStoreGetState = useWatchLogStore.getState as jest.Mock;

const item: MediaCardItem = {
  id: 1,
  mediaType: 'movie',
  title: 'Arrival',
  posterPath: null,
  voteAverage: 8,
  year: '2016',
  genres: ['Sci-Fi'],
};

// Candidates that all share one primary genre (the shape a genre-scoped
// discover call returns) with descending voteAverage, so ranking order is
// simply ascending id.
function dramaPool(count: number): MediaCardItem[] {
  return Array.from({ length: count }, (_, index) => ({
    ...item,
    id: 100 + index,
    title: `Drama ${index}`,
    genres: ['Drama'],
    year: '1995',
    voteAverage: 10 - index * 0.5,
  }));
}

function watchLogEntry(overrides: Partial<WatchLogEntry> = {}): WatchLogEntry {
  return {
    ...item,
    logId: `log-${overrides.id ?? item.id}`,
    watchedAt: '2026-07-01T00:00:00.000Z',
    rating: 9,
    note: null,
    genres: ['Drama'],
    year: '1995',
    ...overrides,
  };
}

describe('recommendations.store', () => {
  beforeEach(() => {
    useRecommendationsStore.setState({
      friendsWatched: [],
      isFriendsLoading: false,
      forYou: [],
      genreRows: [],
      decadeRow: null,
      personRow: null,
      dismissedKeys: new Set(),
      isPersonalizedLoading: false,
    });
    jest.clearAllMocks();
    mockUseWatchLogStoreGetState.mockReturnValue({
      fetchWatchLog: jest.fn().mockResolvedValue(undefined),
      entries: [],
    });
    mockUseListsStoreGetState.mockReturnValue({
      fetchWatchlist: jest.fn().mockResolvedValue(undefined),
      watchlist: {},
    });
    mockFetchDismissedKeys.mockResolvedValue(new Set());
    mockAddDismissed.mockResolvedValue(undefined);
    mockGetMediaMetadata.mockResolvedValue({ topCast: [], director: null });
  });

  describe('fetchFriendsWatched', () => {
    it('aggregates watch summaries across every shared list, excluding titles the user already watched', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [
          { ...item, id: 99, logId: 'log-99', watchedAt: '2026-01-01', rating: null, note: null },
        ],
      });
      mockFetchMyLists.mockResolvedValue([{ id: 'list-1' }]);
      mockFetchListItems.mockResolvedValue([item, { ...item, id: 99, title: 'Already Watched' }]);
      mockFetchListWatchSummary.mockResolvedValue({ 'movie-1': 2, 'movie-99': 3 });

      await useRecommendationsStore.getState().fetchFriendsWatched();

      const { friendsWatched, isFriendsLoading } = useRecommendationsStore.getState();
      expect(isFriendsLoading).toBe(false);
      expect(friendsWatched).toEqual([{ ...item, friendCount: 2 }]);
    });

    // Regression: same wholesale-replace race as fetchPersonalized -- the row is
    // rebuilt at the end from an exclusion set snapshotted before the awaits.
    it('does not resurrect a title dismissed while the fetch was in flight', async () => {
      const shared = { ...item, id: 42 };
      mockFetchMyLists.mockResolvedValue([{ id: 'list-1' }]);
      mockFetchListItems.mockImplementation(async () => {
        useRecommendationsStore.getState().dismiss(shared);
        return [shared];
      });
      mockFetchListWatchSummary.mockResolvedValue({ 'movie-42': 3 });

      await useRecommendationsStore.getState().fetchFriendsWatched();

      const state = useRecommendationsStore.getState();
      expect(state.dismissedKeys.has('movie-42')).toBe(true);
      expect(state.friendsWatched).toEqual([]);
    });

    it('fails silently and clears isFriendsLoading when the request throws', async () => {
      mockFetchMyLists.mockRejectedValue(new Error('network down'));

      await useRecommendationsStore.getState().fetchFriendsWatched();

      expect(useRecommendationsStore.getState().isFriendsLoading).toBe(false);
      expect(useRecommendationsStore.getState().friendsWatched).toEqual([]);
    });
  });

  describe('fetchPersonalized', () => {
    it('leaves every row empty without calling any discover endpoint when there are fewer than 3 signals', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [watchLogEntry({ id: 1 }), watchLogEntry({ id: 2 })],
      });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      expect(state.forYou).toEqual([]);
      expect(state.genreRows).toEqual([]);
      expect(state.decadeRow).toBeNull();
      expect(state.personRow).toBeNull();
      expect(state.isPersonalizedLoading).toBe(false);
      expect(mockDiscoverMoviesByGenre).not.toHaveBeenCalled();
    });

    it('fails silently and clears isPersonalizedLoading when an upstream call throws', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockRejectedValue(new Error('network down')),
        entries: [],
      });

      await useRecommendationsStore.getState().fetchPersonalized();

      expect(useRecommendationsStore.getState().isPersonalizedLoading).toBe(false);
    });

    it('builds genre and decade rows from the taste profile, leaving forYou empty when every candidate is already in a row', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [watchLogEntry({ id: 1 }), watchLogEntry({ id: 2 }), watchLogEntry({ id: 3 })],
      });
      mockGetGenreIdByName.mockImplementation((_name: string, scope: string) =>
        scope === 'movie' ? 18 : 118,
      );
      const genreMovie = { ...item, id: 10, title: 'Genre Movie', genres: ['Drama'], year: '1990' };
      const genreShow = { ...item, id: 11, title: 'Genre Show', genres: ['Drama'], year: '1991' };
      const decadeMovie = {
        ...item,
        id: 12,
        title: 'Decade Movie',
        genres: ['Drama'],
        year: '1993',
      };
      mockDiscoverMoviesByGenre.mockResolvedValue({ results: [genreMovie] });
      mockDiscoverTVShowsByGenre.mockResolvedValue({ results: [genreShow] });
      mockDiscoverMoviesByDecade.mockResolvedValue({ results: [decadeMovie] });
      mockDiscoverMoviesByPerson.mockResolvedValue({ results: [] });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      expect(state.isPersonalizedLoading).toBe(false);
      expect(state.genreRows).toEqual([
        {
          genre: 'Drama',
          movieGenreId: 18,
          items: expect.arrayContaining([
            expect.objectContaining({ id: 10 }),
            expect.objectContaining({ id: 11 }),
          ]),
        },
      ]);
      expect(state.decadeRow).toEqual({
        decade: 1990,
        items: [expect.objectContaining({ id: 12 })],
      });
      // All three candidates are spoken for by the genre and decade rows, so
      // the catch-all rail has nothing left -- it never repeats a themed row.
      expect(state.forYou).toEqual([]);
      expect(state.personRow).toBeNull();
    });

    // Regression: rankCandidates caps results per primary genre (default 4) to
    // keep one genre from swamping a mixed rail. A genre row *is* one genre, so
    // the cap used to truncate it to 4 of the 12 requested items.
    it('fills a genre row to its limit even when every candidate shares a primary genre', async () => {
      const pool = dramaPool(14);
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [watchLogEntry({ id: 1 }), watchLogEntry({ id: 2 }), watchLogEntry({ id: 3 })],
      });
      mockGetGenreIdByName.mockImplementation((_name: string, scope: string) =>
        scope === 'movie' ? 18 : 118,
      );
      mockDiscoverMoviesByGenre.mockResolvedValue({ results: pool });
      mockDiscoverTVShowsByGenre.mockResolvedValue({ results: [] });
      mockDiscoverMoviesByDecade.mockResolvedValue({ results: [] });
      mockDiscoverMoviesByPerson.mockResolvedValue({ results: [] });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      expect(state.genreRows).toHaveLength(1);
      expect(state.genreRows[0].items.map((entry) => entry.id)).toEqual([
        100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
      ]);
      // The two candidates the row could not fit are what forYou falls back to,
      // and there is no overlap between the rails.
      expect(state.forYou.map((entry) => entry.id)).toEqual([112, 113]);
    });

    // Regression: forYou ranks the union of every pool with the same scorer as
    // the themed rows, so its top items used to be exactly each row's top items.
    it('keeps forYou disjoint from every themed row', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [watchLogEntry({ id: 1 }), watchLogEntry({ id: 2 }), watchLogEntry({ id: 3 })],
      });
      mockGetGenreIdByName.mockImplementation((_name: string, scope: string) =>
        scope === 'movie' ? 18 : 118,
      );
      mockDiscoverMoviesByGenre.mockResolvedValue({ results: dramaPool(14) });
      mockDiscoverTVShowsByGenre.mockResolvedValue({ results: [] });
      mockDiscoverMoviesByDecade.mockResolvedValue({
        results: [{ ...item, id: 200, genres: ['Drama'], year: '1994', voteAverage: 9 }],
      });
      mockDiscoverMoviesByPerson.mockResolvedValue({ results: [] });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      const rowKeys = [
        ...state.genreRows.flatMap((row) => row.items),
        ...(state.decadeRow?.items ?? []),
        ...(state.personRow?.items ?? []),
      ].map((entry) => `${entry.mediaType}-${entry.id}`);
      const forYouKeys = state.forYou.map((entry) => `${entry.mediaType}-${entry.id}`);

      expect(state.decadeRow).not.toBeNull();
      expect(forYouKeys.length).toBeGreaterThan(0);
      expect(forYouKeys.filter((key) => rowKeys.includes(key))).toEqual([]);
    });

    // Regression: the rows are replaced wholesale at the end of the pipeline,
    // which used to resurrect a title dismissed while it was in flight (the
    // exclusion set was snapshotted before the network work started).
    it('does not resurrect a title dismissed while the fetch was in flight', async () => {
      const pool = dramaPool(14);
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [watchLogEntry({ id: 1 }), watchLogEntry({ id: 2 }), watchLogEntry({ id: 3 })],
      });
      mockGetGenreIdByName.mockImplementation((_name: string, scope: string) =>
        scope === 'movie' ? 18 : 118,
      );
      // Stands in for the user long-pressing a card that is still on screen
      // from the previous load while this fetch is mid-flight.
      mockDiscoverMoviesByGenre.mockImplementation(async () => {
        useRecommendationsStore.getState().dismiss(pool[0]);
        return { results: pool };
      });
      mockDiscoverTVShowsByGenre.mockResolvedValue({ results: [] });
      mockDiscoverMoviesByDecade.mockResolvedValue({ results: [] });
      mockDiscoverMoviesByPerson.mockResolvedValue({ results: [] });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      expect(state.dismissedKeys.has('movie-100')).toBe(true);
      expect(state.genreRows[0].items.map((entry) => entry.id)).not.toContain(100);
      expect(state.forYou.map((entry) => entry.id)).not.toContain(100);
    });

    // Regression: the mid-flight server snapshot used to replace dismissedKeys
    // outright, discarding an optimistic dismissal recorded after it was read.
    it('keeps an optimistic dismissal that the server snapshot does not know about yet', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [watchLogEntry({ id: 1 }), watchLogEntry({ id: 2 })],
      });
      mockFetchDismissedKeys.mockResolvedValue(new Set(['movie-777']));
      useRecommendationsStore.getState().dismiss({ ...item, id: 500 });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      expect([...state.dismissedKeys].sort()).toEqual(['movie-500', 'movie-777']);
    });
  });

  describe('dismiss', () => {
    it('removes the item from every rail optimistically and records it in dismissedKeys', () => {
      useRecommendationsStore.setState({
        forYou: [item],
        friendsWatched: [{ ...item, friendCount: 2 }],
        genreRows: [{ genre: 'Sci-Fi', movieGenreId: 878, items: [item] }],
        decadeRow: { decade: 2010, items: [item] },
        personRow: { personId: 1, personName: 'Denis Villeneuve', items: [item] },
      });
      mockAddDismissed.mockResolvedValue(undefined);

      useRecommendationsStore.getState().dismiss(item);

      const state = useRecommendationsStore.getState();
      expect(state.dismissedKeys.has('movie-1')).toBe(true);
      expect(state.forYou).toEqual([]);
      expect(state.friendsWatched).toEqual([]);
      // Rows that become empty after removing the dismissed item are dropped entirely.
      expect(state.genreRows).toEqual([]);
      expect(state.decadeRow).toBeNull();
      expect(state.personRow).toBeNull();
      expect(mockAddDismissed).toHaveBeenCalledWith('movie', 1);
    });

    it('keeps a genre row when other items remain after removing the dismissed one', () => {
      const other = { ...item, id: 2, title: 'Other' };
      useRecommendationsStore.setState({
        genreRows: [{ genre: 'Sci-Fi', movieGenreId: 878, items: [item, other] }],
      });
      mockAddDismissed.mockResolvedValue(undefined);

      useRecommendationsStore.getState().dismiss(item);

      expect(useRecommendationsStore.getState().genreRows).toEqual([
        { genre: 'Sci-Fi', movieGenreId: 878, items: [other] },
      ]);
    });

    it('does not throw and leaves the optimistic removal in place when the background write fails', async () => {
      useRecommendationsStore.setState({ forYou: [item] });
      mockAddDismissed.mockRejectedValue(new Error('network down'));

      useRecommendationsStore.getState().dismiss(item);
      // Let the swallowed rejection's microtask settle.
      await Promise.resolve();
      await Promise.resolve();

      expect(useRecommendationsStore.getState().forYou).toEqual([]);
    });
  });

  describe('reset', () => {
    it('clears every row and loading flag back to defaults', () => {
      useRecommendationsStore.setState({
        friendsWatched: [{ ...item, friendCount: 1 }],
        forYou: [item],
        genreRows: [{ genre: 'Sci-Fi', movieGenreId: 878, items: [item] }],
        decadeRow: { decade: 2010, items: [item] },
        personRow: { personId: 1, personName: 'Denis Villeneuve', items: [item] },
        dismissedKeys: new Set(['movie-1']),
        isFriendsLoading: true,
        isPersonalizedLoading: true,
      });

      useRecommendationsStore.getState().reset();

      const state = useRecommendationsStore.getState();
      expect(state.friendsWatched).toEqual([]);
      expect(state.forYou).toEqual([]);
      expect(state.genreRows).toEqual([]);
      expect(state.decadeRow).toBeNull();
      expect(state.personRow).toBeNull();
      expect(state.dismissedKeys).toEqual(new Set());
      expect(state.isFriendsLoading).toBe(false);
      expect(state.isPersonalizedLoading).toBe(false);
    });
  });
});
