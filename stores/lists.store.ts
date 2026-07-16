import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import i18n from '../lib/i18n';
import {
  addSavedMedia,
  fetchSavedMedia,
  removeSavedMedia,
  SavedMediaItem,
} from '../lib/supabase/lists';
import { useToastStore } from './toast.store';

function keyOf(mediaType: 'movie' | 'tv', id: number): string {
  return `${mediaType}-${id}`;
}

interface ListsState {
  favorites: Record<string, SavedMediaItem>;
  isFavoritesLoading: boolean;
  favoritesError: string | null;
  fetchFavorites: () => Promise<void>;
  isFavorite: (mediaType: 'movie' | 'tv', id: number) => boolean;
  toggleFavorite: (item: MediaCardItem) => Promise<void>;

  watchlist: Record<string, SavedMediaItem>;
  isWatchlistLoading: boolean;
  watchlistError: string | null;
  fetchWatchlist: () => Promise<void>;
  isInWatchlist: (mediaType: 'movie' | 'tv', id: number) => boolean;
  toggleWatchlist: (item: MediaCardItem, options?: { silent?: boolean }) => Promise<void>;

  reset: () => void;
}

export const useListsStore = create<ListsState>((set, get) => ({
  favorites: {},
  isFavoritesLoading: false,
  favoritesError: null,
  fetchFavorites: async () => {
    set({ isFavoritesLoading: true, favoritesError: null });
    try {
      const items = await fetchSavedMedia('favorite');
      set({
        favorites: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        isFavoritesLoading: false,
      });
    } catch (err) {
      set({
        favoritesError: err instanceof Error ? err.message : 'Failed to load favorites.',
        isFavoritesLoading: false,
      });
    }
  },
  isFavorite: (mediaType, id) => Boolean(get().favorites[keyOf(mediaType, id)]),
  toggleFavorite: async (item) => {
    const key = keyOf(item.mediaType, item.id);
    const wasSaved = Boolean(get().favorites[key]);

    set((state) => {
      const favorites = { ...state.favorites };
      if (wasSaved) delete favorites[key];
      else favorites[key] = { ...item, savedAt: new Date().toISOString() };
      return { favorites };
    });
    useToastStore
      .getState()
      .show(
        wasSaved
          ? i18n.t('toasts.removedFromFavorites', { title: item.title })
          : i18n.t('toasts.addedToFavorites', { title: item.title }),
        wasSaved ? 'favorite-border' : 'favorite',
      );

    try {
      if (wasSaved) await removeSavedMedia(item.id, item.mediaType, 'favorite');
      else await addSavedMedia(item, 'favorite');
    } catch (err) {
      set((state) => {
        const favorites = { ...state.favorites };
        if (wasSaved) favorites[key] = { ...item, savedAt: new Date().toISOString() };
        else delete favorites[key];
        return { favorites };
      });
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },

  watchlist: {},
  isWatchlistLoading: false,
  watchlistError: null,
  fetchWatchlist: async () => {
    set({ isWatchlistLoading: true, watchlistError: null });
    try {
      const items = await fetchSavedMedia('watchlist');
      set({
        watchlist: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        isWatchlistLoading: false,
      });
    } catch (err) {
      set({
        watchlistError: err instanceof Error ? err.message : 'Failed to load watchlist.',
        isWatchlistLoading: false,
      });
    }
  },
  isInWatchlist: (mediaType, id) => Boolean(get().watchlist[keyOf(mediaType, id)]),
  toggleWatchlist: async (item, options) => {
    const key = keyOf(item.mediaType, item.id);
    const wasSaved = Boolean(get().watchlist[key]);

    set((state) => {
      const watchlist = { ...state.watchlist };
      if (wasSaved) delete watchlist[key];
      else watchlist[key] = { ...item, savedAt: new Date().toISOString() };
      return { watchlist };
    });
    if (!options?.silent) {
      useToastStore
        .getState()
        .show(
          wasSaved
            ? i18n.t('toasts.removedFromWatchlist', { title: item.title })
            : i18n.t('toasts.addedToWatchlist', { title: item.title }),
          wasSaved ? 'bookmark-border' : 'bookmark',
        );
    }

    try {
      if (wasSaved) await removeSavedMedia(item.id, item.mediaType, 'watchlist');
      else await addSavedMedia(item, 'watchlist');
    } catch (err) {
      set((state) => {
        const watchlist = { ...state.watchlist };
        if (wasSaved) watchlist[key] = { ...item, savedAt: new Date().toISOString() };
        else delete watchlist[key];
        return { watchlist };
      });
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },

  reset: () =>
    set({
      favorites: {},
      watchlist: {},
      favoritesError: null,
      watchlistError: null,
    }),
}));
