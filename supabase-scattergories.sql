-- ============================================================================
-- Multiplayer scattergories: rooms and players
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- It's safe to run again.
--
-- Anyone who opens the game can make or join a room (no login needed), so these two
-- tables are open to the public on purpose. They only hold throwaway game data
-- (a room code, nicknames and answers). A room closes once nobody has been in it for 5 minutes
-- (and any room older than a day is cleaned up too).
-- ============================================================================

create table if not exists public.sg_rooms (
  code        text primary key check (code ~ '^[A-Z0-9]{4,6}$'),
  created_at  timestamptz not null default now(),
  host_id     text not null check (char_length(host_id) <= 60),
  status      text not null default 'lobby' check (status in ('lobby', 'playing', 'reveal', 'done')),
  round       int  not null default 0,
  rounds      int  not null default 3 check (rounds between 1 and 10),
  round_secs  int  not null default 90 check (round_secs between 20 and 300),
  letter      text not null default '' check (char_length(letter) <= 1),
  used        text not null default '' check (char_length(used) <= 30),         -- letters already used
  categories  text[] not null default '{}' check (cardinality(categories) <= 16),
  ends_at     timestamptz,                                                       -- when the round's timer runs out
  vetoes      jsonb not null default '{}'::jsonb                                 -- answers the host threw out
);

-- when someone was last in the room (every player's game pings it every 10 seconds)
alter table public.sg_rooms add column if not exists last_active timestamptz not null default now();

create table if not exists public.sg_players (
  room       text not null references public.sg_rooms(code) on delete cascade,
  id         text not null check (char_length(id) <= 60),
  name       text not null check (char_length(name) between 1 and 20),
  joined_at  timestamptz not null default now(),
  seen_at    timestamptz not null default now(),
  answers    jsonb not null default '{}'::jsonb,                                 -- { "1": ["...", "..."], "2": [...] }
  primary key (room, id)
);

alter table public.sg_rooms   enable row level security;
alter table public.sg_players enable row level security;

drop policy if exists "sg rooms open"   on public.sg_rooms;
drop policy if exists "sg players open" on public.sg_players;
create policy "sg rooms open"   on public.sg_rooms   for all to anon, authenticated using (true) with check (true);
create policy "sg players open" on public.sg_players for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.sg_rooms   to anon, authenticated;
grant select, insert, update, delete on public.sg_players to anon, authenticated;

-- closing time: a room goes once nobody has been in it for 5 minutes (players go with it), and anything older than a day goes too.
-- The game calls this whenever someone makes or joins a room. The schedule at the very bottom also runs it every minute by itself.
create or replace function public.sg_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.sg_rooms
   where last_active < now() - interval '5 minutes'
      or created_at  < now() - interval '1 day';
$$;
grant execute on function public.sg_cleanup() to anon, authenticated;

-- ---------- helpers the game calls (they use the database's own clock, so everyone's timer agrees) ----------

-- everything about a room in one go, plus the database's current time
create or replace function public.sg_state(p_code text) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'now',     now(),
    'room',    (select to_jsonb(r) from public.sg_rooms r where r.code = p_code),
    'players', (select coalesce(jsonb_agg(to_jsonb(p) order by p.joined_at, p.id), '[]'::jsonb)
                from public.sg_players p where p.room = p_code)
  );
$$;

-- starts a round and its timer
create or replace function public.sg_start_round(p_code text, p_round int, p_letter text, p_used text, p_secs int) returns void
language sql as $$
  update public.sg_rooms
     set status = 'playing', round = p_round, letter = p_letter, used = p_used,
         ends_at = now() + make_interval(secs => p_secs)
   where code = p_code;
$$;

-- someone hit "i'm done": everyone gets p_secs more seconds at most (never makes the round longer)
create or replace function public.sg_stop(p_code text, p_secs int) returns void
language sql as $$
  update public.sg_rooms
     set ends_at = now() + make_interval(secs => p_secs)
   where code = p_code and status = 'playing'
     and (ends_at is null or ends_at > now() + make_interval(secs => p_secs));
$$;

-- time's up: move on to checking answers (waits a moment so everyone's answers have arrived)
create or replace function public.sg_to_reveal(p_code text) returns void
language sql as $$
  update public.sg_rooms set status = 'reveal'
   where code = p_code and status = 'playing' and ends_at + interval '2.5 seconds' < now();
$$;

-- "i'm still here": keeps the player AND the room alive
create or replace function public.sg_ping(p_code text, p_id text) returns void
language sql as $$
  update public.sg_players set seen_at = now() where room = p_code and id = p_id;
  update public.sg_rooms   set last_active = now() where code = p_code;
$$;

grant execute on function public.sg_state(text), public.sg_start_round(text, int, text, text, int),
  public.sg_stop(text, int), public.sg_to_reveal(text), public.sg_ping(text, text) to anon, authenticated;

-- ---------- close empty rooms by themselves (every minute) ----------
-- This uses Supabase's built-in scheduler (pg_cron). If it isn't switched on yet, this part is skipped and
-- rooms still close whenever anyone makes or joins a room. To switch it on: Database > Extensions > pg_cron, then run this file again.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'sg-close-empty-rooms';
    perform cron.schedule('sg-close-empty-rooms', '* * * * *', 'select public.sg_cleanup()');
  end if;
exception when others then
  raise notice 'pg_cron not set up (%): rooms will still close when anyone makes or joins a room.', sqlerrm;
end $$;
