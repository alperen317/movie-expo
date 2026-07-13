export interface WatchedMovieInput {
  runtimeMinutes: number;
  genres: string[];
  watchedAt: string;
}

export interface WatchedEpisodeInput {
  showId: number;
  runtimeMinutes: number;
  genres: string[];
  watchedAt: string;
}

export interface StatsInput {
  movies: WatchedMovieInput[];
  episodes: WatchedEpisodeInput[];
}

export function filterInputByYear(input: StatsInput, year: number): StatsInput {
  const matchesYear = (watchedAt: string) => new Date(watchedAt).getFullYear() === year;
  return {
    movies: input.movies.filter((movie) => matchesYear(movie.watchedAt)),
    episodes: input.episodes.filter((episode) => matchesYear(episode.watchedAt)),
  };
}

export interface GenreCount {
  genre: string;
  count: number;
  pct: number;
}

export interface StatsSummary {
  totalMinutes: number;
  movieCount: number;
  episodeCount: number;
  showCount: number;
  lifeDays: number;
  lifeHours: number;
  topGenres: GenreCount[];
}

export function summarizeStats(input: StatsInput): StatsSummary {
  const movieMinutes = input.movies.reduce((sum, movie) => sum + movie.runtimeMinutes, 0);
  const episodeMinutes = input.episodes.reduce((sum, episode) => sum + episode.runtimeMinutes, 0);
  const totalMinutes = movieMinutes + episodeMinutes;

  const showIds = new Set(input.episodes.map((episode) => episode.showId));

  // Weight genre counts by distinct title (1 per movie, 1 per show) rather than
  // per episode, so a heavily-binged show doesn't dominate the breakdown.
  const genreCounts = new Map<string, number>();
  for (const movie of input.movies) {
    for (const genre of movie.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const seenShows = new Set<number>();
  for (const episode of input.episodes) {
    if (seenShows.has(episode.showId)) continue;
    seenShows.add(episode.showId);
    for (const genre of episode.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  const genreTotal = Array.from(genreCounts.values()).reduce((sum, count) => sum + count, 0);
  const topGenres = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({
      genre,
      count,
      pct: genreTotal > 0 ? (count / genreTotal) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    totalMinutes,
    movieCount: input.movies.length,
    episodeCount: input.episodes.length,
    showCount: showIds.size,
    lifeDays: totalMinutes / (60 * 24),
    lifeHours: totalMinutes / 60,
    topGenres,
  };
}

export interface MonthActivity {
  month: number;
  count: number;
}

export function monthlyActivity(input: StatsInput, year: number): MonthActivity[] {
  const counts = new Array(12).fill(0) as number[];

  for (const movie of input.movies) {
    const date = new Date(movie.watchedAt);
    if (date.getFullYear() === year) counts[date.getMonth()] += 1;
  }
  for (const episode of input.episodes) {
    const date = new Date(episode.watchedAt);
    if (date.getFullYear() === year) counts[date.getMonth()] += 1;
  }

  return counts.map((count, month) => ({ month, count }));
}
