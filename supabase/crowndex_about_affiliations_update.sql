-- CrownDEX About + Current Affiliations update
-- Run in Supabase Dashboard > SQL Editor after installing the About Motion Update.
-- Safe to rerun: existing custom biographies and existing program records are preserved.

begin;

-- Replace only the known generic starter biographies. Any custom text is left untouched.
update public.site_settings
set
  about_intro = case
    when about_intro in (
      'I make AI-assisted short films, funny shorts and product visuals. I enjoy taking a simple idea and shaping it into a video with personality, clear pacing and a strong finish.',
      'I’m CrownDEX, an independent AI filmmaker and visual storyteller. I create cinematic short films, original visual worlds, and product-focused stories that turn a strong concept into something people want to watch.'
    )
    then 'I’m CrownDEX, an independent AI filmmaker and visual storyteller based in Bangladesh. I create AI short films, funny shorts and product visuals, bringing each idea from concept to a finished video with its own personality and point of view.'
    else about_intro
  end,
  about_secondary = case
    when about_secondary in (
      'Some projects are cinematic, some are made to make people laugh, and others focus on bringing a product to life. I take each one from concept and visual direction through editing and the final cut.',
      'For me, AI is a creative medium, not the whole story. I develop the idea, direct the visual language, and refine timing, movement, and sound until the final film feels intentional.'
    )
    then 'My work combines creative direction, AI video generation, editing and sound. I enjoy building cinematic stories, playful moments and product-focused visuals, shaping each piece from its first idea through the final cut.'
    else about_secondary
  end
where id = 1;

-- These two affiliations reflect the user's latest self-described current roles.
-- Existing records with the same program name are not duplicated or overwritten.
insert into public.creator_programs
  (id, name, role, description, url, logo_url, published, sort_order)
select
  'crowndex-elevenlabs-ambassador',
  'ElevenLabs',
  'Ambassador',
  'Current ambassador affiliation.',
  'https://elevenlabs.io/',
  '',
  true,
  0
where not exists (
  select 1 from public.creator_programs
  where lower(trim(name)) = lower('ElevenLabs')
)
on conflict (id) do nothing;

insert into public.creator_programs
  (id, name, role, description, url, logo_url, published, sort_order)
select
  'crowndex-enter-pro-cpp',
  'Enter Pro Creator Program',
  'CPP · @EnterProAI',
  'CPP affiliation at @EnterProAI.',
  'https://enter.converge.ai/',
  '',
  true,
  1
where not exists (
  select 1 from public.creator_programs
  where lower(trim(name)) = lower('Enter Pro Creator Program')
)
on conflict (id) do nothing;

commit;
