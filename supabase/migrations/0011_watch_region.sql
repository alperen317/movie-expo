-- Lets a user override the "where to watch" region independent of device
-- locale, for users tracking a foreign catalog. Null means "use device
-- region" (lib/tmdb/region.ts's getDeviceRegion() fallback).
alter table public.profiles
  add column if not exists watch_region text;
