-- Run this once in the Supabase SQL Editor, after 001_profiles.sql.
-- One row per friend PAIR, in either direction. `status` starts 'pending' (a request) and becomes
-- 'accepted' (real friends) once the addressee accepts. Declining a request or unfriending someone
-- is the same action either way: delete the row.

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (requester_id <> addressee_id)
);

-- Blocks a duplicate/reverse request existing at the same time as an existing one (A->B pending
-- while B->A is also attempted, or requesting someone twice).
create unique index friend_requests_unique_pair_idx
  on public.friend_requests (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friend_requests enable row level security;

create policy "Users can view their own friend requests"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friend_requests for insert
  to authenticated
  with check (auth.uid() = requester_id);

-- Only the addressee can accept, and only while still pending (no re-accepting/tampering).
create policy "Addressee can accept a pending request"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = addressee_id and status = 'pending')
  with check (status = 'accepted');

-- Covers three player actions with one rule: decline an incoming request, cancel an outgoing one,
-- or unfriend an accepted one — all are "either side deletes the row".
create policy "Either side can delete a request or friendship"
  on public.friend_requests for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
