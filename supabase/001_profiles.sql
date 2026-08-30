-- Run this once in the Supabase SQL Editor (SQL Editor -> New query -> paste -> Run).
-- Creates the account/profile table backing real signup — one row per auth user, holding just
-- the username. Everything else (elo, stats, cosmetics...) stays on-device for now; friends,
-- matchmaking, and spectator mode will add their own tables on top of this one later.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness ("Test" and "test" collide) — matters once friend search/matchmaking
-- need to look players up by name.
create unique index profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Anyone signed in can see any profile's username — needed later for friend search, matchmaking,
-- and spectating (finding/displaying other players), and there's nothing sensitive in this table.
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- A player can only ever create/edit their own row, never someone else's.
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
