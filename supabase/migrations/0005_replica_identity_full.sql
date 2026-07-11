-- Realtime DELETE bug fix
-- ---------------------------------------------------------------------------
-- Symptom: on a shared list, adding an item is reflected in realtime to other
-- members, but removing an item is not.
--
-- Root cause: Postgres tables default to REPLICA IDENTITY DEFAULT, which means
-- a DELETE only writes the PRIMARY KEY to the WAL. Supabase Realtime therefore
-- delivers DELETE change events whose `old` record contains ONLY the primary
-- key column(s). The client's list_items DELETE handler
-- (sharedLists.store.ts -> onItemsChange) needs `payload.old.media_id` and
-- `payload.old.media_type` to locate the item to remove; with the default
-- replica identity those columns are absent, so the handler bails out early
-- and the removal is never applied on other clients.
--
-- INSERT/UPDATE events are unaffected because `payload.new` always carries the
-- full row, which is why "add" worked while "remove" did not.
--
-- Fix: REPLICA IDENTITY FULL makes Postgres write the entire row to the WAL on
-- DELETE, so Supabase Realtime includes every column in `payload.old`. Applied
-- to all tables in the supabase_realtime publication for consistency.

alter table if exists public.list_items replica identity full;
alter table if exists public.list_members replica identity full;
alter table if exists public.lists replica identity full;