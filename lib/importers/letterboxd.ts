import { parseCSVRecords } from './csv';
import type { ImportRecord } from './types';

// Letterboxd ratings are 0.5-5.0 in half-star steps; watch_log.rating is
// 1-10 (2 points per star, same scale WatchLogSheet's star picker uses).
function toRating(value: string | undefined): number | null {
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return null;
  return Math.round(num * 2);
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Parses a Letterboxd export. diary.csv (per-log entries, rewatch-safe) is
// preferred when present; otherwise falls back to watched.csv joined with
// ratings.csv by title+year, since watched.csv alone has no rating column.
export function parseLetterboxdExport(files: Record<string, string>): ImportRecord[] {
  const records: ImportRecord[] = [];

  const diaryRows = files['diary.csv'] ? parseCSVRecords(files['diary.csv']) : [];

  if (diaryRows.length > 0) {
    for (const row of diaryRows) {
      records.push({
        source: 'letterboxd',
        mediaType: 'movie',
        title: row.Name,
        year: row.Year || null,
        listType: 'watched',
        watchedAt: toDate(row['Watched Date'] || row.Date),
        rating: toRating(row.Rating),
      });
    }
  } else if (files['watched.csv']) {
    const ratingsByKey = new Map<string, number>();
    if (files['ratings.csv']) {
      for (const row of parseCSVRecords(files['ratings.csv'])) {
        const rating = toRating(row.Rating);
        if (rating !== null) ratingsByKey.set(`${row.Name}-${row.Year}`, rating);
      }
    }

    for (const row of parseCSVRecords(files['watched.csv'])) {
      records.push({
        source: 'letterboxd',
        mediaType: 'movie',
        title: row.Name,
        year: row.Year || null,
        listType: 'watched',
        watchedAt: toDate(row.Date),
        rating: ratingsByKey.get(`${row.Name}-${row.Year}`) ?? null,
      });
    }
  }

  if (files['watchlist.csv']) {
    for (const row of parseCSVRecords(files['watchlist.csv'])) {
      records.push({
        source: 'letterboxd',
        mediaType: 'movie',
        title: row.Name,
        year: row.Year || null,
        listType: 'watchlist',
        watchedAt: null,
        rating: null,
      });
    }
  }

  return records.filter((record) => record.title.trim().length > 0);
}
