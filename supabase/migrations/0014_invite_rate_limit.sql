-- Rate limit invite_to_list: the RPC's three distinct error codes
-- (user_not_found / cannot_invite_self / already_invited_or_member) let a
-- list owner enumerate registered emails by inviting arbitrary addresses to
-- a list they control and watching which response comes back. This doesn't
-- close the enumeration itself, but -- mirroring 0012's join_code_attempts
-- pattern -- it makes scanning a large address list impractical.

create table if not exists public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists invite_attempts_user_created_idx
  on public.invite_attempts (user_id, created_at);

-- No RLS policies on purpose: this table is only ever touched from inside
-- invite_to_list below (security definer), never queried directly by a
-- client, so there is no policy to write.
alter table public.invite_attempts enable row level security;

-- Re-declare 0003's invite_to_list with a rate-limit check prepended; the
-- lookup/insert body below is otherwise unchanged.
create or replace function public.invite_to_list(p_list_id uuid, p_email text)
returns public.list_members
language plpgsql security definer set search_path = public as $$
declare
  v_target uuid;
  v_row public.list_members;
  v_recent_attempts int;
begin
  delete from public.invite_attempts
    where user_id = auth.uid() and created_at < now() - interval '10 minutes';

  select count(*) into v_recent_attempts
    from public.invite_attempts where user_id = auth.uid();

  if v_recent_attempts >= 20 then
    raise exception 'rate_limited' using errcode = 'P0003';
  end if;

  insert into public.invite_attempts (user_id) values (auth.uid());

  if not public.is_list_member(p_list_id, auth.uid()) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  v_target := public.find_user_id_by_email(p_email);
  if v_target is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if v_target = auth.uid() then
    raise exception 'cannot_invite_self' using errcode = '22023';
  end if;

  insert into public.list_members (list_id, user_id, role, status, invited_by)
  values (p_list_id, v_target, 'member', 'pending', auth.uid())
  on conflict (list_id, user_id) do update
    set status = 'pending', invited_by = excluded.invited_by,
        responded_at = null, created_at = now()
    where public.list_members.status = 'declined'
  returning * into v_row;

  if not found then
    raise exception 'already_invited_or_member' using errcode = '23505';
  end if;

  return v_row;
end;
$$;
grant execute on function public.invite_to_list(uuid, text) to authenticated;
