-- Separates the generated-avatar hash seed from display_name. 0008 reused
-- display_name as the seed to avoid a new column, but that means the
-- "shuffle" button on the avatar picker could only ever cycle through the 6
-- style variants for one fixed seed -- a small, repeatable set. Storing a
-- random seed lets shuffle produce genuinely new-looking avatars. Null means
-- "no override yet", so existing profiles keep rendering exactly as before
-- (falling back to display_name/email client-side).
alter table public.profiles
  add column if not exists avatar_seed text;
