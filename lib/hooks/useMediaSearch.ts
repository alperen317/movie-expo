import { useEffect, useState } from 'react';

import { MediaCardItem, toSearchCardItem } from '../../components/home/MovieCard';
import { searchMulti } from '../tmdb/search';

const SEARCH_DEBOUNCE_MS = 400;

interface UseMediaSearchOptions {
  // Fired once a debounced query successfully resolves, so callers can
  // layer extra behavior (e.g. recording recent searches) without the
  // hook itself knowing about that concern.
  onQueryResolved?: (query: string) => void;
}

export function useMediaSearch({ onQueryResolved }: UseMediaSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    searchMulti(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        const items = data.results
          .map(toSearchCardItem)
          .filter((item): item is MediaCardItem => item !== null);
        setResults(items);
        onQueryResolved?.(debouncedQuery);
      })
      .catch((err) => {
        if (cancelled) return;
        setSearchError(err instanceof Error ? err.message : 'Search failed.');
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, onQueryResolved]);

  return { query, setQuery, debouncedQuery, results, isSearching, searchError };
}
