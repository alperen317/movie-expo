-- Public profile row per auth user. Needed so list collaborators can see
-- each other's email, and so email-based invites can resolve to a user id
-- without exposing auth.users directly.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));

alter table public.profiles enable row level security;

-- Backfill any pre-existing users (no-op on a fresh project).
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Keep profiles in sync with auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_new_user();

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Exact-match email -> id lookup for the invite flow. This is a SECURITY
-- DEFINER RPC instead of an open SELECT policy so a user can resolve "does
-- this email have an account" without ever being able to browse/enumerate
-- the profiles table.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;
