-- Simple upvote mechanic for shared-list items ("what should we watch
-- tonight?" -- docs/shared-lists-improvements.md #6): members toggle a
-- vote on any item; the UI shows a total count, no ranking/sort UI.

-- SECURITY DEFINER helper, same shape as is_list_member/is_list_owner
-- (0003_shared_lists.sql). Deliberately does NOT trust a client-supplied
-- list_id: list_item_votes has no list_id column of its own (see below),
-- so this resolves the item's REAL list through list_items and checks
-- membership against that -- a denormalized list_id column on the votes
-- table would let a member paste the id of a list they belong to
-- alongside a list_item_id that actually belongs to a DIFFERENT list,
-- bypassing the intent of the check.
create or replace function public.is_item_list_member(_list_item_id uuid, _user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.list_items li
    where li.id = _list_item_id and public.is_list_member(li.list_id, _user_id)
  );
$$;
revoke all on function public.is_item_list_member(uuid, uuid) from public;
grant execute on function public.is_item_list_member(uuid, uuid) to authenticated;

create table if not exists public.list_item_votes (
  id uuid primary key default gen_random_uuid(),
  list_item_id uuid not null references public.list_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_item_id, user_id)
);

create index if not exists list_item_votes_item_idx on public.list_item_votes (list_item_id);

alter table public.list_item_votes enable row level security;

-- Defense-in-depth, same rationale as 0005_replica_identity_full.sql: makes
-- Realtime DELETE payloads carry the full old row instead of just the
-- primary key. The client doesn't depend on this (it resolves DELETEs via
-- a local id -> {itemRowId, userId} map, same pattern as list_items), but
-- it's applied for consistency with the other tables in this feature.
alter table public.list_item_votes replica identity full;

-- Votes are visible to all members (who voted isn't hidden), same
-- "equal collaborators" stance as list_items' delete policy.
create policy "Members can view votes on items in their lists"
  on public.list_item_votes for select
  using (public.is_item_list_member(list_item_id, auth.uid()));

create policy "Members can cast their own vote"
  on public.list_item_votes for insert
  with check (user_id = auth.uid() and public.is_item_list_member(list_item_id, auth.uid()));

create policy "Members can remove their own vote"
  on public.list_item_votes for delete using (user_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_item_votes') then
    alter publication supabase_realtime add table public.list_item_votes;
  end if;
end $$;
