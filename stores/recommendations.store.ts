import { create } from 'zustand';

import {
  aggregateFriendsWatched,
  type FriendsWatchedItem,
} from '../lib/recommendations/friendsWatched';
import { fetchListItems, fetchListWatchSummary, fetchMyLists } from '../lib/supabase/sharedLists';
import { useWatchLogStore } from './watchLog.store';

interface RecommendationsState {
  friendsWatched: FriendsWatchedItem[];
  isFriendsLoading: boolean;
  fetchFriendsWatched: () => Promise<void>;
  reset: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>((set) => ({
  friendsWatched: [],
  isFriendsLoading: false,
  // Social row is optional content: any failure (no lists, RPC error, offline)
  // just leaves the row hidden.
  fetchFriendsWatched: async () => {
    set({ isFriendsLoading: true });
    try {
      // The user's own watch log gates what the row may suggest, so make sure
      // it's loaded before aggregating.
      await useWatchLogStore.getState().fetchWatchLog();
      const watchedByMe = new Set(
        useWatchLogStore.getState().entries.map((entry) => `${entry.mediaType}-${entry.id}`),
      );

      const lists = await fetchMyLists();
      const listData = await Promise.all(
        lists.map(async (list) => {
          const [items, watchSummary] = await Promise.all([
            fetchListItems(list.id),
            fetchListWatchSummary(list.id),
          ]);
          return { items, watchSummary };
        }),
      );

      set({
        friendsWatched: aggregateFriendsWatched(listData, watchedByMe),
        isFriendsLoading: false,
      });
    } catch {
      set({ isFriendsLoading: false });
    }
  },
  reset: () => set({ friendsWatched: [], isFriendsLoading: false }),
}));
