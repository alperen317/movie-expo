-- Watch log: one row per watch event (rewatches allowed, unlike saved_media).
create table if not exists public.watch_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  vote_average numeric,
  year text,
  genre text,
  watched_at timestamptz not null default now(),
  rating smallint check (rating between 1 and 10),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists watch_log_user_watched_idx
  on public.watch_log (user_id, watched_at desc);

create index if not exists watch_log_user_media_idx
  on public.watch_log (user_id, media_type, media_id);

alter table public.watch_log enable row level security;

create policy "Users can view their own watch log"
  on public.watch_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watch log"
  on public.watch_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watch log"
  on public.watch_log for update
  using (auth.uid() = user_id);

create policy "Users can delete their own watch log"
  on public.watch_log for delete
  using (auth.uid() = user_id);
