-- Run after 003_matchmaking.sql. Adds the full spell-battle state (gold, owned spells, every
-- transient spell tracker, chat, game log) as one JSON blob per match, so online games can use
-- the complete spell system, not just plain moves.
alter table public.live_matches add column battle_state jsonb;
