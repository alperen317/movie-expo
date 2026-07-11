-- 0003 pointed list_members.user_id / invited_by at auth.users directly.
-- PostgREST only embeds a related table across a real FK edge in its
-- schema graph, so `select=...,member:profiles!list_members_user_id_fkey(email)`
-- (used by fetchListMembers/fetchPendingInvites) had no edge to resolve
-- and every call 400'd with "could not find a relationship between
-- list_members and profiles". Repoint both FKs at public.profiles(id),
-- which mirrors auth.users 1:1 (see 0002's trigger + backfill), so no
-- data loss or ordering issue results. Constraint names are unchanged
-- (Postgres names them after the local table+column, not the target),
-- so no application code needs to change.
alter table public.list_members
  drop constraint if exists list_members_user_id_fkey,
  add constraint list_members_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.list_members
  drop constraint if exists list_members_invited_by_fkey,
  add constraint list_members_invited_by_fkey
    foreign key (invited_by) references public.profiles (id) on delete set null;
