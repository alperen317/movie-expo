import { create } from 'zustand';

import { getTopRatedMovies, getTrendingMovies, getUpcomingMovies } from '../lib/tmdb/movies';
import { getPopularTVShows, getTopRatedTVShows } from '../lib/tmdb/tv';
import type { TMDBMovie, TMDBTVShow } from '../lib/tmdb/types';

interface MovieState {
  trendingMovies: TMDBMovie[];
  isLoading: boolean;
  error: string | null;
  fetchTrendingMovies: () => Promise<void>;

  popularTVShows: TMDBTVShow[];
  isTVLoading: boolean;
  tvError: string | null;
  fetchPopularTVShows: () => Promise<void>;

  topRatedMovies: TMDBMovie[];
  upcomingMovies: TMDBMovie[];
  topRatedTVShows: TMDBTVShow[];
  isDiscoverLoading: boolean;
  fetchDiscoverRows: () => Promise<void>;
}

export const useMovieStore = create<MovieState>((set) => ({
  trendingMovies: [],
  isLoading: false,
  error: null,
  fetchTrendingMovies: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getTrendingMovies('day');
      set({ trendingMovies: data.results, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load trending movies.',
        isLoading: false,
      });
    }
  },

  popularTVShows: [],
  isTVLoading: false,
  tvError: null,
  fetchPopularTVShows: async () => {
    set({ isTVLoading: true, tvError: null });
    try {
      const data = await getPopularTVShows();
      set({ popularTVShows: data.results, isTVLoading: false });
    } catch (err) {
      set({
        tvError: err instanceof Error ? err.message : 'Failed to load popular TV shows.',
        isTVLoading: false,
      });
    }
  },

  topRatedMovies: [],
  upcomingMovies: [],
  topRatedTVShows: [],
  isDiscoverLoading: false,
  // Discovery rows are secondary content below the fold: they load together
  // and fail silently (the rest of the home screen still renders).
  fetchDiscoverRows: async () => {
    set({ isDiscoverLoading: true });
    try {
      const [topRated, upcoming, topRatedTV] = await Promise.all([
        getTopRatedMovies(),
        getUpcomingMovies(),
        getTopRatedTVShows(),
      ]);
      set({
        topRatedMovies: topRated.results,
        upcomingMovies: upcoming.results,
        topRatedTVShows: topRatedTV.results,
        isDiscoverLoading: false,
      });
    } catch {
      set({ isDiscoverLoading: false });
    }
  },
}));
