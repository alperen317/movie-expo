import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDiscoverFeed } from './useDiscoverFeed';

// The real conversions pull in getAllGenres (i18n-backed); genre naming isn't
// under test here, so each mock keeps just the fields the hook itself reads
// or exposes (id, title, year, voteAverage, mediaType).
jest.mock('../../components/home/MovieCard', () => ({
  toMovieCardItem: jest.fn(
    (m: { id: number; title: string; vote_average: number; release_date?: string }) => ({
      id: m.id,
      title: m.title,
      year: m.release_date?.slice(0, 4) ?? null,
      voteAverage: m.vote_average,
      posterPath: null,
      genres: [],
      mediaType: 'movie',
    }),
  ),
  toTVCardItem: jest.fn(
    (s: { id: number; name: string; vote_average: number; first_air_date?: string }) => ({
      id: s.id,
      title: s.name,
      year: s.first_air_date?.slice(0, 4) ?? null,
      voteAverage: s.vote_average,
      posterPath: null,
      genres: [],
      mediaType: 'tv',
    }),
  ),
}));

jest.mock('../i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

const mockDiscoverMovies = jest.fn();
const mockDiscoverTVShows = jest.fn();
jest.mock('../tmdb/discover', () => ({
  discoverMovies: (...args: unknown[]) => mockDiscoverMovies(...args),
  discoverTVShows: (...args: unknown[]) => mockDiscoverTVShows(...args),
}));

const mockGetGenreCatalog = jest.fn();
jest.mock('../tmdb/genres', () => ({
  getGenreCatalog: () => mockGetGenreCatalog(),
}));

const baseOptions = {
  enabled: true,
  mediaType: 'all' as const,
  genreName: null,
  minRating: null,
  decade: null,
  sort: 'popularity' as const,
};

function moviePage(page: number) {
  return {
    page,
    results: [
      { id: 1, title: 'M1', vote_average: 7, release_date: '2020-01-01' },
      { id: 2, title: 'M2', vote_average: 9, release_date: '2021-01-01' },
    ],
    total_pages: 2,
    total_results: 4,
  };
}

function tvPage(page: number) {
  return {
    page,
    results: [{ id: 10, name: 'T1', vote_average: 8, first_air_date: '2019-01-01' }],
    total_pages: 1,
    total_results: 1,
  };
}

beforeEach(() => {
  mockDiscoverMovies.mockReset();
  mockDiscoverTVShows.mockReset();
  mockGetGenreCatalog.mockReset().mockReturnValue([]);
  mockDiscoverMovies.mockImplementation(async (query: { page: number }) => moviePage(query.page));
  mockDiscoverTVShows.mockImplementation(async (query: { page: number }) => tvPage(query.page));
});

describe('useDiscoverFeed', () => {
  it('stays idle and issues no requests while disabled', async () => {
    const { result } = await renderHook(() => useDiscoverFeed({ ...baseOptions, enabled: false }));

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockDiscoverMovies).not.toHaveBeenCalled();
    expect(mockDiscoverTVShows).not.toHaveBeenCalled();
  });

  it('fetches both scopes and interleaves them for popularity', async () => {
    const { result } = await renderHook(() => useDiscoverFeed(baseOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // movies[0], shows[0], movies[1] -- shows has no second entry to pair with.
    expect(result.current.items.map((i) => i.title)).toEqual(['M1', 'T1', 'M2']);
  });

  it('sorts by rating across both scopes instead of interleaving', async () => {
    const { result } = await renderHook(() => useDiscoverFeed({ ...baseOptions, sort: 'rating' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items.map((i) => i.title)).toEqual(['M2', 'T1', 'M1']);
  });

  it('skips the TV scope for a genre with no TV id', async () => {
    mockGetGenreCatalog.mockReturnValue([{ name: 'Comedy', movieId: 35, tvId: null }]);

    const { result } = await renderHook(() =>
      useDiscoverFeed({ ...baseOptions, genreName: 'Comedy' }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockDiscoverMovies).toHaveBeenCalledWith(expect.objectContaining({ genreIds: [35] }));
    expect(mockDiscoverTVShows).not.toHaveBeenCalled();
  });

  it('loadMore appends and dedupes the next page', async () => {
    const { result } = await renderHook(() => useDiscoverFeed(baseOptions));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(3);

    await act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Movies page 2 repeats the same fixture ids as page 1 (by design of the
    // mock), so the appended list must not grow with duplicates; TV was
    // already exhausted (total_pages: 1) but is still queried on every page,
    // so its repeat must also be deduped away.
    expect(result.current.items).toHaveLength(3);
  });

  it('surfaces a rejected request as an error and clears the list', async () => {
    mockDiscoverMovies.mockRejectedValue(new Error('boom'));

    const { result } = await renderHook(() => useDiscoverFeed(baseOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('boom');
    expect(result.current.items).toEqual([]);
  });
});
