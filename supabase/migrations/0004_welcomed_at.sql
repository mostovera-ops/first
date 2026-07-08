-- Flux — track whether the one-time welcome email has been sent.
-- Run in the Supabase SQL Editor (see SETUP.md, Stage 4). Idempotent.

alter table public.profiles
  add column if not exists welcomed_at timestamptz;
