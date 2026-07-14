-- Rate limit join_list_by_code: the code space is already brute-force-safe
-- in practice (32^8 combinations), but the RPC itself had no throttling.
-- This adds a simple per-user rolling-window counter as defense in depth
-- ahead of store submission.

create table if not exists public.join_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists join_code_attempts_user_created_idx
  on public.join_code_attempts (user_id, created_at);

-- No RLS policies on purpose: this table is only ever touched from inside
-- join_list_by_code below (security definer), never queried directly by a
-- client, so there is no policy to write.
alter table public.join_code_attempts enable row level security;

-- Re-declare 0009's join_list_by_code with a rate-limit check prepended;
-- the code-lookup/membership body below is otherwise unchanged.
create or replace function public.join_list_by_code(p_code text)
returns public.lists
language plpgsql security definer set search_path = public as $$
declare
  v_list public.lists;
  v_membership public.list_members;
  v_recent_attempts int;
begin
  delete from public.join_code_attempts
    where user_id = auth.uid() and created_at < now() - interval '10 minutes';

  select count(*) into v_recent_attempts
    from public.join_code_attempts where user_id = auth.uid();

  if v_recent_attempts >= 20 then
    raise exception 'rate_limited' using errcode = 'P0003';
  end if;

  insert into public.join_code_attempts (user_id) values (auth.uid());

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
