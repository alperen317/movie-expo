import { getTopRatedMovies, getTrendingMovies, getUpcomingMovies } from '../lib/tmdb/movies';
import { getPopularTVShows, getTopRatedTVShows } from '../lib/tmdb/tv';
import { useMovieStore } from './movie.store';

import type { TMDBMovie, TMDBTVShow } from '../lib/tmdb/types';

jest.mock('../lib/tmdb/movies', () => ({
  getTrendingMovies: jest.fn(),
  getTopRatedMovies: jest.fn(),
  getUpcomingMovies: jest.fn(),
}));
jest.mock('../lib/tmdb/tv', () => ({
  getPopularTVShows: jest.fn(),
  getTopRatedTVShows: jest.fn(),
}));

const mockGetTrendingMovies = getTrendingMovies as jest.Mock;
const mockGetTopRatedMovies = getTopRatedMovies as jest.Mock;
const mockGetUpcomingMovies = getUpcomingMovies as jest.Mock;
const mockGetPopularTVShows = getPopularTVShows as jest.Mock;
const mockGetTopRatedTVShows = getTopRatedTVShows as jest.Mock;

const movie = { id: 1, title: 'Arrival' } as unknown as TMDBMovie;
const tvShow = { id: 2, name: 'Severance' } as unknown as TMDBTVShow;

describe('movie.store', () => {
  beforeEach(() => {
    useMovieStore.setState({
      trendingMovies: [],
      isLoading: false,
      error: null,
      popularTVShows: [],
      isTVLoading: false,
      tvError: null,
      topRatedMovies: [],
      upcomingMovies: [],
      topRatedTVShows: [],
      isDiscoverLoading: false,
    });
    jest.clearAllMocks();
  });

  describe('fetchTrendingMovies', () => {
    it('populates trendingMovies and clears isLoading on success', async () => {
      mockGetTrendingMovies.mockResolvedValue({ results: [movie] });

      await useMovieStore.getState().fetchTrendingMovies();

      expect(mockGetTrendingMovies).toHaveBeenCalledWith('day');
      expect(useMovieStore.getState().trendingMovies).toEqual([movie]);
      expect(useMovieStore.getState().isLoading).toBe(false);
      expect(useMovieStore.getState().error).toBeNull();
    });

    it('sets an error message and clears isLoading on failure', async () => {
      mockGetTrendingMovies.mockRejectedValue(new Error('network down'));

      await useMovieStore.getState().fetchTrendingMovies();

      expect(useMovieStore.getState().error).toBe('network down');
      expect(useMovieStore.getState().isLoading).toBe(false);
      expect(useMovieStore.getState().trendingMovies).toEqual([]);
    });
  });

  describe('fetchPopularTVShows', () => {
    it('populates popularTVShows and clears isTVLoading on success', async () => {
      mockGetPopularTVShows.mockResolvedValue({ results: [tvShow] });

      await useMovieStore.getState().fetchPopularTVShows();

      expect(useMovieStore.getState().popularTVShows).toEqual([tvShow]);
      expect(useMovieStore.getState().isTVLoading).toBe(false);
      expect(useMovieStore.getState().tvError).toBeNull();
    });

    it('sets tvError and clears isTVLoading on failure', async () => {
      mockGetPopularTVShows.mockRejectedValue(new Error('network down'));

      await useMovieStore.getState().fetchPopularTVShows();

      expect(useMovieStore.getState().tvError).toBe('network down');
      expect(useMovieStore.getState().isTVLoading).toBe(false);
    });
  });

  describe('fetchDiscoverRows', () => {
    it('populates all three discover rows together on success', async () => {
      mockGetTopRatedMovies.mockResolvedValue({ results: [movie] });
      mockGetUpcomingMovies.mockResolvedValue({ results: [movie] });
      mockGetTopRatedTVShows.mockResolvedValue({ results: [tvShow] });

      await useMovieStore.getState().fetchDiscoverRows();

      expect(useMovieStore.getState().topRatedMovies).toEqual([movie]);
      expect(useMovieStore.getState().upcomingMovies).toEqual([movie]);
      expect(useMovieStore.getState().topRatedTVShows).toEqual([tvShow]);
      expect(useMovieStore.getState().isDiscoverLoading).toBe(false);
    });

    it('fails silently, clearing isDiscoverLoading without setting any error field', async () => {
      mockGetTopRatedMovies.mockResolvedValue({ results: [movie] });
      mockGetUpcomingMovies.mockRejectedValue(new Error('network down'));
      mockGetTopRatedTVShows.mockResolvedValue({ results: [tvShow] });

      await useMovieStore.getState().fetchDiscoverRows();

      expect(useMovieStore.getState().isDiscoverLoading).toBe(false);
      expect(useMovieStore.getState().topRatedMovies).toEqual([]);
      expect(useMovieStore.getState().upcomingMovies).toEqual([]);
      expect(useMovieStore.getState().topRatedTVShows).toEqual([]);
    });
  });
});
