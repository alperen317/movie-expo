import { buildTasteProfile, decadeOf, signalWeight, TasteSignal } from './tasteProfile';

function signal(overrides: Partial<TasteSignal> = {}): TasteSignal {
  return { genres: ['Drama'], rating: null, year: '2020', mediaType: 'movie', ...overrides };
}

describe('signalWeight', () => {
  it('doubles loved titles, negates disliked ones, defaults to 1', () => {
    expect(signalWeight(null)).toBe(1);
    expect(signalWeight(10)).toBe(2);
    expect(signalWeight(8)).toBe(2);
    expect(signalWeight(7)).toBe(1);
    expect(signalWeight(5)).toBe(1);
    expect(signalWeight(4)).toBe(-1);
    expect(signalWeight(1)).toBe(-1);
  });
});

describe('decadeOf', () => {
  it('maps years to decades and rejects junk', () => {
    expect(decadeOf('1994')).toBe(1990);
    expect(decadeOf('2000')).toBe(2000);
    expect(decadeOf(null)).toBeNull();
    expect(decadeOf('')).toBeNull();
    expect(decadeOf('not-a-year')).toBeNull();
    expect(decadeOf('1200')).toBeNull();
  });
});

describe('buildTasteProfile', () => {
  it('returns a neutral profile for no signals', () => {
    const profile = buildTasteProfile([]);
    expect(profile.topGenres).toEqual([]);
    expect(profile.topDecade).toBeNull();
    expect(profile.movieShare).toBe(0.5);
    expect(profile.sampleSize).toBe(0);
  });

  it('weights genres by rating and sorts topGenres by weight', () => {
    const profile = buildTasteProfile([
      signal({ genres: ['Drama'], rating: 9 }),
      signal({ genres: ['Comedy'], rating: null }),
      signal({ genres: ['Horror'], rating: 2 }),
    ]);
    expect(profile.genreWeights).toEqual({ Drama: 2, Comedy: 1, Horror: -1 });
    expect(profile.topGenres).toEqual(['Drama', 'Comedy']);
  });

  it('accumulates weight across multiple watches of the same genre', () => {
    const profile = buildTasteProfile([
      signal({ genres: ['Comedy'] }),
      signal({ genres: ['Comedy'] }),
      signal({ genres: ['Drama'], rating: 8 }),
    ]);
    expect(profile.topGenres[0]).toBe('Comedy');
  });

  it('picks the dominant decade from positive weight only', () => {
    const profile = buildTasteProfile([
      signal({ year: '1994', rating: 9 }),
      signal({ year: '1998' }),
      signal({ year: '2021', rating: 3 }),
    ]);
    expect(profile.topDecade).toBe(1990);
  });

  it('computes the movie share of signals', () => {
    const profile = buildTasteProfile([
      signal(),
      signal({ mediaType: 'tv' }),
      signal({ mediaType: 'tv' }),
      signal({ mediaType: 'tv' }),
    ]);
    expect(profile.movieShare).toBe(0.25);
    expect(profile.sampleSize).toBe(4);
  });
});
