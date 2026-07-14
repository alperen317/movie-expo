import { parseCSVRecords } from './csv';
import type { ImportRecord } from './types';

// TV Time's watch_date_range_key looks like "watch-date-1783945058" (unix
// seconds); fall back to updated_at ("2026-07-13 12:17:38", UTC, no offset)
// when that key is missing.
function parseWatchDate(row: Record<string, string>): Date | null {
  const match = row.watch_date_range_key?.match(/watch-date-(\d+)/);
  if (match) return new Date(Number(match[1]) * 1000);

  if (row.updated_at) {
    const parsed = new Date(`${row.updated_at.replace(' ', 'T')}Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

// Parses TV Time's GDPR self-service export. Handles:
// - tracking-prod-records.csv: type=watch/towatch + entity_type=movie rows
//   (follow/time-count/count-watch-* rows and non-movie entity types are
//   skipped - this export has no per-episode watch data, see import screen
//   and GELISTIRMEPLANI.md Faz 2 notes)
// - tracking-prod-records-v2.csv: is_followed=true series rows, imported as
//   watchlist entries since there's no episode/date data to log as "watched"
export function parseTVTimeExport(files: Record<string, string>): ImportRecord[] {
  const records: ImportRecord[] = [];

  const main = files['tracking-prod-records.csv'];
  if (main) {
    for (const row of parseCSVRecords(main)) {
      if (row.entity_type !== 'movie') continue;
      if (row.type !== 'watch' && row.type !== 'towatch') continue;

      records.push({
        source: 'tvtime',
        mediaType: 'movie',
        title: row.movie_name ?? '',
        year: row.release_date ? row.release_date.slice(0, 4) : null,
        listType: row.type === 'watch' ? 'watched' : 'watchlist',
        watchedAt: row.type === 'watch' ? parseWatchDate(row) : null,
        rating: null,
      });
    }
  }

  const followed = files['tracking-prod-records-v2.csv'];
  if (followed) {
    for (const row of parseCSVRecords(followed)) {
      if (row.is_followed !== 'true' || (row.series_name ?? '').trim().length === 0) continue;

      records.push({
        source: 'tvtime',
        mediaType: 'tv',
        title: row.series_name ?? '',
        year: null,
        listType: 'watchlist',
        watchedAt: null,
        rating: null,
      });
    }
  }

  return records.filter((record) => record.title.trim().length > 0);
}
