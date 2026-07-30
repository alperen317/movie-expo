import type { TMDBVideos } from './types';

/**
 * What the player should do after a clip fails to play.
 *
 * `retry` points at the next candidate; `external` hands off to the YouTube
 * app/site, which has no embedding restrictions at all.
 */
export type TrailerFallback =
  { type: 'retry'; index: number } | { type: 'external'; key: string } | { type: 'give-up' };

// Every YouTube clip worth trying, best first, rather than a single key.
// Embedding permission is per-video: the owner of the main trailer can disable
// it (IFrame API error 101/150) while a teaser on the same title plays fine, so
// the player needs somewhere to fall through to before leaving the app.
export function getTrailerCandidates(videos: TMDBVideos | undefined): string[] {
  const clips = (videos?.results ?? []).filter((video) => video.site === 'YouTube' && video.key);
  const ranked = [
    ...clips.filter((video) => video.type === 'Trailer' && video.official),
    ...clips.filter((video) => video.type === 'Trailer' && !video.official),
    ...clips.filter((video) => video.type === 'Teaser'),
  ];
  return [...new Set(ranked.map((video) => video.key))];
}

// Falls back to the *first* candidate rather than the one that just failed:
// that's the trailer the user actually asked for, and an embed-disabled video
// still plays normally on youtube.com.
export function nextTrailerAction(candidates: string[], failedIndex: number): TrailerFallback {
  if (failedIndex + 1 < candidates.length) return { type: 'retry', index: failedIndex + 1 };
  if (candidates.length > 0) return { type: 'external', key: candidates[0] };
  return { type: 'give-up' };
}

export function youtubeWatchUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}
