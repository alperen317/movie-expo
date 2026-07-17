-- 0003 pointed list_items.added_by at auth.users directly, same issue 0004
-- fixed for list_members: PostgREST only embeds a related table across a
-- real FK edge in its schema graph, so a client select like
-- `adder:profiles!list_items_added_by_fkey(display_name, email)` (needed to
-- show "who added this" in the shared-list UI) has no edge to resolve and
-- 400s with "could not find a relationship between list_items and
-- profiles". Repoint the FK at public.profiles(id), which mirrors
-- auth.users 1:1 (see 0002's trigger + backfill), so no data loss results.
-- The constraint name is unchanged (Postgres names it after the local
-- table+column, not the target), so no application code needs to change
-- beyond adding the embed itself.
alter table public.list_items
  drop constraint if exists list_items_added_by_fkey,
  add constraint list_items_added_by_fkey
    foreign key (added_by) references public.profiles (id) on delete cascade;
