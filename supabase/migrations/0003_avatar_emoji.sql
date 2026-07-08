-- Flux — add custom-emoji avatars.
-- Only needed if you already ran 0001 BEFORE it included the emoji option.
-- Safe to run either way (idempotent).

alter table public.profiles
  add column if not exists avatar_emoji text;

-- Expand the avatar_type check to allow 'emoji'.
alter table public.profiles
  drop constraint if exists profiles_avatar_type_check;

alter table public.profiles
  add constraint profiles_avatar_type_check
  check (avatar_type in ('animal', 'upload', 'emoji'));
