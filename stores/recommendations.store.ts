import { create } from 'zustand';

import { toMovieCardItem, toTVCardItem, type MediaCardItem } from '../components/home/MovieCard';
import {
  aggregateFriendsWatched,
  type FriendsWatchedItem,
} from '../lib/recommendations/friendsWatched';
import { rankCandidates } from '../lib/recommendations/score';
import { buildTasteProfile, type TasteSignal } from '../lib/recommendations/tasteProfile';
import { getGenreIdByName, normalizeGenreName } from '../lib/tmdb/genres';
import { discoverMoviesByDecade, discoverMoviesByGenre } from '../lib/tmdb/movies';
import { discoverTVShowsByGenre } from '../lib/tmdb/tv';
import { fetchListItems, fetchListWatchSummary, fetchMyLists } from '../lib/supabase/sharedLists';
import { useListsStore } from './lists.store';
import { useWatchLogStore } from './watchLog.store';

export interface GenreRow {
  /** Genre name in the active UI language, ready for the row title. */
  genre: string;
  /** TMDB movie genre id when the name maps to one; powers "view all". */
  movieGenreId: number | null;
  items: MediaCardItem[];
}

export interface DecadeRow {
  /** Decade start year, e.g. 1990. */
  decade: number;
  items: MediaCardItem[];
}

// Personalization needs at least a few watches before genre weights mean
// anything; below this the home screen sticks to the cold-start rows.
const MIN_SIGNALS = 3;

// "The 90s are your thing" is only an interesting claim for older decades --
// recent years dominate everyone's log, so a current-decade row would just
// mirror the trending rail.
const MAX_DECADE_FOR_ROW = 2009;

interface RecommendationsState {
  friendsWatched: FriendsWatchedItem[];
  isFriendsLoading: boolean;
  fetchFriendsWatched: () => Promise<void>;

  forYou: MediaCardItem[];
  genreRows: GenreRow[];
  decadeRow: DecadeRow | null;
  isPersonalizedLoading: boolean;
  fetchPersonalized: () => Promise<void>;

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

  forYou: [],
  genreRows: [],
  decadeRow: null,
  isPersonalizedLoading: false,
  // Builds the taste profile from the watch log, pulls candidate pools from
  // TMDB discover for the strongest genres (and a retro decade when one
  // dominates), then scores everything client-side. Watched and watchlisted
  // titles never surface. Fails silently -- personalized rows are additive.
  fetchPersonalized: async () => {
    set({ isPersonalizedLoading: true });
    try {
      await Promise.all([
        useWatchLogStore.getState().fetchWatchLog(),
        useListsStore.getState().fetchWatchlist(),
      ]);
      const entries = useWatchLogStore.getState().entries;
      if (entries.length < MIN_SIGNALS) {
        set({ forYou: [], genreRows: [], decadeRow: null, isPersonalizedLoading: false });
        return;
      }

      // Stored genre names may be in whichever language was active when the
      // row was logged; normalize them so they match freshly mapped candidates.
      const signals: TasteSignal[] = entries.map((entry) => ({
        genres: entry.genres.map(normalizeGenreName),
        rating: entry.rating,
        year: entry.year,
        mediaType: entry.mediaType,
      }));
      const profile = buildTasteProfile(signals);

      const excludeKeys = new Set<string>([
        ...entries.map((entry) => `${entry.mediaType}-${entry.id}`),
        ...Object.keys(useListsStore.getState().watchlist),
      ]);

      const topGenres = profile.topGenres.slice(0, 2);
      const genrePools = await Promise.all(
        topGenres.map(async (genre) => {
          const movieGenreId = getGenreIdByName(genre, 'movie');
          const tvGenreId = getGenreIdByName(genre, 'tv');
          const [movies, shows] = await Promise.all([
            movieGenreId !== null ? discoverMoviesByGenre(movieGenreId) : Promise.resolve(null),
            tvGenreId !== null ? discoverTVShowsByGenre(tvGenreId) : Promise.resolve(null),
          ]);
          const pool: MediaCardItem[] = [
            ...(movies?.results.map(toMovieCardItem) ?? []),
            ...(shows?.results.map(toTVCardItem) ?? []),
          ];
          return { genre, movieGenreId, pool };
        }),
      );

      const decade =
        profile.topDecade !== null && profile.topDecade <= MAX_DECADE_FOR_ROW
          ? profile.topDecade
          : null;
      const decadePool =
        decade !== null ? (await discoverMoviesByDecade(decade)).results.map(toMovieCardItem) : [];

      const genreRows: GenreRow[] = genrePools
        .map(({ genre, movieGenreId, pool }) => ({
          genre,
          movieGenreId,
          items: rankCandidates(pool, profile, { excludeKeys, limit: 12 }),
        }))
        .filter((row) => row.items.length > 0);

      const decadeRow: DecadeRow | null =
        decade !== null
          ? { decade, items: rankCandidates(decadePool, profile, { excludeKeys, limit: 12 }) }
          : null;

      const combinedPool = [...genrePools.flatMap(({ pool }) => pool), ...decadePool];
      const forYou = rankCandidates(combinedPool, profile, { excludeKeys, limit: 20 });

      set({
        forYou,
        genreRows,
        decadeRow: decadeRow && decadeRow.items.length > 0 ? decadeRow : null,
        isPersonalizedLoading: false,
      });
    } catch {
      set({ isPersonalizedLoading: false });
    }
  },

  reset: () =>
    set({
      friendsWatched: [],
      isFriendsLoading: false,
      forYou: [],
      genreRows: [],
      decadeRow: null,
      isPersonalizedLoading: false,
    }),
}));
