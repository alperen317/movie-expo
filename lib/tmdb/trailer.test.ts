import {
  getTrailerCandidates,
  MAX_EMBED_ATTEMPTS,
  nextTrailerAction,
  youtubeWatchUrl,
} from './trailer';

import type { TMDBVideo, TMDBVideos } from './types';

function video(overrides: Partial<TMDBVideo> = {}): TMDBVideo {
  return { key: 'k', site: 'YouTube', type: 'Trailer', official: true, ...overrides };
}

function videos(results: TMDBVideo[]): TMDBVideos {
  return { results };
}

describe('getTrailerCandidates', () => {
  it('returns an empty list when there are no videos at all', () => {
    expect(getTrailerCandidates(undefined)).toEqual([]);
    expect(getTrailerCandidates(videos([]))).toEqual([]);
  });

  it('drops clips hosted anywhere other than YouTube', () => {
    expect(
      getTrailerCandidates(videos([video({ key: 'vimeo', site: 'Vimeo' }), video({ key: 'yt' })])),
    ).toEqual(['yt']);
  });

  it('ranks official trailers, then unofficial trailers, then teasers', () => {
    expect(
      getTrailerCandidates(
        videos([
          video({ key: 'teaser', type: 'Teaser' }),
          video({ key: 'unofficial', official: false }),
          video({ key: 'official' }),
        ]),
      ),
    ).toEqual(['official', 'unofficial', 'teaser']);
  });

  it('ignores clip types that are not a trailer or teaser', () => {
    expect(
      getTrailerCandidates(
        videos([video({ key: 'featurette', type: 'Featurette' }), video({ key: 'trailer' })]),
      ),
    ).toEqual(['trailer']);
  });

  it('dedupes a key that TMDB lists more than once', () => {
    expect(
      getTrailerCandidates(
        videos([video({ key: 'same' }), video({ key: 'same', type: 'Teaser' })]),
      ),
    ).toEqual(['same']);
  });
});

describe('nextTrailerAction', () => {
  it('advances to the next candidate', () => {
    expect(nextTrailerAction(['a', 'b', 'c'], 0)).toEqual({ type: 'retry', index: 1 });
  });

  // Regression: a title with many clips used to burn a load-and-fail cycle on
  // every one of them (7 observed) before handing off, because 15x errors reject
  // the embedding context rather than the individual video.
  it('stops retrying after MAX_EMBED_ATTEMPTS even with candidates left', () => {
    expect(MAX_EMBED_ATTEMPTS).toBe(2);
    expect(nextTrailerAction(['a', 'b', 'c', 'd', 'e'], 1)).toEqual({ type: 'external', key: 'a' });
  });

  // The last candidate failing means embedding is not the fixable part any
  // more, so hand off to YouTube itself.
  it('falls back to the first candidate externally once retries are exhausted', () => {
    expect(nextTrailerAction(['a', 'b'], 1)).toEqual({ type: 'external', key: 'a' });
    expect(nextTrailerAction(['only'], 0)).toEqual({ type: 'external', key: 'only' });
  });

  it('gives up when there was never a candidate', () => {
    expect(nextTrailerAction([], 0)).toEqual({ type: 'give-up' });
  });
});

describe('youtubeWatchUrl', () => {
  it('builds a watch URL, which has no embedding restrictions', () => {
    expect(youtubeWatchUrl('abc123')).toBe('https://www.youtube.com/watch?v=abc123');
  });
});
