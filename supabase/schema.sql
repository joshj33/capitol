-- Capitol — Postgres schema for Supabase.
--
-- This mirrors src/lib/types.ts. The app currently runs on seeded data
-- (src/lib/seed.ts); when you're ready to go live, create a Supabase project,
-- run this file in the SQL editor, then reimplement src/lib/data.ts against the
-- Supabase client (the function signatures stay the same).
--
-- Auth/users are provided by Supabase's built-in auth.users table.

-- ----------------------------------------------------------------------------
-- Reference / figure pool (global, shared across leagues)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table parties (
  id text primary key,
  name text not null,
  abbr text not null,
  country text not null default 'US'
);

create type office_type as enum
  ('senator','representative','governor','cabinet','president','candidate');
create type chamber_control as enum ('majority','minority','na');

create table figures (
  id text primary key,
  full_name text not null,
  slug text unique not null,
  party_id text not null references parties (id),
  office office_type not null,
  state text not null,
  chamber_control chamber_control not null default 'na',
  prominence int not null default 50,
  photo_url text,
  bioguide_id text,
  wikidata_id text,
  active boolean not null default true
);

-- crosswalk of external IDs used by the ETL pipeline
create table figure_ids (
  figure_id text not null references figures (id) on delete cascade,
  source text not null,
  external_id text not null,
  primary key (figure_id, source)
);

-- ----------------------------------------------------------------------------
-- Leagues, teams, rosters
-- ----------------------------------------------------------------------------
create type league_visibility as enum ('private','public','global');

create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- In production this references auth.users(id); left as a plain uuid so the
  -- demo can be seeded (scripts/seed-supabase.ts) before any auth users exist.
  owner_user_id uuid,
  mode text not null default 'national',
  pool_filter jsonb not null default '{}',
  visibility league_visibility not null default 'private',
  scoring_weights jsonb not null default '{"power":0.6,"influence":0.4,"truth":0,"aura":0}',
  roster_config jsonb not null default '{"SEN":2,"REP":2,"EXEC":1,"FLEX":1,"BENCH":3}',
  regular_weeks int not null default 10,
  playoff_teams int not null default 4,
  current_week int not null default 1,
  invite_code text unique,
  season_start date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  -- Plain uuid (not an auth.users FK) so the demo seeds without auth; the
  -- manager's display handle is denormalized here for the same reason.
  user_id uuid,
  owner_handle text,
  name text not null,
  logo_emoji text default '🏛️'
);

create type roster_slot as enum ('SEN','REP','EXEC','FLEX','BENCH');

create table roster_slots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  figure_id text not null references figures (id),
  slot roster_slot not null,
  status text not null default 'active',
  acquired_via text default 'draft',
  acquired_at timestamptz not null default now(),
  dropped_at timestamptz,
  unique (team_id, figure_id)
);

-- ----------------------------------------------------------------------------
-- Draft
-- ----------------------------------------------------------------------------
create table drafts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  type text not null default 'snake',
  status text not null default 'scheduled',
  current_pick int not null default 0,
  pick_deadline timestamptz,
  draft_order jsonb not null default '[]'
);

create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts (id) on delete cascade,
  team_id uuid not null references teams (id),
  figure_id text not null references figures (id),
  round int not null,
  pick_no int not null,
  cost numeric,
  made_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Schedule + scoring
-- ----------------------------------------------------------------------------
create table matchups (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  week int not null,
  home_team_id uuid not null references teams (id),
  away_team_id uuid not null references teams (id),
  home_points numeric not null default 0,
  away_points numeric not null default 0,
  status text not null default 'scheduled'
);

create type score_category as enum ('power','influence','truth','aura');

-- Immutable source-of-truth events produced by the ETL pipeline.
create table events (
  id uuid primary key default gen_random_uuid(),
  figure_id text not null references figures (id),
  category score_category not null,
  type text not null,
  week int not null,
  occurred_at timestamptz not null,
  base_points numeric not null,
  source text not null,
  source_url text,
  description text not null,
  raw jsonb
);
create index events_figure_week_idx on events (figure_id, week, category);

