import { parseLetterboxdExport } from './letterboxd';

// watched.csv content below is taken as-is from a real Letterboxd export.
// diary.csv/ratings.csv/watchlist.csv rows are synthetic (that user's export
// had those files empty) but follow Letterboxd's documented column layout.
const WATCHED_CSV = [
  'Date,Name,Year,Letterboxd URI',
  '2026-07-14,Project Hail Mary,2026,https://boxd.it/pEeQ',
  '2026-07-14,Obsession,2025,https://boxd.it/PNqo',
].join('\n');

const RATINGS_CSV = [
  'Date,Name,Year,Letterboxd URI,Rating',
  '2026-07-14,Project Hail Mary,2026,https://boxd.it/pEeQ,4.5',
].join('\n');

const DIARY_CSV = [
  'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date',
  '2026-07-10,Titanic,1998,https://boxd.it/abcd,5,,,2026-07-09',
].join('\n');

const WATCHLIST_CSV = [
  'Date,Name,Year,Letterboxd URI',
  '2026-07-01,Moana,2026,https://boxd.it/efgh',
].join('\n');

describe('parseLetterboxdExport', () => {
  it('falls back to watched.csv joined with ratings.csv when diary.csv is empty', () => {
    const files = {
      'diary.csv': 'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date',
      'watched.csv': WATCHED_CSV,
      'ratings.csv': RATINGS_CSV,
    };
    const records = parseLetterboxdExport(files);

    expect(records).toEqual([
      {
        source: 'letterboxd',
        mediaType: 'movie',
        title: 'Project Hail Mary',
        year: '2026',
        listType: 'watched',
        watchedAt: new Date('2026-07-14T12:00:00Z'),
        rating: 9,
      },
      {
        source: 'letterboxd',
        mediaType: 'movie',
        title: 'Obsession',
        year: '2025',
        listType: 'watched',
        watchedAt: new Date('2026-07-14T12:00:00Z'),
        rating: null,
      },
    ]);
  });

  it('prefers diary.csv over watched.csv when diary has rows, using Watched Date', () => {
    const files = {
      'diary.csv': DIARY_CSV,
      'watched.csv': WATCHED_CSV,
    };
    const records = parseLetterboxdExport(files);

    expect(records).toEqual([
      {
        source: 'letterboxd',
        mediaType: 'movie',
        title: 'Titanic',
        year: '1998',
        listType: 'watched',
        watchedAt: new Date('2026-07-09T12:00:00Z'),
        rating: 10,
      },
    ]);
  });

  it('imports watchlist.csv rows as watchlist entries', () => {
    const records = parseLetterboxdExport({ 'watchlist.csv': WATCHLIST_CSV });

    expect(records).toEqual([
      {
        source: 'letterboxd',
        mediaType: 'movie',
        title: 'Moana',
        year: '2026',
        listType: 'watchlist',
        watchedAt: null,
        rating: null,
      },
    ]);
  });

  it('returns an empty array when no known file is present', () => {
    expect(parseLetterboxdExport({})).toEqual([]);
  });
});
