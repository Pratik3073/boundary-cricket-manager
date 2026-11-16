-- Boundary Cricket Manager: run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  phone text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  team_a_name text not null,
  team_b_name text not null,
  overs_limit integer not null check (overs_limit between 1 and 100),
  toss_winner text check (toss_winner in ('A','B')),
  toss_decision text check (toss_decision in ('bat','bowl')),
  status text not null default 'setup' check (status in ('setup','live','completed','abandoned')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team text not null check (team in ('A','B')),
  is_captain boolean not null default false,
  batting_order integer not null default 1,
  unique(match_id, player_id),
  unique(match_id, team, batting_order)
);

create table if not exists public.innings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  innings_number integer not null check (innings_number in (1,2)),
  batting_team text not null check (batting_team in ('A','B')),
  striker_id uuid references public.players(id),
  non_striker_id uuid references public.players(id),
  current_bowler_id uuid references public.players(id),
  status text not null default 'live' check (status in ('live','completed')),
  created_at timestamptz not null default now(),
  unique(match_id, innings_number),
  check (striker_id is null or non_striker_id is null or striker_id <> non_striker_id)
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  innings_id uuid not null references public.innings(id) on delete cascade,
  striker_id uuid references public.players(id),
  non_striker_id uuid references public.players(id),
  bowler_id uuid references public.players(id),
  batter_runs integer not null default 0 check (batter_runs between 0 and 6),
  extra_type text check (extra_type in ('wide','no_ball','bye','leg_bye')),
  extra_runs integer not null default 0 check (extra_runs between 0 and 10),
  is_legal boolean not null default true,
  wicket_type text,
  dismissed_player_id uuid references public.players(id),
  created_at timestamptz not null default now()
);

create index if not exists match_players_match_idx on public.match_players(match_id);
create index if not exists innings_match_idx on public.innings(match_id);
create index if not exists deliveries_innings_created_idx on public.deliveries(innings_id, created_at);

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.innings enable row level security;
alter table public.deliveries enable row level security;

-- Public read access is intentional for the public live-score pages.
drop policy if exists "players readable" on public.players;
create policy "players readable" on public.players for select using (true);
drop policy if exists "admin manages players" on public.players;
create policy "admin manages players" on public.players for all to authenticated using (true) with check (true);

drop policy if exists "matches readable" on public.matches;
create policy "matches readable" on public.matches for select using (true);
drop policy if exists "admin manages matches" on public.matches;
create policy "admin manages matches" on public.matches for all to authenticated using (true) with check (true);

drop policy if exists "match players readable" on public.match_players;
create policy "match players readable" on public.match_players for select using (true);
drop policy if exists "admin manages match players" on public.match_players;
create policy "admin manages match players" on public.match_players for all to authenticated using (true) with check (true);

drop policy if exists "innings readable" on public.innings;
create policy "innings readable" on public.innings for select using (true);
drop policy if exists "admin manages innings" on public.innings;
create policy "admin manages innings" on public.innings for all to authenticated using (true) with check (true);

drop policy if exists "deliveries readable" on public.deliveries;
create policy "deliveries readable" on public.deliveries for select using (true);
drop policy if exists "admin manages deliveries" on public.deliveries;
create policy "admin manages deliveries" on public.deliveries for all to authenticated using (true) with check (true);

-- Enable Realtime for the tables used by public scoreboards.
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.innings;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.deliveries;
exception when duplicate_object then null; when others then null; end $$;