-- Derived / recomputable aggregates.
create table figure_week_scores (
  figure_id text not null references figures (id),
  week int not null,
  category score_category not null,
  points numeric not null default 0,
  projected_points numeric,
  primary key (figure_id, week, category)
);

create table team_week_scores (
  team_id uuid not null references teams (id) on delete cascade,
  week int not null,
  category score_category not null,
  points numeric not null default 0,
  primary key (team_id, week, category)
);

-- ----------------------------------------------------------------------------
-- Transactions
-- ----------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  team_id uuid not null references teams (id),
  kind text not null,            -- add | drop | trade | waiver
  payload jsonb not null default '{}',
  status text not null default 'complete',
  created_at timestamptz not null default now()
);

create table waiver_claims (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  team_id uuid not null references teams (id),
  add_figure_id text not null references figures (id),
  drop_figure_id text references figures (id),
  priority int not null default 0,
  status text not null default 'pending',
  process_at timestamptz
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  from_team_id uuid not null references teams (id),
  to_team_id uuid not null references teams (id),
  status text not null default 'proposed',
  commissioner_state text not null default 'none',
  created_at timestamptz not null default now()
);

create table trade_items (
  trade_id uuid not null references trades (id) on delete cascade,
  team_id uuid not null references teams (id),
  figure_id text not null references figures (id),
  primary key (trade_id, figure_id)
);

-- ----------------------------------------------------------------------------
-- Social
-- ----------------------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text
);

create table user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null references badges (id),
  league_id uuid references leagues (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id, league_id)
);

-- ----------------------------------------------------------------------------
-- AI + ops
-- ----------------------------------------------------------------------------
create table ai_recaps (
  id uuid primary key default gen_random_uuid(),
  scope text not null,           -- user | league
  scope_id text not null,
  kind text not null,            -- daily | weekly | trade | projection
  week int,
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create table ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_in int,
  status text,
  error text
);

-- ----------------------------------------------------------------------------
-- Row-Level Security.
--
-- Every table below has RLS enabled. The demo grants PUBLIC READ on the data
-- the app renders (reference tables + league/teams/rosters/matchups/events) and
-- grants NO write policy to anon — so the anon key can read but not write.
-- Writes happen through the service-role key (the ETL pipeline and
-- scripts/seed-supabase.ts), which bypasses RLS.
--
-- For a real multi-tenant launch, replace the permissive "public read" policies
-- on league-scoped tables (leagues/teams/roster_slots/matchups/messages) with
-- membership-scoped ones — the commented example below is the template.
-- ----------------------------------------------------------------------------
alter table profiles        enable row level security;
alter table parties         enable row level security;
alter table figures         enable row level security;
alter table leagues         enable row level security;
alter table teams           enable row level security;
alter table roster_slots    enable row level security;
alter table matchups        enable row level security;
alter table events          enable row level security;
alter table figure_week_scores enable row level security;
alter table team_week_scores   enable row level security;
alter table messages        enable row level security;

-- Public read for everything the app needs to render the demo.
create policy "public read parties"      on parties      for select using (true);
create policy "public read figures"      on figures      for select using (true);
create policy "public read leagues"      on leagues      for select using (true);
create policy "public read teams"        on teams        for select using (true);
create policy "public read rosters"      on roster_slots for select using (true);
create policy "public read matchups"     on matchups     for select using (true);
create policy "public read events"       on events       for select using (true);
create policy "public read fig scores"   on figure_week_scores for select using (true);
create policy "public read team scores"  on team_week_scores   for select using (true);

-- Membership-scoped template for production (replaces "public read leagues"):
-- create policy "members read leagues" on leagues for select
--   using (visibility <> 'private'
--          or owner_user_id = auth.uid()
--          or exists (select 1 from teams t where t.league_id = leagues.id and t.user_id = auth.uid()));
-- create policy "owner updates league" on leagues for update
--   using (owner_user_id = auth.uid());
