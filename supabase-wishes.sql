-- The wishing well: wishes thrown in by visitors.
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Visitors can read approved wishes and add new ones (nothing else). No names or other details are saved.
-- To hide a wish later, set its "approved" to false in Table Editor (or delete the row).

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body text not null check (char_length(body) between 1 and 120),
  approved boolean not null default true
);

alter table public.wishes enable row level security;

drop policy if exists "read approved wishes" on public.wishes;
create policy "read approved wishes" on public.wishes
  for select to anon using (approved = true);

drop policy if exists "add a wish" on public.wishes;
create policy "add a wish" on public.wishes
  for insert to anon with check (approved = true and char_length(body) between 1 and 120);

grant select, insert on public.wishes to anon;
