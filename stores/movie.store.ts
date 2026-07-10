import { create } from 'zustand';

import { getTrendingMovies } from '../lib/tmdb/movies';
import { getPopularTVShows } from '../lib/tmdb/tv';
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
}));
