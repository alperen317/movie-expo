import { toMovieCardItem, toTVCardItem, type MediaCardItem } from '../../components/home/MovieCard';
import { searchMovies, searchTVShows } from '../tmdb/search';
import type { ImportRecord } from './types';

export type MatchConfidence = 'high' | 'low' | 'none';

export interface MatchResult {
  record: ImportRecord;
  candidate: MediaCardItem | null;
  confidence: MatchConfidence;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickBest<T>(
  record: ImportRecord,
  results: T[],
  getTitle: (item: T) => string,
  getDate: (item: T) => string,
  toCard: (item: T) => MediaCardItem,
): MatchResult {
  if (results.length === 0) return { record, candidate: null, confidence: 'none' };

  const normalizedTarget = normalizeTitle(record.title);
  const targetYear = record.year ? Number(record.year) : null;

  const exact = results.find((item) => {
    const date = getDate(item);
    const resultYear = date ? Number(date.slice(0, 4)) : null;
    const titleMatches = normalizeTitle(getTitle(item)) === normalizedTarget;
    const yearMatches =
      targetYear === null || resultYear === null || Math.abs(resultYear - targetYear) <= 1;
    return titleMatches && yearMatches;
  });

  const best = exact ?? results[0];
  return { record, candidate: toCard(best), confidence: exact ? 'high' : 'low' };
}

async function matchMovie(record: ImportRecord): Promise<MatchResult> {
  try {
    const response = await searchMovies(record.title, record.year);
    return pickBest(
      record,
      response.results,
      (item) => item.title,
      (item) => item.release_date,
      toMovieCardItem,
    );
  } catch {
    return { record, candidate: null, confidence: 'none' };
  }
}

async function matchTVShow(record: ImportRecord): Promise<MatchResult> {
  try {
    const response = await searchTVShows(record.title, record.year);
    return pickBest(
      record,
      response.results,
      (item) => item.name,
      (item) => item.first_air_date,
      toTVCardItem,
    );
  } catch {
    return { record, candidate: null, confidence: 'none' };
  }
}

// Matches import records against TMDB by title/year (no TVDB/TMDB ids are
// present in TV Time or Letterboxd exports). Runs a small worker pool so a
// few hundred titles resolve quickly without hammering the TMDB API.
export async function matchImportRecords(
  records: ImportRecord[],
  onProgress?: (done: number, total: number) => void,
): Promise<MatchResult[]> {
  const results: MatchResult[] = new Array(records.length);
  let nextIndex = 0;
  let completed = 0;
  const concurrency = Math.min(4, records.length) || 1;

  async function worker() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= records.length) return;

      const record = records[index];
      results[index] = record.mediaType === 'movie' ? await matchMovie(record) : await matchTVShow(record);

      completed += 1;
      onProgress?.(completed, records.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
