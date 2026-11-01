-- ============================================================================
-- Rat race infinite mode: the leaderboard
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run. It's safe to run again.
-- (No login needed. Each browser has a random id, like the rat race rooms.)
--
-- Players can submit a run after they get a new personal best. Only each player's BEST run is kept (one row each),
-- and a run only replaces an old one if it went farther. The board shows the farthest runs first.
-- Like the rest of the site's games this is for fun: the game runs in the browser, so the server only checks that a run
-- is believable (the distance can't be more than the rat could run in that time) and doesn't try to stop a determined cheater.
-- ============================================================================

create table if not exists public.rrb_runs (
  client     text primary key check (char_length(client) between 8 and 64),
  name       text not null check (char_length(name) between 1 and 20),
  rat        text not null default '' check (char_length(rat) <= 30),
  dist       integer not null check (dist between 1 and 200000),   -- metres
  secs       numeric not null check (secs > 0),                    -- how long the run lasted
  created_at timestamptz not null default now()
);
create index if not exists rrb_runs_dist on public.rrb_runs (dist desc, secs asc);
alter table public.rrb_runs enable row level security;   -- (no policies: the functions below are the only way in or out)

-- submit a run: returns { ok, rank, best } (ok is false when it wasn't a new best for this player)
create or replace function public.rrb_submit(p_id text, p_name text, p_rat text, p_dist integer, p_secs numeric)
returns json language plpgsql security definer set search_path = public as $$
declare nm text := btrim(coalesce(p_name, '')); old integer; rk integer;
begin
  if p_id is null or char_length(p_id) < 8 then raise exception 'bad id'; end if;
  if char_length(nm) < 1 or char_length(nm) > 20 then raise exception 'type a name (up to 20 letters)'; end if;
  if p_dist is null or p_dist < 1 or p_dist > 200000 or p_secs is null or p_secs <= 0 then raise exception 'that run can''t be submitted'; end if;
  -- the fastest the rat can go is about 17 metres a second
  if p_dist > p_secs * 18 + 30 then raise exception 'that run can''t be submitted'; end if;
  select dist into old from rrb_runs where client = p_id;
  if old is not null and old >= p_dist then
    select count(*) + 1 into rk from rrb_runs where dist > old;
    return json_build_object('ok', false, 'rank', rk, 'best', old);
  end if;
  insert into rrb_runs (client, name, rat, dist, secs) values (p_id, nm, left(coalesce(p_rat, ''), 30), p_dist, round(p_secs, 2))
    on conflict (client) do update set name = excluded.name, rat = excluded.rat, dist = excluded.dist, secs = excluded.secs, created_at = now();
  select count(*) + 1 into rk from rrb_runs where dist > p_dist;
  return json_build_object('ok', true, 'rank', rk, 'best', p_dist);
end $$;

-- the top runs (and which row is mine)
create or replace function public.rrb_top(p_id text, p_limit integer default 20)
returns table (name text, rat text, dist integer, secs numeric, me boolean)
language sql security definer set search_path = public as $$
  select r.name, r.rat, r.dist, r.secs, (r.client = p_id) as me
  from rrb_runs r order by r.dist desc, r.secs asc, r.created_at asc limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

grant execute on function public.rrb_submit(text, text, text, integer, numeric), public.rrb_top(text, integer) to anon, authenticated;
