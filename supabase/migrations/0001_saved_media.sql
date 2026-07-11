-- Favorites & Watchlist storage: one row per user per saved title.
create table if not exists public.saved_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_type text not null check (list_type in ('favorite', 'watchlist')),
  media_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  vote_average numeric,
  year text,
  genre text,
  created_at timestamptz not null default now(),
  unique (user_id, list_type, media_id, media_type)
);

create index if not exists saved_media_user_list_idx
  on public.saved_media (user_id, list_type, created_at desc);

alter table public.saved_media enable row level security;

create policy "Users can view their own saved media"
  on public.saved_media for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved media"
  on public.saved_media for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved media"
  on public.saved_media for delete
  using (auth.uid() = user_id);
