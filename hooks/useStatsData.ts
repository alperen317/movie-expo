import { useCallback, useEffect, useState } from 'react';

import { getMediaMetadata } from '../lib/tmdb/mediaMetadataCache';
import type { StatsInput } from '../lib/stats';
import { dedupeWatchLog, useWatchLogStore } from '../stores/watchLog.store';
import { useEpisodeProgressStore } from '../stores/episodeProgress.store';

const EMPTY_INPUT: StatsInput = { movies: [], episodes: [] };

export function useStatsData() {
  const watchLogEntries = useWatchLogStore((state) => state.entries);
  const episodeEntries = useEpisodeProgressStore((state) => state.entries);

  const [input, setInput] = useState<StatsInput>(EMPTY_INPUT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const movies = dedupeWatchLog(watchLogEntries).filter((entry) => entry.mediaType === 'movie');
  const episodes = Object.values(episodeEntries);
  const showIds = Array.from(new Set(episodes.map((episode) => episode.showId)));

  const moviesKey = movies.map((movie) => `${movie.id}-${movie.watchedAt}`).join(',');
  const episodesKey = episodes
    .map((episode) => `${episode.showId}-${episode.seasonNumber}-${episode.episodeNumber}-${episode.watchedAt}`)
    .join(',');

  useEffect(() => {
    if (movies.length === 0 && showIds.length === 0) {
      setInput(EMPTY_INPUT);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      const [movieResults, showResults] = await Promise.all([
        Promise.allSettled(
          movies.map(async (movie) => {
            const metadata = await getMediaMetadata('movie', movie.id);
            return { runtimeMinutes: metadata.runtimeMinutes, genres: metadata.genres, watchedAt: movie.watchedAt };
          }),
        ),
        Promise.allSettled(
          showIds.map(async (showId) => {
            const metadata = await getMediaMetadata('tv', showId);
            return { showId, runtimeMinutes: metadata.runtimeMinutes, genres: metadata.genres };
          }),
        ),
      ]);

      if (cancelled) return;

      const movieInputs = movieResults
        .filter((result): result is PromiseFulfilledResult<StatsInput['movies'][number]> => result.status === 'fulfilled')
        .map((result) => result.value);

      const showMetaById = new Map<number, { runtimeMinutes: number; genres: string[] }>();
      for (const result of showResults) {
        if (result.status === 'fulfilled') {
          showMetaById.set(result.value.showId, result.value);
        }
      }

      const episodeInputs = episodes
        .map((episode) => {
          const meta = showMetaById.get(episode.showId);
          if (!meta) return null;
          return {
            showId: episode.showId,
            runtimeMinutes: meta.runtimeMinutes,
            genres: meta.genres,
            watchedAt: episode.watchedAt,
          };
        })
        .filter((episode): episode is StatsInput['episodes'][number] => episode !== null);

      setInput({ movies: movieInputs, episodes: episodeInputs });
      setIsLoading(false);
    })().catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Failed to load stats.');
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moviesKey, episodesKey, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  return { input, isLoading, error, refresh };
}
