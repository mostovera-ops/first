-- Flux — profiles table + Row Level Security
-- Run this in the Supabase SQL Editor (see SETUP.md, Stage 2).

-- 1. Table: one row per auth user.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  first_name   text,
  last_name    text,
  avatar_type  text not null default 'animal'
                 check (avatar_type in ('animal', 'upload', 'emoji')),
  avatar_animal text,          -- slug, e.g. 'fox' (assigned client-side by user-id hash)
  avatar_url   text,           -- public URL when avatar_type = 'upload'
  avatar_emoji text,           -- a single emoji when avatar_type = 'emoji'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2. Row Level Security: a user can only touch their own row.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- 3. Keep updated_at fresh on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Auto-create a profile row when a user signs up, prefilling first/last
--    name from Google/OAuth metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta->>'name', meta->>'full_name', '');
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(meta->>'given_name', ''),
      nullif(split_part(full_name, ' ', 1), '')
    ),
    coalesce(
      nullif(meta->>'family_name', ''),
      nullif(substring(full_name from position(' ' in full_name) + 1), '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
