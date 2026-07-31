import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MediaCardItem, toSearchCardItem } from '../../components/home/MovieCard';
import { PersonResultItem, toPersonResultItem } from '../../components/search/PersonResultRow';
import { searchMulti } from '../tmdb/search';

const SEARCH_DEBOUNCE_MS = 350;

// `loading` is the first search for a query (nothing on screen yet, so the
// caller should show skeletons); `refining` means results from the previous
// keystroke are still displayed while a newer query is in flight.
export type SearchStatus = 'idle' | 'loading' | 'refining' | 'ready' | 'error';

interface UseMediaSearchOptions {
  // Fired once a debounced query successfully resolves, so callers can
  // layer extra behavior (e.g. recording recent searches) without the
  // hook itself knowing about that concern.
  onQueryResolved?: (query: string) => void;
}

type MultiResults = Awaited<ReturnType<typeof searchMulti>>['results'];

function toItems(results: MultiResults): MediaCardItem[] {
  return results.map(toSearchCardItem).filter((item): item is MediaCardItem => item !== null);
}

// People come back interleaved with titles on the same pages, so they're split
// off into their own list rather than dropped: the media list stays a pure
// grid/row feed that the genre, rating and year facets can filter, and the
// people keep TMDB's relevance order.
function toPeople(results: MultiResults): PersonResultItem[] {
  return results.map(toPersonResultItem).filter((item): item is PersonResultItem => item !== null);
}

function dedupePeople(people: PersonResultItem[]): PersonResultItem[] {
  const seen = new Set<number>();
  return people.filter((person) => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  });
}

// A title can surface on more than one page of /search/multi, and a movie and
// a show can share a TMDB id, so identity is the pair.
function dedupe(items: MediaCardItem[]): MediaCardItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useMediaSearch({ onQueryResolved }: UseMediaSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [people, setPeople] = useState<PersonResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Bumped by retry() so the fetch effect re-runs for an unchanged query.
  const [retryToken, setRetryToken] = useState(0);
  // Lets a slow loadMore response tell whether the query moved on while it was
  // in flight, so page 2 of "dun" never gets appended to results for "dune".
  const activeQueryRef = useRef('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Skips the debounce for queries the user picked rather than typed (a recent
  // search chip), where waiting out the timer just reads as lag.
  const submitQuery = useCallback((next: string) => {
    setQuery(next);
    setDebouncedQuery(next.trim());
  }, []);

  const retry = useCallback(() => {
    setSearchError(null);
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    activeQueryRef.current = debouncedQuery;

    if (!debouncedQuery) {
      setResults([]);
      setPeople([]);
      setSearchError(null);
      setIsSearching(false);
      setPage(1);
      setTotalPages(1);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    searchMulti(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        setResults(dedupe(toItems(data.results)));
        setPeople(dedupePeople(toPeople(data.results)));
        setPage(1);
        setTotalPages(data.total_pages);
        onQueryResolved?.(debouncedQuery);
      })
      .catch((err) => {
        if (cancelled) return;
        // Results are otherwise kept across queries so refinement doesn't
        // blank the list; on failure they'd be stale next to an error, so go.
        setResults([]);
        setPeople([]);
        setSearchError(err instanceof Error ? err.message : 'Search failed.');
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, retryToken, onQueryResolved]);

  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (!debouncedQuery || isSearching || isLoadingMore || page >= totalPages) return;

    const requestedQuery = debouncedQuery;
    const nextPage = page + 1;
    setIsLoadingMore(true);

    searchMulti(requestedQuery, nextPage)
      .then((data) => {
        if (activeQueryRef.current !== requestedQuery) return;
        setResults((previous) => dedupe([...previous, ...toItems(data.results)]));
        setPeople((previous) => dedupePeople([...previous, ...toPeople(data.results)]));
        setPage(nextPage);
        setTotalPages(data.total_pages);
      })
      // A failed extra page isn't worth an error screen; the list keeps what
      // it has and the next scroll to the end retries.
      .catch(() => {})
      .finally(() => setIsLoadingMore(false));
  }, [debouncedQuery, isLoadingMore, isSearching, page, totalPages]);

  const status: SearchStatus = useMemo(() => {
    if (!debouncedQuery) return 'idle';
    if (searchError) return 'error';
    if (isSearching) return results.length + people.length > 0 ? 'refining' : 'loading';
    return 'ready';
  }, [debouncedQuery, isSearching, people.length, results.length, searchError]);

  return {
    query,
    setQuery,
    submitQuery,
    debouncedQuery,
    results,
    people,
    status,
    isLoadingMore,
    hasMore,
    loadMore,
    retry,
    searchError,
  };
}
