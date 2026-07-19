import { aggregateFriendsWatched, ListWatchData } from './friendsWatched';

import type { MediaCardItem } from '../../components/home/MovieCard';

function item(id: number, overrides: Partial<MediaCardItem> = {}): MediaCardItem {
  return {
    id,
    title: `Title ${id}`,
    year: '2020',
    posterPath: null,
    voteAverage: 7,
    genres: ['Drama'],
    mediaType: 'movie',
    ...overrides,
  };
}

describe('aggregateFriendsWatched', () => {
  it('returns empty for no lists', () => {
    expect(aggregateFriendsWatched([], new Set())).toEqual([]);
  });

  it('keeps only items at least one friend watched', () => {
    const lists: ListWatchData[] = [{ items: [item(1), item(2)], watchSummary: { 'movie-1': 2 } }];
    const result = aggregateFriendsWatched(lists, new Set());
    expect(result.map((entry) => entry.id)).toEqual([1]);
    expect(result[0].friendCount).toBe(2);
  });

  it('excludes titles the user already watched', () => {
    const lists: ListWatchData[] = [
      { items: [item(1), item(2)], watchSummary: { 'movie-1': 3, 'movie-2': 1 } },
    ];
    const result = aggregateFriendsWatched(lists, new Set(['movie-1']));
    expect(result.map((entry) => entry.id)).toEqual([2]);
  });

  it('dedupes across lists keeping the highest count', () => {
    const lists: ListWatchData[] = [
      { items: [item(1)], watchSummary: { 'movie-1': 1 } },
      { items: [item(1)], watchSummary: { 'movie-1': 4 } },
    ];
    const result = aggregateFriendsWatched(lists, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].friendCount).toBe(4);
  });

  it('treats same id with different media types as distinct titles', () => {
    const lists: ListWatchData[] = [
      {
        items: [item(1), item(1, { mediaType: 'tv' })],
        watchSummary: { 'movie-1': 1, 'tv-1': 2 },
      },
    ];
    const result = aggregateFriendsWatched(lists, new Set());
    expect(result.map((entry) => `${entry.mediaType}-${entry.id}`)).toEqual(['tv-1', 'movie-1']);
  });

  it('sorts by friend count, then vote average, and applies the limit', () => {
    const lists: ListWatchData[] = [
      {
        items: [item(1, { voteAverage: 5 }), item(2, { voteAverage: 9 }), item(3)],
        watchSummary: { 'movie-1': 1, 'movie-2': 1, 'movie-3': 2 },
      },
    ];
    const result = aggregateFriendsWatched(lists, new Set(), 2);
    expect(result.map((entry) => entry.id)).toEqual([3, 2]);
  });
});
