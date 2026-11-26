-- CrownDEX Website Content CMS (additive migration)
-- Run in Supabase Dashboard > SQL Editor after the source update is installed.
-- Safe to rerun. Does not replace existing tables, auth, or RLS.

create table if not exists public.site_content (
  id integer primary key default 1,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_content_singleton check (id = 1)
);

alter table public.site_content enable row level security;

-- Make each portfolio project's title, description, category, video and cover editable in Admin Studio.
alter table public.portfolio_works
  add column if not exists description text not null default '';

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "Public can view CrownDEX website content" on public.site_content;
create policy "Public can view CrownDEX website content" on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage CrownDEX website content" on public.site_content;
create policy "Admins manage CrownDEX website content" on public.site_content
  for all to authenticated using ((select public.cdx_is_admin()))
  with check ((select public.cdx_is_admin()));

insert into public.site_content (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Allow approved admins to upload website images to portfolio-media/site/.
-- Existing video/image size limits and allowed MIME types remain unchanged.
drop policy if exists "CDX admins upload studio media" on storage.objects;
create policy "CDX admins upload studio media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portfolio-media'
    and (select public.cdx_is_admin())
    and split_part(name, '/', 1) in ('works', 'programs', 'profile', 'site')
  );

-- Existing public bucket-read policy and admin update/delete policies are retained.
