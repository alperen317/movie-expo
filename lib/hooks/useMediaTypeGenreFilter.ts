import { useCallback, useMemo, useState } from 'react';

export type MediaTypeFilter = 'all' | 'movie' | 'tv';

// A fixed ladder rather than a slider: a page of results is 20-40 titles, which
// is far too coarse a sample for a continuous threshold to mean anything, and
// chips stay tappable where a slider handle wouldn't be.
export const RATING_THRESHOLDS = [6, 7, 8, 9];

interface FilterableMedia {
  mediaType: 'movie' | 'tv';
  genres: string[];
  voteAverage: number;
  year: string | null;
}

export function decadeOf(year: string | null): number | null {
  const parsed = Number(year);
  if (!year || !Number.isFinite(parsed)) return null;
  return Math.floor(parsed / 10) * 10;
}

export function useMediaTypeGenreFilter<T extends FilterableMedia>(items: T[]) {
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [decadeFilter, setDecadeFilter] = useState<number | null>(null);

  const byMediaType = useCallback(
    (item: T) => mediaTypeFilter === 'all' || item.mediaType === mediaTypeFilter,
    [mediaTypeFilter],
  );
  const byGenre = useCallback(
    (item: T) => !genreFilter || item.genres.includes(genreFilter),
    [genreFilter],
  );
  const byRating = useCallback(
    (item: T) => minRating === null || item.voteAverage >= minRating,
    [minRating],
  );
  const byDecade = useCallback(
    (item: T) => decadeFilter === null || decadeOf(item.year) === decadeFilter,
    [decadeFilter],
  );

  // Every facet's options are derived from the items that pass the *other*
  // facets, so no chip on screen can lead to an empty list. Whatever is already
  // selected is folded back in even when nothing matches it: a filter that
  // empties the list is exactly the one the viewer needs to see to switch off.
  const availableGenres = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...items
              .filter((item) => byMediaType(item) && byRating(item) && byDecade(item))
              .flatMap((item) => item.genres),
            genreFilter,
          ].filter((genre): genre is string => genre !== null),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [items, genreFilter, byMediaType, byRating, byDecade],
  );

  const availableDecades = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...items
              .filter((item) => byMediaType(item) && byGenre(item) && byRating(item))
              .map((item) => decadeOf(item.year)),
            decadeFilter,
          ].filter((decade): decade is number => decade !== null),
        ),
      ).sort((a, b) => b - a),
    [items, decadeFilter, byMediaType, byGenre, byRating],
  );

  const availableRatings = useMemo(() => {
    const pool = items.filter((item) => byMediaType(item) && byGenre(item) && byDecade(item));
    return RATING_THRESHOLDS.filter(
      (threshold) => threshold === minRating || pool.some((item) => item.voteAverage >= threshold),
    );
  }, [items, minRating, byMediaType, byGenre, byDecade]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) => byMediaType(item) && byGenre(item) && byRating(item) && byDecade(item),
      ),
    [items, byMediaType, byGenre, byRating, byDecade],
  );

  const clearFilters = useCallback(() => {
    setMediaTypeFilter('all');
    setGenreFilter(null);
    setMinRating(null);
    setDecadeFilter(null);
  }, []);

  const activeFilterCount =
    (mediaTypeFilter === 'all' ? 0 : 1) +
    (genreFilter === null ? 0 : 1) +
    (minRating === null ? 0 : 1) +
    (decadeFilter === null ? 0 : 1);

  return {
    mediaTypeFilter,
    setMediaTypeFilter,
    genreFilter,
    setGenreFilter,
    minRating,
    setMinRating,
    decadeFilter,
    setDecadeFilter,
    availableGenres,
    availableDecades,
    availableRatings,
    filteredItems,
    activeFilterCount,
    clearFilters,
  };
}
