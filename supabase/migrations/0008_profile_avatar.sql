-- Generated-avatar style choice for the boring-avatars profile photo picker.
-- The seed text is the existing profiles.display_name (falls back to email
-- client-side), so no separate seed column is needed.
alter table public.profiles
  add column if not exists avatar_variant text not null default 'beam';
