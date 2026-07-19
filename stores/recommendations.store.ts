import { create } from 'zustand';

import { toMovieCardItem, toTVCardItem, type MediaCardItem } from '../components/home/MovieCard';
import {
  aggregateFriendsWatched,
  type FriendsWatchedItem,
} from '../lib/recommendations/friendsWatched';
import { buildPersonAffinities, type PersonSignal } from '../lib/recommendations/personSignal';
import { rankCandidates } from '../lib/recommendations/score';
import { addDismissed, fetchDismissedKeys } from '../lib/supabase/recommendationFeedback';
import { buildTasteProfile, type TasteSignal } from '../lib/recommendations/tasteProfile';
import { getGenreIdByName, normalizeGenreName } from '../lib/tmdb/genres';
import { getMediaMetadata } from '../lib/tmdb/mediaMetadataCache';
import {
  discoverMoviesByDecade,
  discoverMoviesByGenre,
  discoverMoviesByPerson,
} from '../lib/tmdb/movies';
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

export interface PersonRow {
  personId: number;
  personName: string;
  items: MediaCardItem[];
}

// How many of the user's highest-rated titles get their credits pulled (via
// the metadata cache, so repeat visits cost zero TMDB requests).
const PERSON_SAMPLE_SIZE = 20;

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
  personRow: PersonRow | null;
  isPersonalizedLoading: boolean;
  fetchPersonalized: () => Promise<void>;

  /** `${mediaType}-${id}` keys the user marked "not interested". */
  dismissedKeys: Set<string>;
  dismiss: (item: MediaCardItem) => void;

  reset: () => void;
}

function withoutKey<T extends MediaCardItem>(items: T[], key: string): T[] {
  return items.filter((item) => `${item.mediaType}-${item.id}` !== key);
}

// Credits for the user's favorite titles come from the metadata cache; a
// missing/failed lookup just drops that title from the person sample.
async function collectPersonSignals(
  entries: { mediaType: 'movie' | 'tv'; id: number; rating: number | null }[],
): Promise<PersonSignal[]> {
  const seen = new Set<string>();
  const sample = entries
    .filter((entry) => {
      const key = `${entry.mediaType}-${entry.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, PERSON_SAMPLE_SIZE);

  const results = await Promise.allSettled(
    sample.map(async (entry) => {
      const metadata = await getMediaMetadata(entry.mediaType, entry.id);
      return {
        rating: entry.rating,
        topCast: metadata.topCast ?? [],
        director: metadata.director ?? null,
      };
    }),
  );
  return results
    .filter((result): result is PromiseFulfilledResult<PersonSignal> => {
      return result.status === 'fulfilled';
    })
    .map((result) => result.value);
}

export const useRecommendationsStore = create<RecommendationsState>((set, get) => ({
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
      const dismissedKeys = await fetchDismissedKeys().catch(() => get().dismissedKeys);
      // The aggregate helper's exclusion set covers "never show this" keys,
      // so dismissed titles ride along with the user's own watches.
      const watchedByMe = new Set([
        ...useWatchLogStore.getState().entries.map((entry) => `${entry.mediaType}-${entry.id}`),
        ...dismissedKeys,
      ]);

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
        dismissedKeys,
        isFriendsLoading: false,
      });
    } catch {
      set({ isFriendsLoading: false });
    }
  },

  forYou: [],
  genreRows: [],
  decadeRow: null,
  personRow: null,
  isPersonalizedLoading: false,
  // Builds the taste profile from the watch log, pulls candidate pools from
  // TMDB discover for the strongest genres (and a retro decade when one
  // dominates), then scores everything client-side. Watched and watchlisted
  // titles never surface. Fails silently -- personalized rows are additive.
  fetchPersonalized: async () => {
    set({ isPersonalizedLoading: true });
    try {
      const [, , dismissedKeys] = await Promise.all([
        useWatchLogStore.getState().fetchWatchLog(),
        useListsStore.getState().fetchWatchlist(),
        fetchDismissedKeys().catch(() => get().dismissedKeys),
      ]);
      set({ dismissedKeys });
      const entries = useWatchLogStore.getState().entries;
      if (entries.length < MIN_SIGNALS) {
        set({
          forYou: [],
          genreRows: [],
          decadeRow: null,
          personRow: null,
          isPersonalizedLoading: false,
        });
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
        ...dismissedKeys,
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

      // Favorite-person rail: derive person affinities from the credits of the
      // user's highest-rated titles, then pull that person's filmography.
      const personSignals = await collectPersonSignals(entries);
      const topPerson = buildPersonAffinities(personSignals)[0] ?? null;
      const personPool = topPerson
        ? (await discoverMoviesByPerson(topPerson.id)).results.map(toMovieCardItem)
        : [];

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

      // The person pool is already tightly themed, so rank it purely for
      // exclusions/diversity; genre affinity ordering still applies within it.
      const personItems = topPerson
        ? rankCandidates(personPool, profile, { excludeKeys, limit: 12 })
        : [];
      const personRow: PersonRow | null =
        topPerson && personItems.length > 0
          ? { personId: topPerson.id, personName: topPerson.name, items: personItems }
          : null;

      const combinedPool = [
        ...genrePools.flatMap(({ pool }) => pool),
        ...decadePool,
        ...personPool,
      ];
      const forYou = rankCandidates(combinedPool, profile, { excludeKeys, limit: 20 });

      set({
        forYou,
        genreRows,
        decadeRow: decadeRow && decadeRow.items.length > 0 ? decadeRow : null,
        personRow,
        isPersonalizedLoading: false,
      });
    } catch {
      set({ isPersonalizedLoading: false });
    }
  },

  dismissedKeys: new Set<string>(),
  // Optimistic: the title disappears from every rail immediately; the server
  // write happens in the background and is tolerated to fail (the key stays
  // excluded for this session either way).
  dismiss: (item) => {
    const key = `${item.mediaType}-${item.id}`;
    set((state) => ({
      dismissedKeys: new Set([...state.dismissedKeys, key]),
      forYou: withoutKey(state.forYou, key),
      friendsWatched: withoutKey(state.friendsWatched, key),
      genreRows: state.genreRows
        .map((row) => ({ ...row, items: withoutKey(row.items, key) }))
        .filter((row) => row.items.length > 0),
      decadeRow:
        state.decadeRow === null
          ? null
          : (() => {
              const items = withoutKey(state.decadeRow.items, key);
              return items.length > 0 ? { ...state.decadeRow, items } : null;
            })(),
      personRow:
        state.personRow === null
          ? null
          : (() => {
              const items = withoutKey(state.personRow.items, key);
              return items.length > 0 ? { ...state.personRow, items } : null;
            })(),
    }));
    addDismissed(item.mediaType, item.id).catch(() => {});
  },

  reset: () =>
    set({
      friendsWatched: [],
      isFriendsLoading: false,
      forYou: [],
      genreRows: [],
      decadeRow: null,
      personRow: null,
      dismissedKeys: new Set<string>(),
      isPersonalizedLoading: false,
    }),
}));
