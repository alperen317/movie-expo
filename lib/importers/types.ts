export type ImportSource = 'tvtime' | 'letterboxd';
export type ImportListType = 'watched' | 'watchlist';

export interface ImportRecord {
  source: ImportSource;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  listType: ImportListType;
  // Only set when listType is 'watched'.
  watchedAt: Date | null;
  // 1-10 scale, matching watch_log.rating.
  rating: number | null;
}
