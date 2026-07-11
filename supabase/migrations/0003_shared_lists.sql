-- Collaborative lists: a list owned by one creator, co-edited by accepted
-- members, holding TMDB movie/tv items.

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lists_created_by_idx on public.lists (created_by);

-- Single table for both accepted membership AND pending/declined invites.
-- Invites in v1 only ever target an existing app user (no invite-to-signup
-- flow), so there is no "email with no user_id yet" case that would need a
-- separate list_invites table. A pending invite is simply a list_members
-- row with status='pending' and a known user_id.
-- user_id/invited_by reference public.profiles (not auth.users directly):
-- PostgREST can only embed a related table across a real FK edge, and
-- profiles.id mirrors auth.users.id 1:1 (see 0002's trigger + backfill),
-- so this is safe while also making `member:profiles!list_members_user_id_fkey(email)`
-- style embeds in application queries resolvable.
create table if not exists public.list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (list_id, user_id)
);

create index if not exists list_members_list_idx on public.list_members (list_id, status);
create index if not exists list_members_user_idx on public.list_members (user_id, status);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  media_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  vote_average numeric,
  year text,
  genre text,
  added_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, media_id, media_type)
);

create index if not exists list_items_list_idx on public.list_items (list_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lists_set_updated_at on public.lists;
create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- SECURITY DEFINER helpers -- the RLS recursion fix.
--
-- A naive "select where I'm a member of this list" policy on list_members
-- would subquery list_members from inside its own policy, which Postgres
-- flags as infinite recursion. The fix (Supabase's documented pattern) is
-- to push the membership check into a SECURITY DEFINER function: it
-- executes as its owner, bypassing RLS internally instead of recursing
-- into it.
-- ---------------------------------------------------------------------
create or replace function public.is_list_member(_list_id uuid, _user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = _list_id and m.user_id = _user_id and m.status = 'accepted'
  );
$$;
revoke all on function public.is_list_member(uuid, uuid) from public;
grant execute on function public.is_list_member(uuid, uuid) to authenticated;

-- Looser check used ONLY for `lists` visibility: a not-yet-accepted
-- invitee must still be able to see the list's name (to render "Alice
-- invited you to 'Oscar Winners'") even though they can't yet see its
-- items or member roster. Kept separate from is_list_member on purpose,
-- so list_items/list_members stay accepted-only by default.
create or replace function public.can_view_list(_list_id uuid, _user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = _list_id and m.user_id = _user_id and m.status in ('accepted', 'pending')
  );
$$;
revoke all on function public.can_view_list(uuid, uuid) from public;
grant execute on function public.can_view_list(uuid, uuid) to authenticated;

create or replace function public.is_list_owner(_list_id uuid, _user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.lists l where l.id = _list_id and l.created_by = _user_id);
$$;
revoke all on function public.is_list_owner(uuid, uuid) from public;
grant execute on function public.is_list_owner(uuid, uuid) to authenticated;

alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;

-- lists ------------------------------------------------------------------
create policy "Members and invitees can view their lists"
  on public.lists for select
  using (created_by = auth.uid() or public.can_view_list(id, auth.uid()));

create policy "Any authenticated user can create a list"
  on public.lists for insert
  with check (created_by = auth.uid());

create policy "Members can rename their lists"
  on public.lists for update
  using (created_by = auth.uid() or public.is_list_member(id, auth.uid()))
  with check (created_by = auth.uid() or public.is_list_member(id, auth.uid()));

create policy "Only the creator can delete a list"
  on public.lists for delete
  using (created_by = auth.uid());

-- Column-tampering guard: the UPDATE policy above only constrains which
-- ROWS are updatable, not which COLUMNS change. Without this trigger, any
-- member could rename the list AND silently rewrite created_by to
-- themselves in the same UPDATE -- a privilege-escalation path that
-- doesn't exist for saved_media because it has no UPDATE policy at all.
-- created_by must be immutable after insert.
create or replace function public.prevent_list_reassignment()
returns trigger language plpgsql as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists lists_prevent_reassignment on public.lists;
create trigger lists_prevent_reassignment
  before update on public.lists
  for each row execute function public.prevent_list_reassignment();

-- list_members -------------------------------------------------------------
create policy "Members can view membership of their lists"
  on public.list_members for select
  using (user_id = auth.uid() or public.is_list_member(list_id, auth.uid()));

create policy "Owner bootstraps self or member invites others"
  on public.list_members for insert
  with check (
    (user_id = auth.uid() and public.is_list_owner(list_id, auth.uid()))
    or public.is_list_member(list_id, auth.uid())
  );

create policy "Invitee can respond to their own invite"
  on public.list_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Same class of bug as lists above: the UPDATE policy only checks
-- user_id = auth.uid(), so without a trigger a member could UPDATE their
-- OWN row's list_id to point at an unrelated (private) list and flip
-- status to 'accepted' -- manufacturing membership in a list they were
-- never invited to. Lock the update path to "accept/decline your own
-- still-pending invite, once" and nothing else.
create or replace function public.prevent_list_member_tampering()
returns trigger language plpgsql as $$
begin
  if new.list_id <> old.list_id or new.user_id <> old.user_id or new.role <> old.role
     or coalesce(new.invited_by::text, '') <> coalesce(old.invited_by::text, '') then
    raise exception 'only status/responded_at may change on a membership row' using errcode = '42501';
  end if;
  if old.status <> 'pending' or new.status not in ('accepted', 'declined') then
    raise exception 'invite has already been responded to' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists list_members_prevent_tampering on public.list_members;
create trigger list_members_prevent_tampering
  before update on public.list_members
  for each row execute function public.prevent_list_member_tampering();

create policy "Leave list or creator removes a member"
  on public.list_members for delete
  using (user_id = auth.uid() or public.is_list_owner(list_id, auth.uid()));

-- list_items -----------------------------------------------------------------
create policy "Members can view items in their lists"
  on public.list_items for select using (public.is_list_member(list_id, auth.uid()));

create policy "Members can add items"
  on public.list_items for insert
  with check (added_by = auth.uid() and public.is_list_member(list_id, auth.uid()));

-- Any accepted member may remove any item (product decision: equal
-- collaborators for item editing) -- not scoped to added_by.
create policy "Members can remove any item"
  on public.list_items for delete using (public.is_list_member(list_id, auth.uid()));

-- profiles: let list co-members see each other's email ---------------------
-- status on the viewer's side is 'accepted' OR 'pending' (so a pending
-- invitee can resolve "who invited me"), but the target must be 'accepted'
-- (don't let two pending invitees see each other before either has joined).
create or replace function public.shares_list_with(_other_user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.list_members m1
    join public.list_members m2 on m1.list_id = m2.list_id
    where m1.user_id = auth.uid() and m1.status in ('accepted', 'pending')
      and m2.user_id = _other_user_id and m2.status = 'accepted'
  );
$$;
revoke all on function public.shares_list_with(uuid) from public;
grant execute on function public.shares_list_with(uuid) to authenticated;

create policy "Users can view profiles of their list co-members"
  on public.profiles for select using (public.shares_list_with(id));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- security invoker (default) -- no elevated privilege needed, just
-- transactional atomicity across the two inserts (list + owner-member row).
create or replace function public.create_shared_list(p_name text)
returns public.lists
language plpgsql security invoker set search_path = public as $$
declare v_list public.lists;
begin
  insert into public.lists (name, created_by) values (trim(p_name), auth.uid())
  returning * into v_list;

  insert into public.list_members (list_id, user_id, role, status, responded_at)
  values (v_list.id, auth.uid(), 'owner', 'accepted', now());

  return v_list;
end;
$$;
grant execute on function public.create_shared_list(text) to authenticated;

-- security definer -- needs to resolve an email to a user id, which is
-- outside the caller's normal RLS-visible surface (that's the whole point
-- of not exposing an open profiles SELECT policy).
create or replace function public.invite_to_list(p_list_id uuid, p_email text)
returns public.list_members
language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_row public.list_members;
begin
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

-- ---------------------------------------------------------------------------
-- Realtime -- guarded with pg_publication_tables checks so this migration
-- stays idempotent, matching 0001's `if not exists` style.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lists') then
    alter publication supabase_realtime add table public.lists;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_members') then
    alter publication supabase_realtime add table public.list_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_items') then
    alter publication supabase_realtime add table public.list_items;
  end if;
end $$;
