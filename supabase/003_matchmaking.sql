-- Run this once in the Supabase SQL Editor, after 001_profiles.sql and 002_friends.sql.

-- One row per waiting player. Whoever calls find_or_create_match() and finds nobody waiting gets
-- inserted here; the next caller who finds them removes them and creates the match instead.
create table public.matchmaking_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  elo integer not null,
  created_at timestamptz not null default now()
);

alter table public.matchmaking_queue enable row level security;

create policy "Users can view the queue"
  on public.matchmaking_queue for select
  to authenticated
  using (true);

create policy "Users can join the queue as themselves"
  on public.matchmaking_queue for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave the queue"
  on public.matchmaking_queue for delete
  to authenticated
  using (auth.uid() = user_id);

-- A live game between two real players. `fen`/`pgn` are updated after every move by whichever
-- player just moved (client-validated with chess.js before writing, same trust model as the rest
-- of the app — there's no server-side move validation yet).
create table public.live_matches (
  id uuid primary key default gen_random_uuid(),
  white_id uuid not null references public.profiles (id) on delete cascade,
  black_id uuid not null references public.profiles (id) on delete cascade,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  status text not null default 'active' check (status in ('active', 'finished')),
  winner text check (winner in ('white', 'black', 'draw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_matches enable row level security;

create policy "Participants can view their match"
  on public.live_matches for select
  to authenticated
  using (auth.uid() = white_id or auth.uid() = black_id);

create policy "Participants can update their match"
  on public.live_matches for update
  to authenticated
  using (auth.uid() = white_id or auth.uid() = black_id);

-- Live move sync (see app/online-game.tsx) needs Postgres changes broadcast for this table.
alter publication supabase_realtime add table public.live_matches;

-- Atomic pairing: locks a waiting opponent row (FOR UPDATE SKIP LOCKED) so two players calling
-- this at the same instant can never both grab the same opponent or create two matches for the
-- same pair. Called again every few seconds by a still-waiting player (see onlineMatchStore.ts) —
-- each call first clears any stale queue row for the caller, so re-polling is always safe.
create or replace function public.find_or_create_match(p_elo integer)
returns table (match_id uuid, white_id uuid, black_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_opponent uuid;
  v_match_id uuid;
  v_white uuid;
  v_black uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.matchmaking_queue where user_id = v_me;

  select q.user_id into v_opponent
  from public.matchmaking_queue q
  where q.user_id <> v_me
  order by q.created_at asc
  for update skip locked
  limit 1;

  if v_opponent is not null then
    delete from public.matchmaking_queue where user_id = v_opponent;
    if random() < 0.5 then
      v_white := v_me;
      v_black := v_opponent;
    else
      v_white := v_opponent;
      v_black := v_me;
    end if;
    insert into public.live_matches (white_id, black_id) values (v_white, v_black) returning id into v_match_id;
    return query select v_match_id, v_white, v_black;
  else
    insert into public.matchmaking_queue (user_id, elo) values (v_me, p_elo);
    return query select null::uuid, null::uuid, null::uuid;
  end if;
end;
$$;

grant execute on function public.find_or_create_match(integer) to authenticated;
