-- Previously only the first TMDB genre per item was stored (see
-- lib/tmdb/genres.ts's now-removed single-genre write path): a single
-- `genre text` column on each of these three tables, discarding every other
-- genre TMDB returned for that title. This backfills a `genres text[]`
-- column that keeps all of them, then drops the old column.
alter table public.list_items add column if not exists genres text[];
update public.list_items
  set genres = case when genre is not null then array[genre] else '{}'::text[] end
  where genres is null;
alter table public.list_items alter column genres set not null;
alter table public.list_items alter column genres set default '{}';
alter table public.list_items drop column if exists genre;

alter table public.saved_media add column if not exists genres text[];
update public.saved_media
  set genres = case when genre is not null then array[genre] else '{}'::text[] end
  where genres is null;
alter table public.saved_media alter column genres set not null;
alter table public.saved_media alter column genres set default '{}';
alter table public.saved_media drop column if exists genre;

alter table public.watch_log add column if not exists genres text[];
update public.watch_log
  set genres = case when genre is not null then array[genre] else '{}'::text[] end
  where genres is null;
alter table public.watch_log alter column genres set not null;
alter table public.watch_log alter column genres set default '{}';
alter table public.watch_log drop column if exists genre;
