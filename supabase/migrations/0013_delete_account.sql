-- Self-service account deletion (Apple 5.1.1(v) requirement): deleting the
-- auth.users row cascades through every app table (profiles, saved_media,
-- watch_log, episode_progress, lists.created_by, list_members/list_items),
-- since they all chain to `on delete cascade` back to auth.users. This
-- includes cascading away any shared list the user owns for its other
-- members too -- that's the existing schema's designed behavior (see
-- 0003_shared_lists.sql), not something new introduced here.
--
-- security definer + owned by the migration role (postgres) is what makes
-- `delete from auth.users` possible at all -- the `authenticated` role
-- itself has no privileges on the auth schema. This is the standard
-- community-documented self-service-deletion pattern for Supabase; if a
-- given project's role setup ever lacks this grant, the fallback is a
-- service_role Edge Function calling the Admin API's deleteUser instead.
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
