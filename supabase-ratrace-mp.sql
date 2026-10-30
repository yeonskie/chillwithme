-- ============================================================================
-- Rat race multiplayer: rooms, bets, and who won
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run. It's safe to run again.
-- (No login and no "anonymous sign-ins" needed: it works like the scattergories rooms.)
--
-- How it works
--   * one person makes a room (a 4-letter code). friends join with the code.
--   * everyone picks a rat (like the single player pick screen) and puts a bet down. the bets make the pot.
--   * the host starts the race. everybody runs the same obstacle course at the same time and sees each other's rats
--     (that live part goes through Supabase Realtime "broadcast", not these tables).
--   * the first to cross the flag takes the WHOLE pot. This file keeps track of who crossed and when, and decides:
--       - if two cross within 1.5 seconds of each other, the faster time wins
--       - if everybody runs out of puffs (or leaves), everybody's bet comes back
--   * yeonbucks stay in each browser like the rest of the site: the game takes a bet off your balance when you place it and
--     adds your payout when the race is decided. This is for fun, so nothing stops someone editing their own balance.
--   * a room closes after 5 minutes with nobody in it.
--
-- If you ran an earlier version of this file, this removes its tables and functions first.
-- ============================================================================

-- ---------- clear out the old versions, if they were ever run ----------
drop table if exists public.rrm_players cascade;
drop table if exists public.rrm_rooms   cascade;
drop table if exists public.rr_players  cascade;
drop table if exists public.rr_rooms    cascade;
drop table if exists public.rr_wallets  cascade;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and (p.proname like 'rrm\_%' or p.proname in ('rr_cfg','rr_wallet','rr_me','rr_set_name','rr_deposit','rr_withdraw',
                  'rr_make_code','rr_restore','rr_roll_rats','rr_drop_player','rr_cleanup','rr_create','rr_join','rr_leave','rr_pick','rr_start','rr_next','rr_state')) loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;

-- ---------- the tables ----------
create table public.rrm_rooms (
  code          text primary key check (code ~ '^[A-Z]{4}$'),
  created_at    timestamptz not null default now(),
  last_active   timestamptz not null default now(),
  host          text not null,
  status        text not null default 'lobby' check (status in ('lobby', 'racing', 'done')),
  round         int  not null default 1,
  seed          int,                                                     -- everybody's course is made from this, so it's the same for everyone
  race_at       timestamptz,                                             -- when the race starts (after the countdown)
  first_fin_at  timestamptz,                                             -- when the first rat reported crossing the flag
  winner        text,                                                    -- the winning player's pid (null: nobody won, bets came back)
  pot           bigint not null default 0
);

create table public.rrm_players (
  room        text not null references public.rrm_rooms(code) on delete cascade,
  id          text not null check (char_length(id) between 4 and 60),    -- this browser's id (made by the game, never shown to anyone)
  pid         text not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),   -- the id other players see
  name        text not null check (char_length(name) between 1 and 20),
  joined_at   timestamptz not null default now(),
  seen_at     timestamptz not null default now(),
  rat_name    text check (char_length(rat_name) <= 20),
  coat        text check (coat in ('grey', 'white', 'black')),
  bet         bigint not null default 0 check (bet >= 0),
  fin_time    numeric,                                                   -- seconds to cross the flag (null: hasn't)
  out         boolean not null default false,                            -- ran out of puffs
  payout      bigint not null default 0,
  go          boolean not null default false,                           -- pressed "i'm ready" (everyone but the host does this before the race can start)
  paid_round  int,                                                       -- the round the last payout was for
  paid        bigint not null default 0,                                 -- ...and how much it was (kept after "next race" so a late browser can still collect)
  primary key (room, id)
);

-- everything goes through the functions below
alter table public.rrm_rooms   enable row level security;
alter table public.rrm_players enable row level security;
revoke all on public.rrm_rooms, public.rrm_players from public, anon, authenticated;

