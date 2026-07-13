-- Episode-level watch progress: one row per (user, show, season, episode).
-- Batch "mark up to here" is a multi-row upsert against this table.
create table if not exists public.episode_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  watched_at timestamptz not null default now(),
  primary key (user_id, show_id, season_number, episode_number)
);

create index if not exists episode_progress_user_show_idx
  on public.episode_progress (user_id, show_id);

alter table public.episode_progress enable row level security;

create policy "Users can view their own episode progress"
  on public.episode_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own episode progress"
  on public.episode_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own episode progress"
  on public.episode_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete their own episode progress"
  on public.episode_progress for delete
  using (auth.uid() = user_id);
