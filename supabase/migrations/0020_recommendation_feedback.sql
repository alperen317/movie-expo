-- "Not interested" feedback for the recommendation engine
-- (docs/recommendation-engine-plan.md, "Kesişen İşler"): dismissed titles are
-- excluded from every personalized rail. Cascades on user deletion like the
-- other per-user tables, so delete_account (0013) needs no change.
create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  created_at timestamptz not null default now(),
  unique (user_id, media_type, media_id)
);

create index if not exists recommendation_feedback_user_idx
  on public.recommendation_feedback (user_id);

alter table public.recommendation_feedback enable row level security;

create policy "Users can view their own recommendation feedback"
  on public.recommendation_feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recommendation feedback"
  on public.recommendation_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own recommendation feedback"
  on public.recommendation_feedback for delete
  using (auth.uid() = user_id);
