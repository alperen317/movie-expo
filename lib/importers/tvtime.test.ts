import { parseTVTimeExport } from './tvtime';

// Fixture rows below are trimmed from a real TV Time GDPR self-service export.
const TRACKING_HEADER =
  'watches,user_id,type-uuid-n,watch_count,entity_type,type,updated_at,created_at,rewatch_count,uuid,follow_date_range_key,release_date_range_key,alpha_range_key,release_date,total_movies_runtime,watch_date_range_key,runtime,movie_name,series_name,season_number,episode_number';

const WATCH_ROW =
  ',110332770,watch-050ea6f8-fb27-46d3-b78b-4da4b6b76783-0,,movie,watch,2026-07-13 12:17:38,2026-07-13 12:17:38,0,050ea6f8-fb27-46d3-b78b-4da4b6b76783,,watch-release-date-1998-01-16,watch-alpha-titanic,1998-01-16 00:00:00,,watch-date-1783945058,11640,Titanic,,,';

const TOWATCH_ROW =
  ',110332770,towatch-0275525d-9e8d-424b-9a8a-04e6ef7f6321,,movie,towatch,2026-07-13 12:17:38,2026-07-13 12:17:38,0,0275525d-9e8d-424b-9a8a-04e6ef7f6321,towatch-follow-date-1783945058,towatch-release-date-2026-07-17,towatch-alpha-the-odyssey,2026-07-17 00:00:00,,,,The Odyssey,,,';

const FOLLOW_ROW =
  ',110332770,follow-0275525d-9e8d-424b-9a8a-04e6ef7f6321-0,,movie,follow,2026-07-13 12:17:38,2026-07-13 12:17:38,0,0275525d-9e8d-424b-9a8a-04e6ef7f6321,follow-follow-date-1783945058,follow-release-date-2026-07-17,follow-alpha-the-odyssey,2026-07-17 00:00:00,,,,The Odyssey,,,';

const SUMMARY_ROW =
  '[5a432bdc-e493-410b-bee8-af93095c6fcf],110332770,count-watch-movie,17,,,,,,,,,,,,,,,,,';

const V2_HEADER =
  'ep_watch_count,total_series_runtime,user_id,updated_at,created_at,movie_watch_count,key,series_follow_count,total_movies_runtime,is_for_later,followed_at,is_followed,uuid,is_archived,s_id,movie_name,series_name,season_number,episode_number';

const FOLLOWED_SERIES_ROW =
  '0,,110332770,2026-07-13 12:17:38,2026-07-13 12:17:38,,user-series-2825659c-516d-4dab-99b8-b253b5a41b29,,,false,1783945058271875,true,2825659c-516d-4dab-99b8-b253b5a41b29,false,250487,,American Horror Story,,';

const TRACKING_STATS_ROW =
  '0,0,110332770,2026-07-13 12:17:38,2026-07-13 12:17:38,0,tracking-stats,7,0,,,,,,,,,,';

describe('parseTVTimeExport', () => {
  it('imports movie watch rows as watched, resolving the date from watch_date_range_key', () => {
    const files = {
      'tracking-prod-records.csv': [TRACKING_HEADER, WATCH_ROW].join('\n'),
    };
    const records = parseTVTimeExport(files);

    expect(records).toEqual([
      {
        source: 'tvtime',
        mediaType: 'movie',
        title: 'Titanic',
        year: '1998',
        listType: 'watched',
        watchedAt: new Date(1783945058 * 1000),
        rating: null,
      },
    ]);
  });

  it('imports movie towatch rows as watchlist entries with no watched date', () => {
    const files = {
      'tracking-prod-records.csv': [TRACKING_HEADER, TOWATCH_ROW].join('\n'),
    };
    const records = parseTVTimeExport(files);

    expect(records).toEqual([
      {
        source: 'tvtime',
        mediaType: 'movie',
        title: 'The Odyssey',
        year: '2026',
        listType: 'watchlist',
        watchedAt: null,
        rating: null,
      },
    ]);
  });

  it('skips follow rows and aggregate/summary rows', () => {
    const files = {
      'tracking-prod-records.csv': [TRACKING_HEADER, FOLLOW_ROW, SUMMARY_ROW].join('\n'),
    };
    expect(parseTVTimeExport(files)).toEqual([]);
  });

  it('imports followed series from the v2 file as tv watchlist entries', () => {
    const files = {
      'tracking-prod-records-v2.csv': [V2_HEADER, FOLLOWED_SERIES_ROW, TRACKING_STATS_ROW].join('\n'),
    };
    const records = parseTVTimeExport(files);

    expect(records).toEqual([
      {
        source: 'tvtime',
        mediaType: 'tv',
        title: 'American Horror Story',
        year: null,
        listType: 'watchlist',
        watchedAt: null,
        rating: null,
      },
    ]);
  });

  it('returns an empty array when neither known file is present', () => {
    expect(parseTVTimeExport({})).toEqual([]);
  });
});
