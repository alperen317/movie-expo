import { rankCandidates } from './score';
import { buildTasteProfile, TasteProfile } from './tasteProfile';

import type { MediaCardItem } from '../../components/home/MovieCard';

function candidate(id: number, overrides: Partial<MediaCardItem> = {}): MediaCardItem {
  return {
    id,
    title: `Title ${id}`,
    year: '2020',
    posterPath: null,
    voteAverage: 6,
    genres: ['Drama'],
    mediaType: 'movie',
    ...overrides,
  };
}

const profile: TasteProfile = buildTasteProfile([
  { genres: ['Science Fiction'], rating: 9, year: '1994', mediaType: 'movie' },
  { genres: ['Science Fiction'], rating: 8, year: '1997', mediaType: 'movie' },
  { genres: ['Comedy'], rating: null, year: '2015', mediaType: 'movie' },
  { genres: ['Horror'], rating: 2, year: '2020', mediaType: 'movie' },
]);

describe('rankCandidates', () => {
  it('ranks matching genres above neutral and disliked ones', () => {
    const result = rankCandidates(
      [
        candidate(1, { genres: ['Horror'] }),
        candidate(2, { genres: ['Science Fiction'] }),
        candidate(3, { genres: ['Comedy'] }),
      ],
      profile,
    );
    expect(result.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('excludes watched/watchlisted keys and dedupes the pool', () => {
    const result = rankCandidates([candidate(1), candidate(1), candidate(2)], profile, {
      excludeKeys: new Set(['movie-2']),
    });
    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it('gives a bonus to the favorite decade', () => {
    const result = rankCandidates(
      [
        candidate(1, { genres: ['Science Fiction'], year: '2020' }),
        candidate(2, { genres: ['Science Fiction'], year: '1993' }),
      ],
      profile,
    );
    expect(result[0].id).toBe(2);
  });

  it('breaks ties with the TMDB rating', () => {
    const result = rankCandidates(
      [candidate(1, { voteAverage: 5 }), candidate(2, { voteAverage: 9 })],
      profile,
    );
    expect(result[0].id).toBe(2);
  });

  it('caps results per primary genre for diversity', () => {
    const pool = [1, 2, 3, 4, 5].map((id) => candidate(id, { genres: ['Science Fiction'] }));
    pool.push(candidate(6, { genres: ['Comedy'] }));
    const result = rankCandidates(pool, profile, { maxPerGenre: 2 });
    const sciFiCount = result.filter((item) => item.genres[0] === 'Science Fiction').length;
    expect(sciFiCount).toBe(2);
    expect(result.some((item) => item.id === 6)).toBe(true);
  });

  it('applies the limit after diversity filtering', () => {
    const pool = Array.from({ length: 30 }, (_, index) =>
      candidate(index + 1, { genres: [`Genre ${index}`] }),
    );
    const result = rankCandidates(pool, profile, { limit: 5 });
    expect(result).toHaveLength(5);
  });
});
