-- Replaces the always-on per-item upvote (0016_list_item_votes.sql) with a
-- time-boxed poll: any member starts a poll with a deadline and a shortlist
-- of candidate items already in the list; members pick ONE favorite among
-- the candidates; the poll auto-closes once the deadline passes (enforced
-- server-side in cast_poll_vote, not by a background job).
drop table if exists public.list_item_votes cascade;
drop function if exists public.is_item_list_member(uuid, uuid);

-- Tables must exist before is_poll_list_member below: unlike plpgsql,
-- a `language sql` function body is parsed against the catalog at CREATE
-- time, so it can't forward-reference a table that doesn't exist yet.
create table if not exists public.list_polls (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  deadline timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists list_polls_list_idx on public.list_polls (list_id, created_at desc);

create table if not exists public.list_poll_candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.list_polls (id) on delete cascade,
  list_item_id uuid not null references public.list_items (id) on delete cascade,
  unique (poll_id, list_item_id)
);

create table if not exists public.list_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.list_polls (id) on delete cascade,
  candidate_id uuid not null references public.list_poll_candidates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One vote per person per poll (a real election, not per-item upvotes);
  -- re-voting updates candidate_id via the upsert in cast_poll_vote below.
  unique (poll_id, user_id)
);

-- Same shape as is_list_member/is_list_owner: list_poll_candidates/
-- list_poll_votes have no list_id column of their own, so membership is
-- resolved through the poll's real list_id rather than trusting a
-- client-supplied one.
create or replace function public.is_poll_list_member(_poll_id uuid, _user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.list_polls p
    where p.id = _poll_id and public.is_list_member(p.list_id, _user_id)
  );
$$;
revoke all on function public.is_poll_list_member(uuid, uuid) from public;
grant execute on function public.is_poll_list_member(uuid, uuid) to authenticated;

alter table public.list_polls enable row level security;
alter table public.list_poll_candidates enable row level security;
alter table public.list_poll_votes enable row level security;

create policy "Members can view polls in their lists"
  on public.list_polls for select using (public.is_list_member(list_id, auth.uid()));
create policy "Members can start a poll in their lists"
  on public.list_polls for insert
  with check (created_by = auth.uid() and public.is_list_member(list_id, auth.uid()));

create policy "Members can view poll candidates"
  on public.list_poll_candidates for select using (public.is_poll_list_member(poll_id, auth.uid()));
create policy "Members can add poll candidates"
  on public.list_poll_candidates for insert with check (public.is_poll_list_member(poll_id, auth.uid()));

create policy "Members can view poll votes"
  on public.list_poll_votes for select using (public.is_poll_list_member(poll_id, auth.uid()));
create policy "Members can cast their own poll vote"
  on public.list_poll_votes for insert
  with check (user_id = auth.uid() and public.is_poll_list_member(poll_id, auth.uid()));
create policy "Members can change their own poll vote"
  on public.list_poll_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- security invoker, same rationale as create_shared_list: no elevated
-- privilege needed, just transactional atomicity across the poll +
-- candidate-row inserts (and the "one active poll per list" guard below).
create or replace function public.start_list_poll(p_list_id uuid, p_deadline timestamptz, p_item_ids uuid[])
returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_poll_id uuid;
begin
  if not public.is_list_member(p_list_id, auth.uid()) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if p_deadline <= now() then
    raise exception 'invalid_deadline' using errcode = '22023';
  end if;
  if array_length(p_item_ids, 1) is null or array_length(p_item_ids, 1) < 2 then
    raise exception 'need_at_least_two_candidates' using errcode = '22023';
  end if;
  if exists (select 1 from public.list_polls where list_id = p_list_id and deadline > now()) then
    raise exception 'poll_already_active' using errcode = '23505';
  end if;

  insert into public.list_polls (list_id, created_by, deadline)
  values (p_list_id, auth.uid(), p_deadline)
  returning id into v_poll_id;

  insert into public.list_poll_candidates (poll_id, list_item_id)
  select v_poll_id, item_id from unnest(p_item_ids) as item_id;

  return v_poll_id;
end;
$$;
grant execute on function public.start_list_poll(uuid, timestamptz, uuid[]) to authenticated;

create or replace function public.cast_poll_vote(p_poll_id uuid, p_candidate_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
declare v_deadline timestamptz; v_list_id uuid;
begin
  select deadline, list_id into v_deadline, v_list_id from public.list_polls where id = p_poll_id;
  if not found then
    raise exception 'poll_not_found' using errcode = 'P0002';
  end if;
  if not public.is_list_member(v_list_id, auth.uid()) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if now() > v_deadline then
    raise exception 'poll_closed' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.list_poll_candidates where id = p_candidate_id and poll_id = p_poll_id
  ) then
    raise exception 'invalid_candidate' using errcode = '22023';
  end if;

  insert into public.list_poll_votes (poll_id, candidate_id, user_id)
  values (p_poll_id, p_candidate_id, auth.uid())
  on conflict (poll_id, user_id) do update
    set candidate_id = excluded.candidate_id, created_at = now();
end;
$$;
grant execute on function public.cast_poll_vote(uuid, uuid) to authenticated;

-- Returns the most recent poll for a list (active or just-closed) with
-- per-candidate vote counts and whether the caller voted for that
-- candidate. security invoker: the RLS policies above already scope every
-- row read here to members of the poll's list, so no elevated privilege
-- is needed -- this just bundles the aggregate + "my vote" lookup into one
-- round trip.
create or replace function public.get_list_poll(p_list_id uuid)
returns table (
  poll_id uuid,
  deadline timestamptz,
  created_by uuid,
  candidate_id uuid,
  list_item_id uuid,
  vote_count integer,
  my_vote boolean
)
language sql security invoker set search_path = public stable as $$
  with latest as (
    select id, deadline, created_by from public.list_polls
    where list_id = p_list_id
    order by created_at desc limit 1
  )
  select
    latest.id, latest.deadline, latest.created_by,
    c.id, c.list_item_id,
    (select count(*)::integer from public.list_poll_votes v where v.candidate_id = c.id),
    exists(select 1 from public.list_poll_votes v where v.candidate_id = c.id and v.user_id = auth.uid())
  from latest
  join public.list_poll_candidates c on c.poll_id = latest.id;
$$;
grant execute on function public.get_list_poll(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_polls') then
    alter publication supabase_realtime add table public.list_polls;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_poll_candidates') then
    alter publication supabase_realtime add table public.list_poll_candidates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_poll_votes') then
    alter publication supabase_realtime add table public.list_poll_votes;
  end if;
end $$;
