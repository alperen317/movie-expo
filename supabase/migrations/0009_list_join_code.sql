-- Code-based join for shared lists: any authenticated user who has the code
-- joins instantly (accepted, no pending step) -- an alternative to
-- invite_to_list's email lookup, which requires knowing the invitee's exact
-- email AND them already having an account.

alter table public.lists add column if not exists join_code text;

-- 32-symbol alphabet with ambiguous characters (0/O, 1/I) removed, so codes
-- are easy to read/type by hand.
create or replace function public.generate_list_join_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Backfill any pre-existing lists (no-op on a fresh project) before the
-- column is made unique/not null.
do $$
declare v_list record;
begin
  for v_list in select id from public.lists where join_code is null loop
    loop
      begin
        update public.lists set join_code = public.generate_list_join_code() where id = v_list.id;
        exit;
      exception when unique_violation then
        -- extremely unlikely with an 8-char/32-symbol alphabet; retry.
      end;
    end loop;
  end loop;
end $$;

alter table public.lists alter column join_code set not null;
create unique index if not exists lists_join_code_key on public.lists (join_code);

-- create_shared_list: same as 0003's version, plus generating a unique
-- join_code with a bounded retry loop for the (near-impossible) collision case.
create or replace function public.create_shared_list(p_name text)
returns public.lists
language plpgsql security invoker set search_path = public as $$
declare v_list public.lists; v_code text;
begin
  loop
    v_code := public.generate_list_join_code();
    begin
      insert into public.lists (name, created_by, join_code) values (trim(p_name), auth.uid(), v_code)
      returning * into v_list;
      exit;
    exception when unique_violation then
      -- retry with a freshly generated code
    end;
  end loop;

  insert into public.list_members (list_id, user_id, role, status, responded_at)
  values (v_list.id, auth.uid(), 'owner', 'accepted', now());

  return v_list;
end;
$$;

-- security definer -- the caller isn't a member yet, so they can't SELECT
-- `lists` under its normal RLS; this resolves the code lookup + membership
-- insert atomically without opening up a broader SELECT policy.
create or replace function public.join_list_by_code(p_code text)
returns public.lists
language plpgsql security definer set search_path = public as $$
declare v_list public.lists; v_membership public.list_members;
begin
  select * into v_list from public.lists where join_code = upper(trim(p_code));
  if not found then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  -- Already the owner or an accepted member: idempotent no-op.
  if v_list.created_by = auth.uid() then
    return v_list;
  end if;

  select * into v_membership from public.list_members
    where list_id = v_list.id and user_id = auth.uid();

  if found then
    if v_membership.status <> 'accepted' then
      update public.list_members
        set status = 'accepted', responded_at = now()
        where id = v_membership.id;
    end if;
  else
    insert into public.list_members (list_id, user_id, role, status, responded_at)
    values (v_list.id, auth.uid(), 'member', 'accepted', now());
  end if;

  return v_list;
end;
$$;
revoke all on function public.join_list_by_code(text) from public;
grant execute on function public.join_list_by_code(text) to authenticated;

-- security invoker -- is_list_owner() check does the privilege work; no
-- elevated access needed beyond that.
create or replace function public.regenerate_list_join_code(p_list_id uuid)
returns text
language plpgsql security invoker set search_path = public as $$
declare v_code text;
begin
  if not public.is_list_owner(p_list_id, auth.uid()) then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  loop
    v_code := public.generate_list_join_code();
    begin
      update public.lists set join_code = v_code where id = p_list_id;
      exit;
    exception when unique_violation then
      -- retry with a freshly generated code
    end;
  end loop;

  return v_code;
end;
$$;
grant execute on function public.regenerate_list_join_code(uuid) to authenticated;
