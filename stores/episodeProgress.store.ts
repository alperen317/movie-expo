import { create } from 'zustand';

import {
  EpisodeProgressEntry,
  fetchAllEpisodeProgress,
  markEpisodesWatchedBatch,
  markEpisodeWatched,
  unmarkEpisodeWatched,
  unmarkSeasonWatched,
} from '../lib/supabase/episodeProgress';
import { useToastStore } from './toast.store';

export function episodeKey(showId: number, seasonNumber: number, episodeNumber: number): string {
  return `${showId}-${seasonNumber}-${episodeNumber}`;
}

interface LastWatchedEpisode {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
}

interface EpisodeProgressState {
  entries: Record<string, EpisodeProgressEntry>;
  isLoading: boolean;
  error: string | null;
  fetchProgress: () => Promise<void>;
  isEpisodeWatched: (showId: number, seasonNumber: number, episodeNumber: number) => boolean;
  toggleEpisode: (showId: number, seasonNumber: number, episodeNumber: number) => Promise<void>;
  markSeason: (
    showId: number,
    seasonNumber: number,
    episodeNumbers: number[],
  ) => Promise<void>;
  unmarkSeason: (showId: number, seasonNumber: number, episodeNumbers: number[]) => Promise<void>;
  showIdsInProgress: () => number[];
  lastWatchedForShow: (showId: number) => LastWatchedEpisode | null;
  reset: () => void;
}

export const useEpisodeProgressStore = create<EpisodeProgressState>((set, get) => ({
  entries: {},
  isLoading: false,
  error: null,

  fetchProgress: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await fetchAllEpisodeProgress();
      set({
        entries: Object.fromEntries(
          entries.map((entry) => [
            episodeKey(entry.showId, entry.seasonNumber, entry.episodeNumber),
            entry,
          ]),
        ),
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load episode progress.',
        isLoading: false,
      });
    }
  },

  isEpisodeWatched: (showId, seasonNumber, episodeNumber) =>
    Boolean(get().entries[episodeKey(showId, seasonNumber, episodeNumber)]),

  toggleEpisode: async (showId, seasonNumber, episodeNumber) => {
    const key = episodeKey(showId, seasonNumber, episodeNumber);
    const wasWatched = Boolean(get().entries[key]);
    const now = new Date();

    set((state) => {
      const entries = { ...state.entries };
      if (wasWatched) delete entries[key];
      else entries[key] = { showId, seasonNumber, episodeNumber, watchedAt: now.toISOString() };
      return { entries };
    });

    try {
      if (wasWatched) await unmarkEpisodeWatched(showId, seasonNumber, episodeNumber);
      else await markEpisodeWatched(showId, seasonNumber, episodeNumber, now);
    } catch (err) {
      set((state) => {
        const entries = { ...state.entries };
        if (wasWatched) {
          entries[key] = { showId, seasonNumber, episodeNumber, watchedAt: now.toISOString() };
        } else {
          delete entries[key];
        }
        return { entries };
      });
      useToastStore.getState().show('Something went wrong. Please try again.', 'error-outline');
      throw err;
    }
  },

  markSeason: async (showId, seasonNumber, episodeNumbers) => {
    const now = new Date();
    const previous = get().entries;

    set((state) => {
      const entries = { ...state.entries };
      for (const episodeNumber of episodeNumbers) {
        entries[episodeKey(showId, seasonNumber, episodeNumber)] = {
          showId,
          seasonNumber,
          episodeNumber,
          watchedAt: now.toISOString(),
        };
      }
      return { entries };
    });
    useToastStore.getState().show(`Season ${seasonNumber} marked as watched`, 'check-circle');

    try {
      await markEpisodesWatchedBatch(
        showId,
        episodeNumbers.map((episodeNumber) => ({ seasonNumber, episodeNumber })),
        now,
      );
    } catch (err) {
      set({ entries: previous });
      useToastStore.getState().show('Something went wrong. Please try again.', 'error-outline');
      throw err;
    }
  },

  unmarkSeason: async (showId, seasonNumber, episodeNumbers) => {
    const previous = get().entries;

    set((state) => {
      const entries = { ...state.entries };
      for (const episodeNumber of episodeNumbers) {
        delete entries[episodeKey(showId, seasonNumber, episodeNumber)];
      }
      return { entries };
    });

    try {
      await unmarkSeasonWatched(showId, seasonNumber);
    } catch (err) {
      set({ entries: previous });
      useToastStore.getState().show('Something went wrong. Please try again.', 'error-outline');
      throw err;
    }
  },

  showIdsInProgress: () => {
    const byShow = new Map<number, string>();
    for (const entry of Object.values(get().entries)) {
      const current = byShow.get(entry.showId);
      if (!current || entry.watchedAt > current) byShow.set(entry.showId, entry.watchedAt);
    }
    return Array.from(byShow.entries())
      .sort((a, b) => (a[1] > b[1] ? -1 : 1))
      .map(([showId]) => showId);
  },

  lastWatchedForShow: (showId) => {
    let latest: LastWatchedEpisode | null = null;
    for (const entry of Object.values(get().entries)) {
      if (entry.showId !== showId) continue;
      if (
        !latest ||
        entry.seasonNumber > latest.seasonNumber ||
        (entry.seasonNumber === latest.seasonNumber && entry.episodeNumber > latest.episodeNumber)
      ) {
        latest = {
          seasonNumber: entry.seasonNumber,
          episodeNumber: entry.episodeNumber,
          watchedAt: entry.watchedAt,
        };
      }
    }
    return latest;
  },

  reset: () => set({ entries: {}, error: null }),
}));
