import { getBestTrailerKey, getTrailerCandidates, youtubeWatchUrl } from './trailer';

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

describe('getBestTrailerKey', () => {
  it('picks the highest-ranked candidate', () => {
    expect(
      getBestTrailerKey(
        videos([video({ key: 'teaser', type: 'Teaser' }), video({ key: 'official' })]),
      ),
    ).toBe('official');
  });

  it('is null when nothing is playable', () => {
    expect(getBestTrailerKey(undefined)).toBeNull();
    expect(getBestTrailerKey(videos([video({ key: 'vimeo', site: 'Vimeo' })]))).toBeNull();
  });
});

describe('youtubeWatchUrl', () => {
  it('builds a watch URL, which has no embedding restrictions', () => {
    expect(youtubeWatchUrl('abc123')).toBe('https://www.youtube.com/watch?v=abc123');
  });
});