-- ---------- the numbers to play with ----------
create or replace function public.rrm_cfg(k text) returns bigint language sql immutable as $$
  select case k
    when 'min_bet'     then 50
    when 'max_bet'     then 100000
    when 'max_players' then 6
    when 'countdown'   then 8        -- seconds from "start" to the race starting (everyone's screen needs time to get ready)
    when 'idle_player' then 90       -- seconds quiet before a player is dropped from a room that isn't racing
    when 'host_away'   then 30       -- seconds quiet before anyone can start the race for the host
    when 'stale'       then 25       -- seconds quiet before a racing player counts as gone
  end;
$$;

create or replace function public.rrm_drop_player(p_room text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rrm_rooms;
begin
  select * into r from public.rrm_rooms where code = p_room;
  if not found then return; end if;
  delete from public.rrm_players where room = p_room and id = p_id;
  if not exists (select 1 from public.rrm_players where room = p_room) then
    delete from public.rrm_rooms where code = p_room;
  elsif r.host = p_id then
    update public.rrm_rooms set host = (select id from public.rrm_players where room = p_room order by joined_at, id limit 1) where code = p_room;
  end if;
end $$;

-- closing time: a room goes once nobody has been in it for 5 minutes, and anything older than a day goes too
create or replace function public.rrm_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.rrm_rooms where last_active < now() - interval '5 minutes' or created_at < now() - interval '1 day';
$$;

create or replace function public.rrm_create(p_id text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare c text; n int := 0; nm text;
begin
  perform public.rrm_cleanup();
  nm := left(btrim(coalesce(p_name, '')), 20);
  if nm = '' then nm := 'player'; end if;
  delete from public.rrm_players where id = p_id;                         -- (one room at a time)
  loop
    c := '';
    for i in 1..4 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1); end loop;
    exit when not exists (select 1 from public.rrm_rooms where code = c);
    n := n + 1; if n > 50 then raise exception 'try again'; end if;
  end loop;
  insert into public.rrm_rooms (code, host) values (c, p_id);
  insert into public.rrm_players (room, id, name) values (c, p_id, nm);
  return c;
end $$;

create or replace function public.rrm_join(p_id text, p_code text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(coalesce(p_code, ''))); nm text; r public.rrm_rooms;
begin
  perform public.rrm_cleanup();
  select * into r from public.rrm_rooms where code = c;
  if not found then raise exception 'no room with that code'; end if;
  if exists (select 1 from public.rrm_players where room = c and id = p_id) then return c; end if;
  if (select count(*) from public.rrm_players where room = c) >= public.rrm_cfg('max_players') then raise exception 'that room is full'; end if;
  nm := left(btrim(coalesce(p_name, '')), 20);
  if nm = '' then nm := 'player'; end if;
  delete from public.rrm_players where id = p_id;
  insert into public.rrm_players (room, id, name) values (c, p_id, nm);
  update public.rrm_rooms set last_active = now() where code = c;
  return c;
end $$;

create or replace function public.rrm_leave(p_id text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.rrm_drop_player(upper(btrim(p_code)), p_id);
end $$;

-- pick a rat and a bet (a bet of 0 takes it back). The game takes the yeonbucks off the browser's balance itself.
create or replace function public.rrm_pick(p_id text, p_code text, p_rat_name text, p_coat text, p_bet bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(p_code)); r public.rrm_rooms;
begin
  select * into r from public.rrm_rooms where code = c for update;
  if not found then raise exception 'that room is gone'; end if;
  if r.status <> 'lobby' then raise exception 'the race has already started'; end if;
  if not exists (select 1 from public.rrm_players where room = c and id = p_id) then raise exception 'you''re not in this room'; end if;
  if p_bet is null or p_bet <= 0 or p_rat_name is null then
    update public.rrm_players set rat_name = null, coat = null, bet = 0, go = false where room = c and id = p_id;
  else
    if p_bet < public.rrm_cfg('min_bet') or p_bet > public.rrm_cfg('max_bet') then
      raise exception 'bets are % to %', public.rrm_cfg('min_bet'), public.rrm_cfg('max_bet');
    end if;
    if p_coat not in ('grey', 'white', 'black') then raise exception 'pick a rat'; end if;
    update public.rrm_players set rat_name = left(btrim(p_rat_name), 20), coat = p_coat, bet = p_bet, go = false where room = c and id = p_id;
  end if;
  update public.rrm_rooms set last_active = now() where code = c;
end $$;

-- "i'm ready" (or take it back)
create or replace function public.rrm_go(p_id text, p_code text, p_go boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(p_code));
begin
  update public.rrm_players set go = coalesce(p_go, false) and bet > 0 and rat_name is not null, seen_at = now()
   where room = c and id = p_id and exists (select 1 from public.rrm_rooms where code = c and status = 'lobby');
end $$;

-- the host starts the race
create or replace function public.rrm_start(p_id text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(p_code)); r public.rrm_rooms; hseen timestamptz; n int; v_pot bigint;
begin
  select * into r from public.rrm_rooms where code = c for update;
  if not found then raise exception 'that room is gone'; end if;
  if r.status <> 'lobby' then raise exception 'the race has already started'; end if;
  if not exists (select 1 from public.rrm_players where room = c and id = p_id) then raise exception 'you''re not in this room'; end if;
  select seen_at into hseen from public.rrm_players where room = c and id = r.host;
  if r.host <> p_id and coalesce(hseen, '-infinity') > now() - make_interval(secs => public.rrm_cfg('host_away')) then
    raise exception 'only the host can start the race';
  end if;
  select count(*), coalesce(sum(bet), 0) into n, v_pot from public.rrm_players where room = c and bet > 0 and rat_name is not null;
  if n < 2 then raise exception 'at least 2 players need a rat and a bet'; end if;
  if exists (select 1 from public.rrm_players where room = c and bet > 0 and rat_name is not null and not go and id <> p_id and id <> r.host) then
    raise exception 'waiting for everyone to press i''m ready';
  end if;
  update public.rrm_players set fin_time = null, out = false, payout = 0, seen_at = now() where room = c;
  update public.rrm_rooms set status = 'racing', seed = floor(random() * 2000000000)::int, pot = v_pot,
         race_at = now() + make_interval(secs => public.rrm_cfg('countdown')), first_fin_at = null, winner = null, last_active = now()
   where code = c;
end $$;

-- "i crossed the flag" (p_out false) or "i ran out of puffs" (p_out true)
create or replace function public.rrm_finish(p_id text, p_code text, p_time numeric, p_out boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(p_code)); r public.rrm_rooms;
begin
  select * into r from public.rrm_rooms where code = c for update;
  if not found or r.status <> 'racing' then return; end if;
  if not exists (select 1 from public.rrm_players where room = c and id = p_id and bet > 0 and rat_name is not null) then return; end if;
  if coalesce(p_out, false) then
    update public.rrm_players set out = true where room = c and id = p_id and fin_time is null;
  else
    update public.rrm_players set fin_time = greatest(5, least(300, coalesce(p_time, 300))) where room = c and id = p_id and fin_time is null and not out;
    update public.rrm_rooms set first_fin_at = coalesce(first_fin_at, now()) where code = c;
  end if;
  update public.rrm_players set seen_at = now() where room = c and id = p_id;
end $$;

-- works out who won once it can (the state call runs this)
create or replace function public.rrm_settle(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rrm_rooms; win text; refund boolean := false;
begin
  select * into r from public.rrm_rooms where code = p_code for update;
  if not found or r.status <> 'racing' then return; end if;
  if r.first_fin_at is not null
     and (now() >= r.first_fin_at + interval '1.5 seconds'
          or not exists (select 1 from public.rrm_players where room = p_code and bet > 0 and rat_name is not null and fin_time is null and not out
                           and seen_at >= now() - make_interval(secs => public.rrm_cfg('stale')))) then
    select pid into win from public.rrm_players where room = p_code and fin_time is not null order by fin_time, joined_at limit 1;
  elsif r.first_fin_at is null and r.race_at + interval '8 seconds' < now()
        and not exists (select 1 from public.rrm_players where room = p_code and bet > 0 and rat_name is not null and fin_time is null and not out
                         and seen_at >= now() - make_interval(secs => public.rrm_cfg('stale'))) then
    refund := true;                                  -- everybody ran out of puffs (or left): nobody wins
  elsif r.race_at + interval '4 minutes' < now() then
    refund := true;
  else
    return;
  end if;
  if refund then
    update public.rrm_players set payout = bet where room = p_code and bet > 0 and rat_name is not null;
  else
    update public.rrm_players set payout = case when pid = win then r.pot else 0 end where room = p_code and bet > 0 and rat_name is not null;
  end if;
  update public.rrm_players set paid_round = r.round, paid = payout where room = p_code and bet > 0 and rat_name is not null;
  update public.rrm_rooms set status = 'done', winner = case when refund then null else win end where code = p_code;
end $$;

-- everyone gets ready for the next race (bets and rats cleared)
create or replace function public.rrm_next(p_id text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(p_code)); r public.rrm_rooms;
begin
  select * into r from public.rrm_rooms where code = c for update;
  if not found then raise exception 'that room is gone'; end if;
  if not exists (select 1 from public.rrm_players where room = c and id = p_id) then raise exception 'you''re not in this room'; end if;
  if r.status <> 'done' then return; end if;
  update public.rrm_players set rat_name = null, coat = null, bet = 0, go = false, fin_time = null, out = false, payout = 0 where room = c;
  update public.rrm_rooms set status = 'lobby', round = round + 1, seed = null, race_at = null, first_fin_at = null, winner = null, pot = 0, last_active = now()
   where code = c;
end $$;

-- everything about a room in one go (the game calls this every second or so; it also counts as "i'm still here")
create or replace function public.rrm_state(p_id text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(p_code)); r public.rrm_rooms; stale record;
begin
  select * into r from public.rrm_rooms where code = c;
  if not found then return jsonb_build_object('now', now(), 'room', null); end if;
  update public.rrm_players set seen_at = now() where room = c and id = p_id;
  if found then update public.rrm_rooms set last_active = now() where code = c; end if;
  perform public.rrm_settle(c);
  -- drop players who went quiet while nothing is racing
  if r.status <> 'racing' then
    for stale in select id from public.rrm_players where room = c and seen_at < now() - make_interval(secs => public.rrm_cfg('idle_player')) and id <> p_id loop
      perform public.rrm_drop_player(c, stale.id);
    end loop;
  end if;
  select * into r from public.rrm_rooms where code = c;
  if not found then return jsonb_build_object('now', now(), 'room', null); end if;
  return jsonb_build_object(
    'now', now(),
    'room', jsonb_build_object('code', r.code, 'status', r.status, 'round', r.round, 'seed', r.seed, 'race_at', r.race_at,
                               'winner', r.winner, 'pot', r.pot,
                               'pot_now', (select coalesce(sum(bet), 0) from public.rrm_players where room = c and rat_name is not null)),
    'players', (select coalesce(jsonb_agg(jsonb_build_object('pid', p.pid, 'name', p.name, 'rat_name', p.rat_name, 'coat', p.coat, 'bet', p.bet,
                  'ready', p.bet > 0 and p.rat_name is not null, 'go', p.go, 'fin_time', p.fin_time, 'out', p.out, 'payout', p.payout,
                  'paid_round', p.paid_round, 'paid', p.paid, 'me', p.id = p_id, 'host', p.id = r.host) order by p.joined_at, p.id), '[]'::jsonb)
                from public.rrm_players p where p.room = c));
end $$;

revoke all on function public.rrm_cfg(text), public.rrm_drop_player(text, text), public.rrm_cleanup(), public.rrm_settle(text),
  public.rrm_create(text, text), public.rrm_join(text, text, text), public.rrm_leave(text, text), public.rrm_pick(text, text, text, text, bigint), public.rrm_go(text, text, boolean),
  public.rrm_start(text, text), public.rrm_finish(text, text, numeric, boolean), public.rrm_next(text, text), public.rrm_state(text, text) from public;
grant execute on function public.rrm_create(text, text), public.rrm_join(text, text, text), public.rrm_leave(text, text),
  public.rrm_pick(text, text, text, text, bigint), public.rrm_go(text, text, boolean), public.rrm_start(text, text), public.rrm_finish(text, text, numeric, boolean),
  public.rrm_next(text, text), public.rrm_state(text, text) to anon, authenticated;

-- ---------- close empty rooms by themselves (every minute), if pg_cron is switched on ----------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname in ('rr-close-empty-rooms', 'rrm-close-empty-rooms');
    perform cron.schedule('rrm-close-empty-rooms', '* * * * *', 'select public.rrm_cleanup()');
  end if;
exception when others then
  raise notice 'pg_cron not set up (%): rooms still close whenever anyone makes or joins a room.', sqlerrm;
end $$;
