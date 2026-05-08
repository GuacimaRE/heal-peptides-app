-- =========================================================
-- HEAL Peptides App — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor (wercr-crm project)
-- =========================================================

-- Per-user app state (single row per user, upsert on user_id)
create table if not exists hp_state (
  user_id        text primary key,
  vials          jsonb default '[]'::jsonb,
  custom_stack   jsonb default '[]'::jsonb,
  active_goal    text  default 'recovery',
  streak         int   default 0,
  today_date     text,
  today_doses    jsonb default '[]'::jsonb,
  checked_today  jsonb default '{}'::jsonb,
  updated_at     timestamptz default now()
);

-- Daily dose log (one row per user/date)
create table if not exists hp_dose_log (
  user_id    text not null,
  date       text not null,
  doses      jsonb default '[]'::jsonb,
  checked    jsonb default '{}'::jsonb,
  total      int   default 0,
  done       int   default 0,
  updated_at timestamptz default now(),
  primary key (user_id, date)
);

create index if not exists idx_hp_dose_log_user on hp_dose_log(user_id, date desc);

-- =========================================================
-- RLS (Row Level Security)
-- The app uses Netlify Identity (not Supabase Auth), so we can't
-- match on auth.uid(). Two options:
--
-- Option A (simplest, lower security): allow anon read/write on
-- these two tables. Each row is keyed by Netlify user_id which
-- only the legitimate user knows. Acceptable for a research app.
--
-- Option B (recommended later): proxy through a Netlify Function
-- that validates the Netlify JWT before writing.
-- =========================================================

alter table hp_state    enable row level security;
alter table hp_dose_log enable row level security;

-- Drop old policies if rerunning
drop policy if exists "anon all hp_state"    on hp_state;
drop policy if exists "anon all hp_dose_log" on hp_dose_log;

create policy "anon all hp_state"    on hp_state    for all using (true) with check (true);
create policy "anon all hp_dose_log" on hp_dose_log for all using (true) with check (true);
