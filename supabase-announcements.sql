-- ============================================================================
-- Announcements: the megaphone at the top of the site
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- It's safe to run again.
--
-- To post one: sign in as the owner on the site and tap the + next to "refresh" (or Table Editor > announcements > Insert row).
-- To take one down: untick "active" (or delete the row) in the Table Editor. Newest ones show first.
-- Visitors can only READ active announcements. Only the owner can add or change them.
-- Run supabase-journal.sql first if you haven't (this uses its is_owner() check).
-- ============================================================================

create table if not exists public.announcements (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  title       text not null default '' check (char_length(title) <= 80),
  body        text not null check (char_length(body) between 1 and 4000),   -- the message, with a little formatting (bold, links...)
  active      boolean not null default true
);

-- (if you made the table earlier, the message limit was 600: this makes it 4000 so formatted messages fit)
alter table public.announcements drop constraint if exists announcements_body_check;
alter table public.announcements add constraint announcements_body_check check (char_length(body) between 1 and 4000);

alter table public.announcements enable row level security;

drop policy if exists "read active announcements" on public.announcements;
create policy "read active announcements" on public.announcements
  for select to anon, authenticated using (active = true);

drop policy if exists "owner adds announcements"    on public.announcements;
drop policy if exists "owner edits announcements"   on public.announcements;
drop policy if exists "owner deletes announcements" on public.announcements;
drop policy if exists "owner reads all announcements" on public.announcements;
create policy "owner adds announcements"    on public.announcements for insert to authenticated with check (public.is_owner());
create policy "owner edits announcements"   on public.announcements for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes announcements" on public.announcements for delete to authenticated using (public.is_owner());
create policy "owner reads all announcements" on public.announcements for select to authenticated using (public.is_owner());

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- a first one to try (delete or untick it when you're done looking):
-- insert into public.announcements (title, body) values ('hello!', 'a megaphone for news from yeon. check back here for updates.');

-- ----------------------------------------------------------------------------
-- Reactions: visitors can tap a heart, smile, star or sad face (the same as the community board) on an announcement (once each per browser, tap again to undo).
-- No sign-in needed: each browser has a random id. Safe to run again.
-- ----------------------------------------------------------------------------
create table if not exists public.announcement_reactions (
  ann_id     bigint not null references public.announcements(id) on delete cascade,
  kind       text   not null,
  client     text   not null check (char_length(client) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (ann_id, kind, client)
);
-- (the reactions are the same four as the community board: heart / smile / star / sad. this also tidies up the first version, which had thumbs and party)
alter table public.announcement_reactions drop constraint if exists announcement_reactions_kind_check;
delete from public.announcement_reactions where kind not in ('heart', 'smile', 'star', 'sad');
alter table public.announcement_reactions add constraint announcement_reactions_kind_check check (kind in ('heart', 'smile', 'star', 'sad'));
alter table public.announcement_reactions enable row level security;
revoke all on public.announcement_reactions from anon, authenticated;   -- (only the two functions below touch it)

create or replace function public.ann_react(p_ann bigint, p_kind text, p_client text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('heart', 'smile', 'star', 'sad') or p_client is null or char_length(p_client) not between 8 and 64 then return; end if;
  if coalesce(p_on, false) then
    insert into public.announcement_reactions (ann_id, kind, client)
    select a.id, p_kind, p_client from public.announcements a where a.id = p_ann and a.active
    on conflict do nothing;
  else
    delete from public.announcement_reactions where ann_id = p_ann and kind = p_kind and client = p_client;
  end if;
end $$;

-- every announcement's counts, plus which ones are mine
create or replace function public.ann_reactions(p_client text) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('ann', t.ann_id, 'kind', t.kind, 'n', t.n, 'mine', t.mine)), '[]'::jsonb)
  from (select ann_id, kind, count(*) as n, coalesce(bool_or(client = p_client), false) as mine
          from public.announcement_reactions group by ann_id, kind) t;
$$;

revoke all on function public.ann_react(bigint, text, text, boolean), public.ann_reactions(text) from public;
grant execute on function public.ann_react(bigint, text, text, boolean), public.ann_reactions(text) to anon, authenticated;
