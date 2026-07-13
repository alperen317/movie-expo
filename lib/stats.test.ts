import { filterInputByYear, monthlyActivity, StatsInput, summarizeStats } from './stats';

const emptyInput: StatsInput = { movies: [], episodes: [] };

describe('summarizeStats', () => {
  it('returns zeroed summary for empty input', () => {
    const summary = summarizeStats(emptyInput);
    expect(summary).toEqual({
      totalMinutes: 0,
      movieCount: 0,
      episodeCount: 0,
      showCount: 0,
      lifeDays: 0,
      lifeHours: 0,
      topGenres: [],
    });
  });

  it('sums movie and episode runtime into total minutes', () => {
    const input: StatsInput = {
      movies: [{ runtimeMinutes: 120, genres: ['Action'], watchedAt: '2026-01-01T00:00:00.000Z' }],
      episodes: [
        { showId: 1, runtimeMinutes: 40, genres: ['Drama'], watchedAt: '2026-01-02T00:00:00.000Z' },
        { showId: 1, runtimeMinutes: 40, genres: ['Drama'], watchedAt: '2026-01-03T00:00:00.000Z' },
      ],
    };
    const summary = summarizeStats(input);
    expect(summary.totalMinutes).toBe(200);
    expect(summary.movieCount).toBe(1);
    expect(summary.episodeCount).toBe(2);
    expect(summary.showCount).toBe(1);
    expect(summary.lifeHours).toBeCloseTo(200 / 60);
    expect(summary.lifeDays).toBeCloseTo(200 / (60 * 24));
  });

  it('weights genre counts by distinct title, not by episode count', () => {
    const input: StatsInput = {
      movies: [],
      episodes: [
        { showId: 1, runtimeMinutes: 30, genres: ['Comedy'], watchedAt: '2026-01-01T00:00:00.000Z' },
        { showId: 1, runtimeMinutes: 30, genres: ['Comedy'], watchedAt: '2026-01-02T00:00:00.000Z' },
        { showId: 1, runtimeMinutes: 30, genres: ['Comedy'], watchedAt: '2026-01-03T00:00:00.000Z' },
        { showId: 2, runtimeMinutes: 30, genres: ['Drama'], watchedAt: '2026-01-04T00:00:00.000Z' },
      ],
    };
    const summary = summarizeStats(input);
    const comedy = summary.topGenres.find((g) => g.genre === 'Comedy');
    const drama = summary.topGenres.find((g) => g.genre === 'Drama');
    expect(comedy?.count).toBe(1);
    expect(drama?.count).toBe(1);
  });

  it('counts one genre tag per genre for multi-genre movies and sorts by count desc', () => {
    const input: StatsInput = {
      movies: [
        { runtimeMinutes: 100, genres: ['Action', 'Comedy'], watchedAt: '2026-01-01T00:00:00.000Z' },
        { runtimeMinutes: 100, genres: ['Action'], watchedAt: '2026-01-02T00:00:00.000Z' },
      ],
      episodes: [],
    };
    const summary = summarizeStats(input);
    expect(summary.topGenres[0]).toMatchObject({ genre: 'Action', count: 2 });
    expect(summary.topGenres[1]).toMatchObject({ genre: 'Comedy', count: 1 });
    expect(summary.topGenres[0].pct).toBeCloseTo((2 / 3) * 100);
  });
});

describe('filterInputByYear', () => {
  const input: StatsInput = {
    movies: [
      { runtimeMinutes: 100, genres: ['Action'], watchedAt: '2025-06-01T00:00:00.000Z' },
      { runtimeMinutes: 120, genres: ['Drama'], watchedAt: '2026-06-01T00:00:00.000Z' },
    ],
    episodes: [
      { showId: 1, runtimeMinutes: 40, genres: ['Comedy'], watchedAt: '2025-12-31T00:00:00.000Z' },
      { showId: 2, runtimeMinutes: 40, genres: ['Comedy'], watchedAt: '2026-01-01T00:00:00.000Z' },
    ],
  };

  it('keeps only movies and episodes watched in the given year', () => {
    const filtered = filterInputByYear(input, 2026);
    expect(filtered.movies).toHaveLength(1);
    expect(filtered.movies[0].watchedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(filtered.episodes).toHaveLength(1);
    expect(filtered.episodes[0].showId).toBe(2);
  });

  it('returns empty arrays when no entries match the year', () => {
    const filtered = filterInputByYear(input, 2099);
    expect(filtered.movies).toHaveLength(0);
    expect(filtered.episodes).toHaveLength(0);
  });
});

describe('monthlyActivity', () => {
  it('always returns 12 buckets even for empty input', () => {
    const activity = monthlyActivity(emptyInput, 2026);
    expect(activity).toHaveLength(12);
    expect(activity.every((entry) => entry.count === 0)).toBe(true);
    expect(activity.map((entry) => entry.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('buckets movies and episodes by watched month for the given year, ignoring other years', () => {
    const input: StatsInput = {
      movies: [
        { runtimeMinutes: 100, genres: [], watchedAt: '2026-02-15T00:00:00.000Z' },
        { runtimeMinutes: 100, genres: [], watchedAt: '2025-02-15T00:00:00.000Z' },
      ],
      episodes: [
        { showId: 1, runtimeMinutes: 40, genres: [], watchedAt: '2026-02-20T00:00:00.000Z' },
        { showId: 1, runtimeMinutes: 40, genres: [], watchedAt: '2026-03-01T00:00:00.000Z' },
      ],
    };
    const activity = monthlyActivity(input, 2026);
    expect(activity[1].count).toBe(2); // February: 1 movie + 1 episode
    expect(activity[2].count).toBe(1); // March: 1 episode
    expect(activity.reduce((sum, entry) => sum + entry.count, 0)).toBe(3);
  });
});
