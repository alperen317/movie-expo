export interface TasteSignal {
  genres: string[];
  rating: number | null;
  year: string | null;
  mediaType: 'movie' | 'tv';
}

export interface TasteProfile {
  /** Signed weight per genre name; negative means the user rated it low. */
  genreWeights: Record<string, number>;
  /** Positive-weight genres, strongest first. */
  topGenres: string[];
  decadeWeights: Record<number, number>;
  topDecade: number | null;
  /** Share of movie (vs TV) signals, 0..1. */
  movieShare: number;
  sampleSize: number;
}

// A loved title counts double, an unrated watch counts once, and a low rating
// pushes its genres into negative territory so they get demoted at score time.
export function signalWeight(rating: number | null): number {
  if (rating === null) return 1;
  if (rating >= 8) return 2;
  if (rating <= 4) return -1;
  return 1;
}

export function decadeOf(year: string | null): number | null {
  const num = Number(year);
  if (!Number.isFinite(num) || num < 1900) return null;
  return Math.floor(num / 10) * 10;
}

// Rewatches appear as separate signals on purpose: watching something twice
// is itself a taste signal.
export function buildTasteProfile(signals: TasteSignal[]): TasteProfile {
  const genreWeights: Record<string, number> = {};
  const decadeWeights: Record<number, number> = {};
  let movieCount = 0;

  for (const signal of signals) {
    const weight = signalWeight(signal.rating);
    for (const genre of signal.genres) {
      genreWeights[genre] = (genreWeights[genre] ?? 0) + weight;
    }
    const decade = decadeOf(signal.year);
    if (decade !== null) {
      decadeWeights[decade] = (decadeWeights[decade] ?? 0) + weight;
    }
    if (signal.mediaType === 'movie') movieCount += 1;
  }

  const topGenres = Object.entries(genreWeights)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);

  const topDecadeEntry = Object.entries(decadeWeights)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    genreWeights,
    topGenres,
    decadeWeights,
    topDecade: topDecadeEntry ? Number(topDecadeEntry[0]) : null,
    movieShare: signals.length > 0 ? movieCount / signals.length : 0.5,
    sampleSize: signals.length,
  };
}
