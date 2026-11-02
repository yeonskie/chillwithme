-- ============================================================================
-- Reactions and comments on thoughts to consume (the journal entries)
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- Run supabase-journal.sql first if you haven't (this uses its entries table and is_owner() check). It's safe to run again.
--
-- Anyone can react (heart, smile, star, sad: once each per browser) and comment, with no sign-in.
-- Comments can be replied to (threads). Only the owner can delete a comment. Drafts can't be reacted to or commented on.
-- ============================================================================

-- 1. comments (a comment can sit under another comment: "parent_id")
create table if not exists public.entry_comments (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  parent_id  uuid references public.entry_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  name       text not null default '' check (char_length(name) <= 24),
  body       text not null check (char_length(body) between 1 and 300),
  approved   boolean not null default true               -- untick to hide one without deleting it
);
create index if not exists entry_comments_entry_idx on public.entry_comments (entry_id, created_at);
alter table public.entry_comments enable row level security;

-- a safety cap: once there are 10000 comments, new ones are turned away
create or replace function public.entry_comment_count() returns int
language sql security definer stable set search_path = public as $$ select count(*)::int from public.entry_comments $$;
grant execute on function public.entry_comment_count() to anon, authenticated;

drop policy if exists "read entry comments"   on public.entry_comments;
drop policy if exists "owner reads all entry comments" on public.entry_comments;
drop policy if exists "add an entry comment"  on public.entry_comments;
drop policy if exists "owner edits entry comments"   on public.entry_comments;
drop policy if exists "owner deletes entry comments" on public.entry_comments;
create policy "read entry comments" on public.entry_comments for select to anon, authenticated using (approved = true);
create policy "owner reads all entry comments" on public.entry_comments for select to authenticated using (public.is_owner());
-- (the check for "entries" runs as the visitor, so it can only see entries a visitor can see: published ones, not drafts)
create policy "add an entry comment" on public.entry_comments for insert to anon, authenticated
  with check (
    approved = true
    and public.entry_comment_count() < 10000
    and exists (select 1 from public.entries e where e.id = entry_id)
    and (parent_id is null or exists (
      select 1 from public.entry_comments p
       where p.id = entry_comments.parent_id and p.entry_id = entry_comments.entry_id and p.approved
    ))
  );
create policy "owner edits entry comments"   on public.entry_comments for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes entry comments" on public.entry_comments for delete to authenticated using (public.is_owner());

revoke all on public.entry_comments from anon, authenticated;
grant select on public.entry_comments to anon, authenticated;
grant insert (entry_id, parent_id, name, body) on public.entry_comments to anon, authenticated;   -- (visitors can only fill in these four)
grant update, delete on public.entry_comments to authenticated;

-- 2. reactions: one of each kind per person per entry. People are told apart by the random id their browser makes up
--    (the same one the community board uses), not by anything about them. Only the two functions below touch this table.
create table if not exists public.entry_reactions (
  entry_id   uuid not null references public.entries(id) on delete cascade,
  voter      text not null check (char_length(voter) between 8 and 64),
  kind       text not null check (kind in ('heart', 'smile', 'star', 'sad')),
  created_at timestamptz not null default now(),
  primary key (entry_id, voter, kind)
);
alter table public.entry_reactions enable row level security;
revoke all on public.entry_reactions from anon, authenticated;

create or replace function public.entry_react(p_entry uuid, p_voter text, p_kind text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('heart', 'smile', 'star', 'sad') or char_length(coalesce(p_voter, '')) not between 8 and 64 then
    raise exception 'bad reaction';
  end if;
  if coalesce(p_on, false) then
    -- (drafts are turned away: they only exist for the owner)
    if not exists (select 1 from public.entries e where e.id = p_entry and not coalesce(to_jsonb(e) ->> 'draft' = 'true', false)) then
      raise exception 'no such entry';
    end if;
    insert into public.entry_reactions (entry_id, voter, kind) values (p_entry, p_voter, p_kind) on conflict do nothing;
  else
    delete from public.entry_reactions where entry_id = p_entry and voter = p_voter and kind = p_kind;
  end if;
end $$;

-- for a list of entries: how many comments, how many of each reaction, and which ones this person gave
create or replace function public.entry_stats(p_ids uuid[], p_voter text)
returns table (eid uuid, comments int, reacts jsonb, mine text[])
language sql security definer stable set search_path = public as $$
  select e.id,
    (select count(*)::int from public.entry_comments c where c.entry_id = e.id and c.approved),
    coalesce((select jsonb_object_agg(t.kind, t.n) from (select x.kind, count(*)::int as n from public.entry_reactions x where x.entry_id = e.id group by x.kind) t), '{}'::jsonb),
    coalesce((select array_agg(y.kind) from public.entry_reactions y where y.entry_id = e.id and y.voter = p_voter), '{}'::text[])
  from public.entries e
  where e.id = any(p_ids)
$$;

revoke all on function public.entry_react(uuid, text, text, boolean), public.entry_stats(uuid[], text) from public;
grant execute on function public.entry_react(uuid, text, text, boolean), public.entry_stats(uuid[], text) to anon, authenticated;
