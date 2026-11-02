-- ============================================================================
-- Polls and pinned posts on the community page
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- It's safe to run again. Run supabase-journal.sql first if you haven't (this uses its is_owner() check).
--
-- Only the owner can make, end or delete a poll or pin a post (sign in as the owner on the site, then tap "+ new poll" on the community page).
-- Visitors can vote once per browser, and change their vote any time until the poll ends.
-- The results only come back from the database after you've voted (or once the poll has ended), so they can't be peeked at early.
-- ============================================================================

create table if not exists public.polls (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  question    text  not null check (char_length(question) between 1 and 140),
  options     jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),   -- a list of 2 to 6 short texts
  ends_at     timestamptz,                                      -- empty = no end date
  active      boolean not null default true                     -- untick to hide a poll without deleting it
);

-- (an optional explanation under the question: added later, so this is safe to run on a table you already made)
alter table public.polls add column if not exists description text not null default '';
alter table public.polls drop constraint if exists polls_description_check;
alter table public.polls add constraint polls_description_check check (char_length(description) <= 600);

alter table public.polls enable row level security;

drop policy if exists "read active polls"   on public.polls;
drop policy if exists "owner adds polls"    on public.polls;
drop policy if exists "owner edits polls"   on public.polls;
drop policy if exists "owner deletes polls" on public.polls;
drop policy if exists "owner reads all polls" on public.polls;
create policy "read active polls"     on public.polls for select to anon, authenticated using (active = true);
create policy "owner reads all polls" on public.polls for select to authenticated using (public.is_owner());
create policy "owner adds polls"      on public.polls for insert to authenticated with check (public.is_owner());
create policy "owner edits polls"     on public.polls for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes polls"   on public.polls for delete to authenticated using (public.is_owner());

grant select on public.polls to anon, authenticated;
grant insert, update, delete on public.polls to authenticated;

-- the votes: one per browser per poll (changing your vote just replaces it). No sign-in: each browser has a random id.
create table if not exists public.poll_votes (
  poll_id    bigint   not null references public.polls(id) on delete cascade,
  client     text     not null check (char_length(client) between 8 and 64),
  choice     smallint not null check (choice between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (poll_id, client)
);
alter table public.poll_votes enable row level security;
revoke all on public.poll_votes from anon, authenticated;   -- (only the two functions below touch it)

-- comments on a poll (like replies on a community post): anyone can add one, no sign-in. The owner can delete them.
create table if not exists public.poll_comments (
  id         bigint generated always as identity primary key,
  poll_id    bigint not null references public.polls(id) on delete cascade,
  created_at timestamptz not null default now(),
  name       text   not null default '' check (char_length(name) <= 24),
  body       text   not null check (char_length(body) between 1 and 300),
  approved   boolean not null default true               -- untick to hide one without deleting it
);
alter table public.poll_comments enable row level security;
drop policy if exists "read poll comments"   on public.poll_comments;
drop policy if exists "add poll comments"    on public.poll_comments;
drop policy if exists "owner edits poll comments"   on public.poll_comments;
drop policy if exists "owner deletes poll comments" on public.poll_comments;
drop policy if exists "owner reads all poll comments" on public.poll_comments;
create policy "read poll comments"   on public.poll_comments for select to anon, authenticated using (approved = true);
create policy "owner reads all poll comments" on public.poll_comments for select to authenticated using (public.is_owner());
create policy "add poll comments"    on public.poll_comments for insert to anon, authenticated with check (approved = true and exists (select 1 from public.polls p where p.id = poll_id and p.active));
create policy "owner edits poll comments"   on public.poll_comments for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes poll comments" on public.poll_comments for delete to authenticated using (public.is_owner());
revoke all on public.poll_comments from anon, authenticated;
grant select on public.poll_comments to anon, authenticated;
grant insert (poll_id, name, body) on public.poll_comments to anon, authenticated;   -- (visitors can only fill in these three)
grant update, delete on public.poll_comments to authenticated;
grant usage on sequence public.poll_comments_id_seq to anon, authenticated;

-- vote (or change your vote). Does nothing if the poll has ended, is hidden, or the choice doesn't exist.
create or replace function public.poll_vote(p_poll bigint, p_client text, p_choice int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_client is null or char_length(p_client) not between 8 and 64 or p_choice is null then return; end if;
  if not exists (
    select 1 from public.polls p
     where p.id = p_poll and p.active
       and (p.ends_at is null or p.ends_at > now())
       and p_choice between 0 and jsonb_array_length(p.options) - 1
  ) then return; end if;
  insert into public.poll_votes (poll_id, client, choice) values (p_poll, p_client, p_choice)
  on conflict (poll_id, client) do update set choice = excluded.choice, created_at = now();
end $$;

-- for every shown poll: which choice is mine (or null), and the counts (only if I've voted or the poll has ended; otherwise null)
create or replace function public.poll_results(p_client text) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'mine', x.mine, 'comments', x.ncomments, 'counts', case when x.mine is not null or x.ended then x.counts end) order by x.id), '[]'::jsonb)
  from (
    select p.id,
           (select v.choice from public.poll_votes v where v.poll_id = p.id and v.client = p_client) as mine,
           (p.ends_at is not null and p.ends_at <= now()) as ended,
           (select count(*) from public.poll_comments c where c.poll_id = p.id and c.approved) as ncomments,
           (select jsonb_agg(coalesce(c.n, 0) order by g.i)
              from generate_series(0, jsonb_array_length(p.options) - 1) as g(i)
              left join (select choice, count(*) as n from public.poll_votes where poll_id = p.id group by choice) c on c.choice = g.i) as counts
      from public.polls p
     where p.active
  ) x;
