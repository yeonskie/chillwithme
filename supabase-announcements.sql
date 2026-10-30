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
