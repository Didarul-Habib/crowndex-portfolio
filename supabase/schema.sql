-- CROWNDEX V4 / SIGNAL STUDIO - Supabase schema
-- Run once in Supabase Dashboard > SQL Editor. Safe to rerun.
-- Never place a service_role/secret key in Vite or Netlify environment variables.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
drop policy if exists "Admin can view their own membership" on public.admin_users;
create policy "Admin can view their own membership" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- SECURITY DEFINER checks this private allowlist. No client can add themselves.
create or replace function public.cdx_is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.cdx_is_admin() from public;
grant execute on function public.cdx_is_admin() to anon, authenticated;

create table if not exists public.portfolio_works (
  id text primary key,
  title text not null default '',
  category text not null default 'AI Creations',
  url text not null default '',
  video_url text not null default '',
  thumbnail text not null default '',
  featured boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_source_present check (length(url)>0 or length(video_url)>0),
  constraint work_x_url_safe check (url = '' or url ~* '^https://(www\.)?(x|twitter)\.com/[A-Za-z0-9_]+/status/[0-9]+/?$'),
  constraint work_video_url_safe check (video_url = '' or video_url ~* '^https://'),
  constraint work_thumbnail_safe check (thumbnail = '' or thumbnail ~* '^https://' or thumbnail like '/assets/%')
);

create table if not exists public.creator_programs (
  id text primary key,
  name text not null,
  role text not null default '',
  description text not null default '',
  url text not null default '',
  logo_url text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint creator_program_https_url check (url = '' or url ~* '^https://'),
  constraint creator_program_logo_url check (logo_url = '' or logo_url ~* '^https://')
);

create table if not exists public.site_settings (
  id integer primary key default 1,
  about_intro text not null default '',
  about_secondary text not null default '',
  x_profile text not null default 'https://x.com/_CrownDEX',
  telegram_url text not null default 'https://t.me/didarul_habib96',
  avatar_url text not null default '',
  constraint one_settings_record check (id = 1)
);

alter table public.portfolio_works enable row level security;
alter table public.creator_programs enable row level security;
alter table public.site_settings enable row level security;

-- Public visitors can read published content; only admins can manage it.
drop policy if exists "View published CrownDEX videos" on public.portfolio_works;
create policy "View published CrownDEX videos" on public.portfolio_works
  for select to anon, authenticated using (published or (select public.cdx_is_admin()));
drop policy if exists "Admins manage CrownDEX videos" on public.portfolio_works;
create policy "Admins manage CrownDEX videos" on public.portfolio_works
  for all to authenticated using ((select public.cdx_is_admin())) with check ((select public.cdx_is_admin()));

drop policy if exists "View public creator programs" on public.creator_programs;
create policy "View public creator programs" on public.creator_programs
  for select to anon, authenticated using (published or (select public.cdx_is_admin()));
drop policy if exists "Admins manage creator programs" on public.creator_programs;
create policy "Admins manage creator programs" on public.creator_programs
  for all to authenticated using ((select public.cdx_is_admin())) with check ((select public.cdx_is_admin()));

drop policy if exists "View public site settings" on public.site_settings;
create policy "View public site settings" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings
  for all to authenticated using ((select public.cdx_is_admin())) with check ((select public.cdx_is_admin()));

-- Seed only the five CrownDEX posts already provided by the owner.
insert into public.portfolio_works
  (id, title, category, url, featured, published, sort_order)
values
  ('crowndex-work-01', '', 'AI Creations', 'https://x.com/_CrownDEX/status/2117452741681524773', true, true, 0),
  ('crowndex-work-02', '', 'AI Creations', 'https://x.com/_CrownDEX/status/2120755268732760469', true, true, 1),
  ('crowndex-work-03', '', 'AI Creations', 'https://x.com/_CrownDEX/status/2121125153199587742', true, true, 2),
  ('crowndex-work-04', '', 'AI Creations', 'https://x.com/_CrownDEX/status/2122185139535183874', false, true, 3),
  ('crowndex-work-05', '', 'AI Creations', 'https://x.com/_CrownDEX/status/2122751079880495356', false, true, 4)
on conflict (id) do nothing;

insert into public.site_settings (id,about_intro,about_secondary)
values (1,
 'I’m CrownDEX, an independent AI filmmaker and visual storyteller. I create cinematic short films, original visual worlds, and product-focused stories that turn a strong concept into something people want to watch.',
 'For me, AI is a creative medium, not the whole story. I develop the idea, direct the visual language, and refine timing, movement, and sound until the final film feels intentional.')
on conflict (id) do nothing;

-- This bucket is PUBLIC-READ for videos/covers shown on the public portfolio,
-- but only an approved administrator may upload, replace or delete files.
insert into storage.buckets as existing_bucket (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-media','portfolio-media',true,52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm'])
on conflict (id) do update set
 public = excluded.public,
 file_size_limit = greatest(existing_bucket.file_size_limit, excluded.file_size_limit),
 allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CDX admins upload studio media" on storage.objects;
create policy "CDX admins upload studio media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portfolio-media'
    and (select public.cdx_is_admin())
    and split_part(name,'/',1) in ('works','programs','profile')
  );

drop policy if exists "CDX admins read media metadata" on storage.objects;
create policy "CDX admins read media metadata" on storage.objects
  for select to authenticated using (
    bucket_id = 'portfolio-media' and (select public.cdx_is_admin())
  );

drop policy if exists "CDX admins update studio media" on storage.objects;
create policy "CDX admins update studio media" on storage.objects
  for update to authenticated using (
    bucket_id = 'portfolio-media' and (select public.cdx_is_admin())
  ) with check (
    bucket_id = 'portfolio-media' and (select public.cdx_is_admin())
  );

drop policy if exists "CDX admins delete studio media" on storage.objects;
create policy "CDX admins delete studio media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'portfolio-media' and (select public.cdx_is_admin())
  );

-- Run the separate supabase/promote_admin.sql AFTER creating an Auth user.
