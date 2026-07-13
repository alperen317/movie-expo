import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import { addWatchLogEntry, fetchWatchLog, WatchLogEntry } from '../lib/supabase/watchLog';
import { useListsStore } from './lists.store';
import { useToastStore } from './toast.store';

interface LogWatchOptions {
  watchedAt: Date;
  rating: number | null;
  note?: string | null;
  dropFromWatchlist?: boolean;
}

interface WatchLogState {
  entries: WatchLogEntry[];
  isLoading: boolean;
  error: string | null;
  fetchWatchLog: () => Promise<void>;
  isWatched: (mediaType: 'movie' | 'tv', id: number) => boolean;
  ratingFor: (mediaType: 'movie' | 'tv', id: number) => number | null;
  logWatch: (item: MediaCardItem, options: LogWatchOptions) => Promise<void>;
  reset: () => void;
}

// Rewatches create multiple watch_log rows per title; keep only the most
// recent one so lists/grids don't show duplicate posters.
export function dedupeWatchLog(entries: WatchLogEntry[]): WatchLogEntry[] {
  const latest = new Map<string, WatchLogEntry>();
  for (const entry of entries) {
    const key = `${entry.mediaType}-${entry.id}`;
    const current = latest.get(key);
    if (!current || entry.watchedAt > current.watchedAt) latest.set(key, entry);
  }
  return Array.from(latest.values()).sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
}

export const useWatchLogStore = create<WatchLogState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,
  fetchWatchLog: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await fetchWatchLog();
      set({ entries, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load watch log.',
        isLoading: false,
      });
    }
  },
  isWatched: (mediaType, id) =>
    get().entries.some((entry) => entry.mediaType === mediaType && entry.id === id),
  ratingFor: (mediaType, id) => {
    let latest: WatchLogEntry | null = null;
    for (const entry of get().entries) {
      if (entry.mediaType !== mediaType || entry.id !== id) continue;
      if (!latest || entry.watchedAt > latest.watchedAt) latest = entry;
    }
    return latest?.rating ?? null;
  },
  logWatch: async (item, options) => {
    const tempId = `pending-${Date.now()}`;
    const optimisticEntry: WatchLogEntry = {
      ...item,
      logId: tempId,
      watchedAt: options.watchedAt.toISOString(),
      rating: options.rating,
      note: options.note ?? null,
    };

    set((state) => ({ entries: [optimisticEntry, ...state.entries] }));
    useToastStore.getState().show(`${item.title} marked as watched`, 'check-circle');

    try {
      const saved = await addWatchLogEntry(item, options);
      set((state) => ({
        entries: state.entries.map((entry) => (entry.logId === tempId ? saved : entry)),
      }));

      if (options.dropFromWatchlist && useListsStore.getState().isInWatchlist(item.mediaType, item.id)) {
        await useListsStore.getState().toggleWatchlist(item, { silent: true });
      }
    } catch (err) {
      set((state) => ({ entries: state.entries.filter((entry) => entry.logId !== tempId) }));
      useToastStore.getState().show('Something went wrong. Please try again.', 'error-outline');
      throw err;
    }
  },
  reset: () => set({ entries: [], error: null }),
}));
