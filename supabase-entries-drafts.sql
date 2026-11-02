-- ============================================================================
-- Thoughts to consume: drafts
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run. It's safe to run again.
--
-- Adds a "draft" switch to the entries table. A draft is saved online but only YOU can see it (when you're signed in):
-- visitors never get it. Publishing a draft just means saving it again as a normal entry.
-- This also sets the table's rules again so they're known and in one place:
--   * visitors can read published entries only
--   * the owner can read everything, and add, change and delete entries
-- (run supabase-journal.sql first if you haven't: it makes the entries table and the is_owner() check this uses)
-- ============================================================================

alter table public.entries add column if not exists draft boolean not null default false;

alter table public.entries enable row level security;

-- clear out the old rules on this table, then make them again
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'entries' loop
    execute format('drop policy %I on public.entries', p.policyname);
  end loop;
end $$;

create policy "read published entries" on public.entries for select to anon, authenticated using (draft = false);
create policy "owner reads all entries" on public.entries for select to authenticated using (public.is_owner());
create policy "owner adds entries"      on public.entries for insert to authenticated with check (public.is_owner());
create policy "owner edits entries"     on public.entries for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes entries"   on public.entries for delete to authenticated using (public.is_owner());

grant select on public.entries to anon, authenticated;
grant insert, update, delete on public.entries to authenticated;
