-- Close the email enumeration gap in invite_to_list: it used to raise a
-- distinct 'user_not_found' exception when the invited email had no account,
-- separate from 'already_invited_or_member' when it did. A list owner could
-- invite arbitrary addresses to a list they control and read which response
-- came back to learn which emails are registered. 0014's rate limit only
-- slows that scan down, it doesn't close the leak. Both branches now raise
-- the same 'invite_failed' exception so the two cases are indistinguishable
-- from the response alone. cannot_invite_self stays separate -- it only
-- fires for the caller's own email and leaks nothing about anyone else.
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

  if v_target is not null and v_target = auth.uid() then
    raise exception 'cannot_invite_self' using errcode = '22023';
  end if;

  if v_target is not null then
    insert into public.list_members (list_id, user_id, role, status, invited_by)
    values (p_list_id, v_target, 'member', 'pending', auth.uid())
    on conflict (list_id, user_id) do update
      set status = 'pending', invited_by = excluded.invited_by,
          responded_at = null, created_at = now()
      where public.list_members.status = 'declined'
    returning * into v_row;
  end if;

  if v_target is null or not found then
    raise exception 'invite_failed' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;
grant execute on function public.invite_to_list(uuid, text) to authenticated;
