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

-- =========================================================
-- COMMUNITY: Stories feed (curated, read-only for users)
-- =========================================================

create table if not exists hp_stories (
  id          uuid primary key default gen_random_uuid(),
  author      text not null,
  location    text,
  peptide     text,
  duration    text,
  text        text not null,
  color       text default '#3aa0ff',
  published   boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_hp_stories_pub on hp_stories(published, created_at desc);

alter table hp_stories enable row level security;

drop policy if exists "anon read published stories" on hp_stories;
drop policy if exists "anon all hp_stories" on hp_stories;

-- Public read of published stories only
create policy "anon read published stories" on hp_stories
  for select using (published = true);

-- Seed with the 4 demo stories
insert into hp_stories (author, location, peptide, duration, text, color, published) values
  ('Marco T.', 'San José, CR', 'BPC-157 + TB-500', '8 weeks', 'Tenía una lesión crónica en el hombro de hace 2 años. Después de 8 semanas con el stack de recuperación, el dolor desapareció y volví a entrenar full. Increíble.', '#1D9E75', true),
  ('Sofía M.', 'Guanacaste, CR', 'Retatrutide', '12 weeks', 'Bajé 18kg en 3 meses con dieta y retatrutide. Lo más importante: no rebote, energía alta, sin antojos. Ya no tengo ansiedad por la comida.', '#1a6fc4', true),
  ('Diego R.', 'Heredia, CR', 'GHK-Cu + NAD+', '6 months', 'A los 47 años me siento como cuando tenía 35. La piel mejoró mucho y el sueño profundo es brutal. Vale cada colón.', '#534AB7', true),
  ('Anónimo', 'Costa Rica', 'Ipamorelin/CJC', '10 weeks', 'Recuperación entre entrenamientos un 50% más rápida. Los ciclos de sueño profundo son notables desde la primera semana.', '#BA7517', true)
on conflict do nothing;
