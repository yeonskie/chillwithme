-- ============================================================================
-- Threads on the community board: reply to a reply
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- Run supabase-community-replies.sql first if you haven't. It's safe to run again.
-- Until you run it, replies keep working as before (just no "reply" under each reply).
-- ============================================================================

-- a reply can point at another reply (its "parent"). Empty = a reply straight to the post.
-- Deleting a reply deletes the replies under it too.
alter table public.post_replies add column if not exists parent_id uuid references public.post_replies(id) on delete cascade;
create index if not exists post_replies_parent_idx on public.post_replies (parent_id);

-- the rule for adding a reply: same as before, plus: if it's under another reply, that reply has to be on the same post
drop policy if exists "add a reply" on public.post_replies;
create policy "add a reply" on public.post_replies
  for insert to anon, authenticated
  with check (
    approved = true
    and public.reply_count() < 10000
    and (parent_id is null or exists (
      select 1 from public.post_replies p
       where p.id = post_replies.parent_id and p.post_id = post_replies.post_id and p.approved
    ))
  );
