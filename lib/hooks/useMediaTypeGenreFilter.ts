import { useMemo, useState } from 'react';

export type MediaTypeFilter = 'all' | 'movie' | 'tv';

interface FilterableMedia {
  mediaType: 'movie' | 'tv';
  genres: string[];
}

export function useMediaTypeGenreFilter<T extends FilterableMedia>(items: T[]) {
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);

  const availableGenres = useMemo(
    () =>
      Array.from(new Set(items.flatMap((item) => item.genres))).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => mediaTypeFilter === 'all' || item.mediaType === mediaTypeFilter)
        .filter((item) => !genreFilter || item.genres.includes(genreFilter)),
    [items, mediaTypeFilter, genreFilter],
  );

  const clearFilters = () => {
    setMediaTypeFilter('all');
    setGenreFilter(null);
  };

  return {
    mediaTypeFilter,
    setMediaTypeFilter,
    genreFilter,
    setGenreFilter,
    availableGenres,
    filteredItems,
    clearFilters,
  };
}
