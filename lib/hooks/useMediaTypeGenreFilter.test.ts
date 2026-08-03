import { act, renderHook } from '@testing-library/react-native';

import { decadeOf, RATING_THRESHOLDS, useMediaTypeGenreFilter } from './useMediaTypeGenreFilter';

interface Item {
  mediaType: 'movie' | 'tv';
  genres: string[];
  voteAverage: number;
  year: string | null;
  title: string;
}

function item(overrides: Partial<Item> & { title: string }): Item {
  return {
    mediaType: 'movie',
    genres: ['Drama'],
    voteAverage: 7,
    year: '2000',
    ...overrides,
  };
}

const items: Item[] = [
  item({
    title: 'movie-drama-90s-low',
    mediaType: 'movie',
    genres: ['Drama'],
    voteAverage: 5,
    year: '1994',
  }),
  item({
    title: 'movie-comedy-90s-high',
    mediaType: 'movie',
    genres: ['Comedy'],
    voteAverage: 8,
    year: '1999',
  }),
  item({
    title: 'tv-drama-2010s-high',
    mediaType: 'tv',
    genres: ['Drama'],
    voteAverage: 9,
    year: '2015',
  }),
  item({
    title: 'tv-scifi-2010s-mid',
    mediaType: 'tv',
    genres: ['Sci-Fi'],
    voteAverage: 7,
    year: '2018',
  }),
];

describe('decadeOf', () => {
  it('floors a year to its decade', () => {
    expect(decadeOf('1994')).toBe(1990);
    expect(decadeOf('2000')).toBe(2000);
  });

  it('returns null for missing or non-numeric years', () => {
    expect(decadeOf(null)).toBeNull();
    expect(decadeOf('')).toBeNull();
    expect(decadeOf('tbd')).toBeNull();
  });
});

describe('useMediaTypeGenreFilter', () => {
  it('starts unfiltered', async () => {
    const { result } = await renderHook(() => useMediaTypeGenreFilter(items));

    expect(result.current.filteredItems).toEqual(items);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('filters by media type', async () => {
    const { result } = await renderHook(() => useMediaTypeGenreFilter(items));

    await act(() => result.current.setMediaTypeFilter('tv'));

    expect(result.current.filteredItems.map((i) => i.title)).toEqual([
      'tv-drama-2010s-high',
      'tv-scifi-2010s-mid',
    ]);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('filters by genre, rating, and decade together', async () => {
    const { result } = await renderHook(() => useMediaTypeGenreFilter(items));

    await act(() => result.current.setGenreFilter('Drama'));
    await act(() => result.current.setMinRating(8));
    await act(() => result.current.setDecadeFilter(2010));

    expect(result.current.filteredItems.map((i) => i.title)).toEqual(['tv-drama-2010s-high']);
    expect(result.current.activeFilterCount).toBe(3);
  });

  it('clearFilters resets every facet', async () => {
    const { result } = await renderHook(() => useMediaTypeGenreFilter(items));

    await act(() => {
      result.current.setMediaTypeFilter('movie');
      result.current.setGenreFilter('Comedy');
      result.current.setMinRating(6);
      result.current.setDecadeFilter(1990);
    });
    await act(() => result.current.clearFilters());

    expect(result.current.mediaTypeFilter).toBe('all');
    expect(result.current.genreFilter).toBeNull();
    expect(result.current.minRating).toBeNull();
    expect(result.current.decadeFilter).toBeNull();
    expect(result.current.filteredItems).toEqual(items);
  });

  it('derives available genres/decades/ratings from the other active facets', async () => {
    const { result } = await renderHook(() => useMediaTypeGenreFilter(items));

    await act(() => result.current.setMediaTypeFilter('tv'));

    // Only genres/decades/ratings reachable among the two TV items.
    expect([...result.current.availableGenres].sort()).toEqual(['Drama', 'Sci-Fi']);
    expect(result.current.availableDecades).toEqual([2010]);
    expect(result.current.availableRatings).toEqual(RATING_THRESHOLDS.filter((t) => t <= 9));
  });

  it('folds a selection with no remaining matches back into the option list', async () => {
    const { result } = await renderHook(() => useMediaTypeGenreFilter(items));

    await act(() => result.current.setGenreFilter('Sci-Fi'));
    await act(() => result.current.setMinRating(9));

    // No Sci-Fi item scores >= 9, so the pool is empty, but the active
    // rating chip must still be present -- it's the one a viewer needs to
    // tap to escape the empty result, not one that's silently disappeared.
    expect(result.current.filteredItems).toEqual([]);
    expect(result.current.availableRatings).toContain(9);
  });
});
