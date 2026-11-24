-- CrownDEX media + profile upgrade
-- Run once in Supabase Dashboard > SQL Editor before deploying the matching frontend.
-- 500 MB per video requires a Supabase plan whose GLOBAL file-size limit permits it.

-- Add the creator photo URL without changing any existing profile copy.
alter table public.site_settings
  add column if not exists avatar_url text not null default '';

-- Configure the global and bucket file-size limits in the Supabase Dashboard.
-- See CROWNDEX_PROFESSIONAL_UPDATE.md; SQL cannot raise the plan-level global cap.

-- Allow approved administrators to upload the profile image in addition to work and program media.
drop policy if exists "CDX admins upload studio media" on storage.objects;
create policy "CDX admins upload studio media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portfolio-media'
    and (select public.cdx_is_admin())
    and split_part(name, '/', 1) in ('works', 'programs', 'profile')
  );

-- Shorten only the original default copy. Any custom About text remains untouched.
update public.site_settings
set about_intro = 'I’m CrownDEX, an independent AI filmmaker creating cinematic short films, original visual worlds and product visuals.'
where id = 1
  and about_intro = 'I’m CrownDEX, an independent AI filmmaker and visual storyteller. I create cinematic short films, original visual worlds, and product-focused stories that turn a strong concept into something people want to watch.';

update public.site_settings
set about_secondary = 'I shape each project from concept and visual direction through motion, editing and the final cut.'
where id = 1
  and about_secondary = 'For me, AI is a creative medium, not the whole story. I develop the idea, direct the visual language, and refine timing, movement, and sound until the final film feels intentional.';
