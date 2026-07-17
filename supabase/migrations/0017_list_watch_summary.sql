-- "How many of us have already seen this?" (docs/shared-lists-improvements.md
-- #4). watch_log RLS locks every user to their own rows (0006_watch_log.sql),
-- so reading co-members' watch history requires a SECURITY DEFINER function
-- like is_list_member/invite_to_list -- but this one only ever returns an
-- aggregate COUNT per item, never individual rows/ratings/notes, so a
-- member's personal watch history stays private from co-members.
create or replace function public.get_list_watch_summary(p_list_id uuid)
returns table (media_id integer, media_type text, watched_count integer)
language sql security definer set search_path = public stable as $$
  select li.media_id, li.media_type, count(distinct wl.user_id)::integer as watched_count
  from public.list_items li
  join public.list_members lm
    on lm.list_id = li.list_id and lm.status = 'accepted'
  join public.watch_log wl
    on wl.user_id = lm.user_id and wl.media_id = li.media_id and wl.media_type = li.media_type
  where li.list_id = p_list_id
    -- Access gate: if the caller isn't an accepted member of this list,
    -- this is false for every row and the function returns an empty set.
    and public.is_list_member(p_list_id, auth.uid())
  group by li.media_id, li.media_type;
$$;
revoke all on function public.get_list_watch_summary(uuid) from public;
grant execute on function public.get_list_watch_summary(uuid) to authenticated;
