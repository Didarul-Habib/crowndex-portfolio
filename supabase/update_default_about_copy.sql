-- CrownDEX About copy update — safe for already seeded default content.
-- Run in Supabase SQL Editor only if you have connected the backend.
-- Custom About copy will not be overwritten.
update public.site_settings
set about_intro = 'I’m CrownDEX, an independent AI filmmaker and visual storyteller. I create cinematic short films, original visual worlds, and product-focused stories that turn a strong concept into something people want to watch.'
where id = 1 and about_intro = 'I’m CrownDEX — an independent AI video creator exploring the space between imagination and cinema. I build short visual stories, product films and experimental worlds with a clear idea behind every frame.';

update public.site_settings
set about_secondary = 'For me, AI is a creative medium, not the whole story. I develop the idea, direct the visual language, and refine timing, movement, and sound until the final film feels intentional.'
where id = 1 and about_secondary = 'My approach is simple: start with a strong concept, shape the visual language, then refine the final cut until the story feels intentional.';
