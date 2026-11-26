-- CrownDEX profile copy refresh
-- Run this in Supabase SQL Editor after installing the frontend update.
-- Only the two public About-section text fields are changed.
UPDATE public.site_settings
SET
  about_intro = 'I make AI-assisted short films, funny shorts and product visuals. I enjoy taking a simple idea and shaping it into a video with personality, clear pacing and a strong finish.',
  about_secondary = 'Some projects are cinematic, some are made to make people laugh, and others focus on bringing a product to life. I take each one from concept and visual direction through editing and the final cut.'
WHERE id = 1
RETURNING id;
