import { decadeOf, type TasteProfile } from './tasteProfile';

import type { MediaCardItem } from '../../components/home/MovieCard';

export interface RankedCandidate extends MediaCardItem {
  score: number;
}

export interface RankOptions {
  /** `${mediaType}-${id}` keys to drop (already watched / watchlisted). */
  excludeKeys?: ReadonlySet<string>;
  /** Diversity cap: max results sharing the same primary genre. */
  maxPerGenre?: number;
  limit?: number;
}

// Scores a candidate pool against the taste profile. Genre affinity dominates
// (normalized so the strongest genre contributes 1.0 and disliked genres
// subtract), a matching favorite decade adds a nudge, and TMDB rating breaks
// ties. Exclusions and dedupe happen before scoring; the per-genre cap keeps
// one dominant genre from filling the whole row.
export function rankCandidates(
  candidates: MediaCardItem[],
  profile: TasteProfile,
  options: RankOptions = {},
): RankedCandidate[] {
  const { excludeKeys, maxPerGenre = 4, limit = 20 } = options;

  const maxGenreWeight = Math.max(
    1,
    ...Object.values(profile.genreWeights).map((weight) => Math.abs(weight)),
  );

  const seen = new Set<string>();
  const scored: RankedCandidate[] = [];
  for (const item of candidates) {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key) || excludeKeys?.has(key)) continue;
    seen.add(key);

    let genreScore = 0;
    for (const genre of item.genres) {
      genreScore += (profile.genreWeights[genre] ?? 0) / maxGenreWeight;
    }
    const decade = decadeOf(item.year);
    const decadeBonus = decade !== null && decade === profile.topDecade ? 0.5 : 0;
    const ratingTiebreak = item.voteAverage / 20;

    scored.push({ ...item, score: genreScore + decadeBonus + ratingTiebreak });
  }

  scored.sort((a, b) => b.score - a.score);

  const perGenreCount: Record<string, number> = {};
  const result: RankedCandidate[] = [];
  for (const item of scored) {
    const primaryGenre = item.genres[0];
    if (primaryGenre) {
      perGenreCount[primaryGenre] = (perGenreCount[primaryGenre] ?? 0) + 1;
      if (perGenreCount[primaryGenre] > maxPerGenre) continue;
    }
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}
