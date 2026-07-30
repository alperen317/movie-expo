import type { TMDBVideos } from './types';

// Ranked best-first. Trailers are opened on youtube.com rather than embedded,
// so only the first entry is used today; the ranking is what picks it.
export function getTrailerCandidates(videos: TMDBVideos | undefined): string[] {
  const clips = (videos?.results ?? []).filter((video) => video.site === 'YouTube' && video.key);
  const ranked = [
    ...clips.filter((video) => video.type === 'Trailer' && video.official),
    ...clips.filter((video) => video.type === 'Trailer' && !video.official),
    ...clips.filter((video) => video.type === 'Teaser'),
  ];
  return [...new Set(ranked.map((video) => video.key))];
}

export function getBestTrailerKey(videos: TMDBVideos | undefined): string | null {
  return getTrailerCandidates(videos)[0] ?? null;
}

// The watch page, not /embed: embedding permission is set per video and many
// studios switch it off, which is why in-app playback was dropped.
export function youtubeWatchUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}
