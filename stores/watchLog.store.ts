import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import i18n from '../lib/i18n';
import {
  addWatchLogEntry,
  fetchWatchLog,
  updateWatchLogEntry,
  WatchLogEntry,
} from '../lib/supabase/watchLog';
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
  latestEntryFor: (mediaType: 'movie' | 'tv', id: number) => WatchLogEntry | null;
  ratingFor: (mediaType: 'movie' | 'tv', id: number) => number | null;
  logWatch: (item: MediaCardItem, options: LogWatchOptions) => Promise<void>;
  updateWatch: (logId: string, options: LogWatchOptions) => Promise<void>;
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
  latestEntryFor: (mediaType, id) => {
    let latest: WatchLogEntry | null = null;
    for (const entry of get().entries) {
      if (entry.mediaType !== mediaType || entry.id !== id) continue;
      if (!latest || entry.watchedAt > latest.watchedAt) latest = entry;
    }
    return latest;
  },
  ratingFor: (mediaType, id) => get().latestEntryFor(mediaType, id)?.rating ?? null,
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
    useToastStore
      .getState()
      .show(i18n.t('toasts.markedAsWatched', { title: item.title }), 'check-circle');

    try {
      const saved = await addWatchLogEntry(item, options);
      set((state) => ({
        entries: state.entries.map((entry) => (entry.logId === tempId ? saved : entry)),
      }));

      if (
        options.dropFromWatchlist &&
        useListsStore.getState().isInWatchlist(item.mediaType, item.id)
      ) {
        await useListsStore.getState().toggleWatchlist(item, { silent: true });
      }
    } catch (err) {
      set((state) => ({ entries: state.entries.filter((entry) => entry.logId !== tempId) }));
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },
  updateWatch: async (logId, options) => {
    const previous = get().entries;
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.logId === logId
          ? {
              ...entry,
              watchedAt: options.watchedAt.toISOString(),
              rating: options.rating,
              note: options.note ?? null,
            }
          : entry,
      ),
    }));
    useToastStore.getState().show(i18n.t('toasts.watchLogUpdated'), 'check-circle');

    try {
      const saved = await updateWatchLogEntry(logId, options);
      set((state) => ({
        entries: state.entries.map((entry) => (entry.logId === logId ? saved : entry)),
      }));

      if (
        options.dropFromWatchlist &&
        useListsStore.getState().isInWatchlist(saved.mediaType, saved.id)
      ) {
        await useListsStore.getState().toggleWatchlist(saved, { silent: true });
      }
    } catch (err) {
      set({ entries: previous });
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },
  reset: () => set({ entries: [], error: null }),
}));
