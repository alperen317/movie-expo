import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MediaCardItem, toMovieCardItem, toTVCardItem } from '../../components/home/MovieCard';
import i18n from '../i18n';
import { type DiscoverSort, discoverMovies, discoverTVShows } from '../tmdb/discover';
import { getGenreCatalog } from '../tmdb/genres';
import type { MediaTypeFilter } from './useMediaTypeGenreFilter';

interface UseDiscoverFeedOptions {
  // The screen only browses this way once something is actually narrowed down;
  // until then the feed stays idle instead of paging through all of TMDB.
  enabled: boolean;
  mediaType: MediaTypeFilter;
  // The display name, as shown on the chip -- resolved to per-scope ids here.
  genreName: string | null;
  minRating: number | null;
  decade: number | null;
  sort: DiscoverSort;
}

function dedupe(items: MediaCardItem[]): MediaCardItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Two sources, one list. Popularity isn't comparable across the film and show
// endpoints (the scores live on different scales), so that order is interleaved
// -- each list keeps TMDB's ranking and neither side buries the other. The rest
// sort on fields the cards already carry, so they can be ordered properly.
function merge(movies: MediaCardItem[], shows: MediaCardItem[], sort: DiscoverSort) {
  if (sort === 'popularity') {
    const merged: MediaCardItem[] = [];
    for (let index = 0; index < Math.max(movies.length, shows.length); index += 1) {
      if (movies[index]) merged.push(movies[index]);
      if (shows[index]) merged.push(shows[index]);
    }
    return merged;
  }

  return [...movies, ...shows].sort((a, b) => {
    switch (sort) {
      case 'rating':
        return b.voteAverage - a.voteAverage;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return (b.year ?? '').localeCompare(a.year ?? '');
    }
  });
}

export function useDiscoverFeed({
  enabled,
  mediaType,
  genreName,
  minRating,
  decade,
  sort,
}: UseDiscoverFeedOptions) {
  const [items, setItems] = useState<MediaCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const filterKey = `${mediaType}|${genreName ?? ''}|${minRating ?? ''}|${decade ?? ''}|${sort}`;
  // Lets a slow page-2 response tell whether the filters moved on while it was
  // in flight, so results for one set never land under another.
  const activeFilterKey = useRef(filterKey);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const selected = genreName
        ? (getGenreCatalog().find((option) => option.name === genreName) ?? null)
        : null;
      const movieGenreIds = selected && selected.movieId !== null ? [selected.movieId] : [];
      const tvGenreIds = selected && selected.tvId !== null ? [selected.tvId] : [];

      // A genre with no counterpart in a scope (Sci-Fi & Fantasy has no film id)
      // would otherwise widen that scope to everything once its filter is
      // dropped, so the scope is skipped entirely instead.
      const wantsMovies = mediaType !== 'tv' && (!genreName || movieGenreIds.length > 0);
      const wantsShows = mediaType !== 'movie' && (!genreName || tvGenreIds.length > 0);

      const query = { minRating, decade, sort, page: targetPage };

      const [movieData, tvData] = await Promise.all([
        wantsMovies ? discoverMovies({ ...query, genreIds: movieGenreIds }) : null,
        wantsShows ? discoverTVShows({ ...query, genreIds: tvGenreIds }) : null,
      ]);

      return {
        results: merge(
          movieData?.results.map(toMovieCardItem) ?? [],
          tvData?.results.map(toTVCardItem) ?? [],
          sort,
        ),
        totalPages: Math.max(movieData?.total_pages ?? 0, tvData?.total_pages ?? 0),
      };
    },
    [decade, genreName, mediaType, minRating, sort],
  );

  useEffect(() => {
    activeFilterKey.current = filterKey;

    if (!enabled) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      setPage(1);
      setTotalPages(1);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPage(1)
      .then(({ results, totalPages: total }) => {
        if (cancelled) return;
        setItems(dedupe(results));
        setPage(1);
        setTotalPages(total);
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        // i18n.t rather than a t() closure, which would make this effect depend
        // on it and refetch the whole feed on every language change.
        setError(err instanceof Error ? err.message : i18n.t('browse.loadError'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // fetchPage changes with exactly the inputs filterKey encodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, filterKey]);

  const loadMore = useCallback(() => {
    if (!enabled || isLoading || isLoadingMore || page >= totalPages) return;

    const requestedKey = filterKey;
    const nextPage = page + 1;
    setIsLoadingMore(true);

    fetchPage(nextPage)
      .then(({ results, totalPages: total }) => {
        if (activeFilterKey.current !== requestedKey) return;
        setItems((previous) => dedupe([...previous, ...results]));
        setPage(nextPage);
        setTotalPages(total);
      })
      // A failed extra page isn't worth an error screen; the list keeps what it
      // has and the next scroll to the end retries.
      .catch(() => {})
      .finally(() => setIsLoadingMore(false));
  }, [enabled, fetchPage, filterKey, isLoading, isLoadingMore, page, totalPages]);

  // Fixed rather than derived: with a server-side feed there are no loaded
  // items to read a decade list off, and TMDB has something for all of them.
  const availableDecades = useMemo(() => {
    const currentDecade = Math.floor(new Date().getFullYear() / 10) * 10;
    return Array.from({ length: 8 }, (_, index) => currentDecade - index * 10);
  }, []);

  return { items, isLoading, isLoadingMore, error, loadMore, availableDecades };
}
