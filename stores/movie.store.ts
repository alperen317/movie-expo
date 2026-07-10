import { create } from 'zustand';

import { getTrendingMovies } from '../lib/tmdb/movies';
import type { TMDBMovie } from '../lib/tmdb/types';

interface MovieState {
  trendingMovies: TMDBMovie[];
  isLoading: boolean;
  error: string | null;
  fetchTrendingMovies: () => Promise<void>;
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
}));