$$;

revoke all on function public.poll_vote(bigint, text, int), public.poll_results(text) from public;
grant execute on function public.poll_vote(bigint, text, int), public.poll_results(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Pinned posts: up to 3 at a time, shown in a row at the top of the community page (click one to read all of it).
-- The owner pins one with the "pin" button on an opened post (next to "+ add reply"), and unpins it the same way (or with the "unpin" button next to it at the top).
-- ----------------------------------------------------------------------------
create table if not exists public.pinned_posts (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  title       text not null check (char_length(title) between 1 and 80),
  body        text not null default '' check (char_length(body) <= 2000),
  active      boolean not null default true           -- untick to unpin without deleting
);
-- (a pinned post is a copy of a community post, pinned from the post itself: its text, its photo if it has one, who wrote it, and which post it was)
alter table public.pinned_posts add column if not exists post_id   text;
alter table public.pinned_posts add column if not exists image_url text;
alter table public.pinned_posts add column if not exists author    text;
-- (a poll can be pinned too: it shows as one of the slim rows, and opens as the full poll. deleting the poll removes its pin)
alter table public.pinned_posts add column if not exists poll_id   bigint references public.polls(id) on delete cascade;
alter table public.pinned_posts enable row level security;

drop policy if exists "read active pins"     on public.pinned_posts;
drop policy if exists "owner reads all pins" on public.pinned_posts;
drop policy if exists "owner adds pins"      on public.pinned_posts;
drop policy if exists "owner edits pins"     on public.pinned_posts;
drop policy if exists "owner deletes pins"   on public.pinned_posts;
create policy "read active pins"     on public.pinned_posts for select to anon, authenticated using (active = true);
create policy "owner reads all pins" on public.pinned_posts for select to authenticated using (public.is_owner());
create policy "owner adds pins"      on public.pinned_posts for insert to authenticated with check (public.is_owner());
create policy "owner edits pins"     on public.pinned_posts for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes pins"   on public.pinned_posts for delete to authenticated using (public.is_owner());
grant select on public.pinned_posts to anon, authenticated;
grant insert, update, delete on public.pinned_posts to authenticated;

-- the database itself keeps it to 3 pinned at a time
create or replace function public.pins_limit() returns trigger
language plpgsql as $$
begin
  if new.active and (select count(*) from public.pinned_posts where active and id is distinct from new.id) >= 3 then
    raise exception 'only 3 pinned posts at a time. unpin one first.';
  end if;
  return new;
end $$;
drop trigger if exists pins_limit_trg on public.pinned_posts;
create trigger pins_limit_trg before insert or update on public.pinned_posts for each row execute function public.pins_limit();
