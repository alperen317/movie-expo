import { addDismissed, fetchDismissedKeys } from '../lib/supabase/recommendationFeedback';
import { fetchListItems, fetchListWatchSummary, fetchMyLists } from '../lib/supabase/sharedLists';
import { getGenreIdByName, normalizeGenreName } from '../lib/tmdb/genres';
import { getMediaMetadata } from '../lib/tmdb/mediaMetadataCache';
import { discoverMoviesByDecade, discoverMoviesByGenre, discoverMoviesByPerson } from '../lib/tmdb/movies';
import { discoverTVShowsByGenre } from '../lib/tmdb/tv';
import { useListsStore } from './lists.store';
import { useRecommendationsStore } from './recommendations.store';
import { useWatchLogStore } from './watchLog.store';

import type { MediaCardItem } from '../components/home/MovieCard';
import type { WatchLogEntry } from '../lib/supabase/watchLog';

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
jest.mock('../lib/supabase/recommendationFeedback', () => ({
  addDismissed: jest.fn(),
  fetchDismissedKeys: jest.fn(),
}));
jest.mock('../lib/supabase/sharedLists', () => ({
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
    mockGetMediaMetadata.mockResolvedValue({ topCast: [], director: null });
  });

  describe('fetchFriendsWatched', () => {
    it('aggregates watch summaries across every shared list, excluding titles the user already watched', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [{ ...item, id: 99, logId: 'log-99', watchedAt: '2026-01-01', rating: null, note: null }],
      });
      mockFetchMyLists.mockResolvedValue([{ id: 'list-1' }]);
      mockFetchListItems.mockResolvedValue([item, { ...item, id: 99, title: 'Already Watched' }]);
      mockFetchListWatchSummary.mockResolvedValue({ 'movie-1': 2, 'movie-99': 3 });

      await useRecommendationsStore.getState().fetchFriendsWatched();

      const { friendsWatched, isFriendsLoading } = useRecommendationsStore.getState();
      expect(isFriendsLoading).toBe(false);
      expect(friendsWatched).toEqual([{ ...item, friendCount: 2 }]);
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

    it('builds genre and decade rows from the taste profile and combines them into forYou', async () => {
      mockUseWatchLogStoreGetState.mockReturnValue({
        fetchWatchLog: jest.fn().mockResolvedValue(undefined),
        entries: [
          watchLogEntry({ id: 1 }),
          watchLogEntry({ id: 2 }),
          watchLogEntry({ id: 3 }),
        ],
      });
      mockGetGenreIdByName.mockImplementation((_name: string, scope: string) =>
        scope === 'movie' ? 18 : 118,
      );
      const genreMovie = { ...item, id: 10, title: 'Genre Movie', genres: ['Drama'], year: '1990' };
      const genreShow = { ...item, id: 11, title: 'Genre Show', genres: ['Drama'], year: '1991' };
      const decadeMovie = { ...item, id: 12, title: 'Decade Movie', genres: ['Drama'], year: '1993' };
      mockDiscoverMoviesByGenre.mockResolvedValue({ results: [genreMovie] });
      mockDiscoverTVShowsByGenre.mockResolvedValue({ results: [genreShow] });
      mockDiscoverMoviesByDecade.mockResolvedValue({ results: [decadeMovie] });
      mockDiscoverMoviesByPerson.mockResolvedValue({ results: [] });

      await useRecommendationsStore.getState().fetchPersonalized();

      const state = useRecommendationsStore.getState();
      expect(state.isPersonalizedLoading).toBe(false);
      expect(state.genreRows).toEqual([
        { genre: 'Drama', movieGenreId: 18, items: expect.arrayContaining([expect.objectContaining({ id: 10 }), expect.objectContaining({ id: 11 })]) },
      ]);
      expect(state.decadeRow).toEqual({
        decade: 1990,
        items: [expect.objectContaining({ id: 12 })],
      });
      const forYouIds = state.forYou.map((entry) => entry.id);
      expect(forYouIds).toEqual(expect.arrayContaining([10, 11, 12]));
      expect(state.personRow).toBeNull();
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
