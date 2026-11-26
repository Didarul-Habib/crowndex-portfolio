import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Work } from '../CrownDEXV4';

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

export const backend: SupabaseClient | null =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 12
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

export type CreatorProgram = {
  id: string;
  name: string;
  role: string;
  description: string;
  url: string;
  logo_url: string;
  published: boolean;
  sort_order: number;
};

export type SiteSettings = {
  id: number;
  about_intro: string;
  about_secondary: string;
  x_profile: string;
  telegram_url: string;
  avatar_url: string;
};

/**
 * Public website copy that used to be hardcoded in CrownDEXV4.tsx.
 * Keep this object as the single safe fallback for both the public site
 * and the authenticated Website Content editor.
 */
export const DEFAULT_SITE_CONTENT = {
  navHome: 'Home',
  navWork: 'Work',
  navStudio: 'About',
  navServices: 'Services',
  navContact: 'Contact',
  headerCta: 'LET’S TALK',

  heroIdentity: 'INDEPENDENT CREATOR',
  heroAvailability: 'OPEN TO SELECT COLLABORATIONS',
  heroBrandLead: 'CROWN',
  heroBrandAccent: 'DEX',
  heroLineOneLead: 'STORIES IN',
  heroLineOneAccent: 'MOTION.',
  heroLineTwoLead: 'VISUALS THAT',
  heroLineTwoAccent: 'STAY.',
  heroDescription: 'From cinematic stories to funny shorts and product visuals, I turn ideas into videos with personality and a clear point of view.',
  heroPrimaryCta: 'Explore my work',
  heroStudioCta: 'About me',
  heroSocialCta: 'Find me on X',
  heroChipOne: 'AI SHORT FILMS',
  heroChipTwo: 'FUNNY SHORTS',
  heroChipThree: 'PRODUCT ADS',
  heroShowreelPosterUrl: '',
  heroShowreelChipOne: 'AI FILM',
  heroShowreelChipTwo: 'VISUAL STORY',
  heroShowreelRatio: '16:9 · SHOWREEL',
  heroShowreelRecLabel: 'REC',
  heroShowreelCaptionLabel: 'SELECTED REEL',
  heroShowreelFallbackTitle: 'AI films & product visuals',
  heroBottomLabel: 'ABOUT CROWNDEX',
  marqueeMetaLabel: 'SCROLL TO EXPLORE',
  marqueeCopyright: '© {year} CROWNDEX / ALL ORIGINAL WORK',
  marqueeText: 'CREATIVE DIRECTION   ✳   VISUAL WORLDS   ✳   AI SHORT FILMS   ✳   PRODUCT ADVERTISEMENTS   ✳   CINEMATIC MOTION   ✳   ',

  selectedWorkEyebrow: '01 / SELECTED WORK',
  selectedWorkTitleLead: 'Made to',
  selectedWorkTitleAccent: 'move you.',
  selectedWorkDescription: 'A selection of AI short films, funny shorts and product visuals.',
  archiveEyebrow: '02 / THE FULL COLLECTION',
  archiveTitleLead: 'The',
  archiveTitleAccent: 'archive.',
  archiveDescription: 'Every published piece, in one place.',
  filterAll: 'All',
  filterAi: 'AI Creations',
  filterFunny: 'Funny Shorts',
  filterAds: 'Product Ads',
  sortLabel: 'SORT BY',

  servicesEyebrow: '03 / WHAT I DO',
  servicesTitleLead: 'Visuals with',
  servicesTitleAccent: 'purpose.',
  servicesDescription: 'Creative support from the first idea to the finished piece.',
  serviceOneTitle: 'AI short films',
  serviceOneDescription: 'Character-led stories, cinematic sequences and original short-form films.',
  serviceTwoTitle: 'Product ads',
  serviceTwoDescription: 'Distinctive product visuals and short advertisements built around a clear creative idea.',
  serviceThreeTitle: 'Visual direction',
  serviceThreeDescription: 'Concept development, visual language and a consistent direction from frame to frame.',
  serviceExploreLabel: 'Explore this service',
  servicePreviewLabel: 'SERVICE',
  servicePreviewFallbackEyebrow: 'CDX / VISUALS',
  servicePreviewFallbackTitle: 'IDEA → FRAME → FILM',

  aboutEyebrow: '04 / ABOUT',
  aboutTitleLead: 'I’m',
  aboutTitleAccent: 'CrownDEX,',
  aboutPortraitImageUrl: '',
  aboutPortraitChipOne: 'AI FILMMAKER',
  aboutPortraitChipTwo: 'BASED IN BANGLADESH',
  aboutPortraitChipThree: 'OPEN FOR COLLABS',
  aboutToolkitLabel: 'CREATIVE TOOLKIT',
  aboutToolkitOne: 'AI video generation',
  aboutToolkitTwo: 'Visual direction',
  aboutToolkitThree: 'Editing & sound',
  aboutStatsFilmsLabel: 'FILMS PUBLISHED',
  aboutStatsViewsLabel: 'TRACKED VIEWS',
  aboutStatsYearsLabel: 'YEARS CREATING',
  aboutLinkXLabel: 'FOLLOW ON X',
  aboutLinkTelegramLabel: 'SAY HELLO',

  processEyebrow: '05 / THE PROCESS',
  processTitleLead: 'Three steps.',
  processTitleAccent: 'One clear story.',
  processOneLabel: '01 / CONCEPT',
  processOneTitle: 'Find the idea.',
  processOneDescription: 'Define the message, mood and creative angle before production begins.',
  processTwoLabel: '02 / DIRECTION',
  processTwoTitle: 'Shape the frames.',
  processTwoDescription: 'Build the visual world, guide the motion and keep every shot connected.',
  processThreeLabel: '03 / FINAL CUT',
  processThreeTitle: 'Make it land.',
  processThreeDescription: 'Refine the edit, pacing and sound into a finished piece ready to share.',
  programsEyebrow: 'CURRENT AFFILIATIONS',
  programsTitleLead: 'Creator programs &',
  programsTitleAccent: 'ambassador roles.',
  programsDescription: 'Current creator-program and ambassador affiliations.',

  contactEyebrow: '06 / CONTACT',
  contactTitleLead: 'Let’s make something',
  contactTitleAccent: 'unforgettable.',
  contactDescription: 'Tell me what you’re thinking. I’m open to interesting film, product and creative projects.',
  contactNameLabel: 'Name',
  contactNamePlaceholder: 'Your name',
  contactEmailLabel: 'Email',
  contactEmailPlaceholder: 'you@example.com',
  contactProjectLabel: 'What are you looking to create?',
  contactBriefLabel: 'Tell me a little about the project',
  contactBriefPlaceholder: 'The idea, the product, the mood, the deadline…',
  contactFormButton: 'Prepare project brief',
  contactEmailButton: 'Prepare email',
  contactFormHint: 'The brief is copied locally; send it through Telegram. No third-party form service is used.',
  contactEmail: '',
  contactProjectOptionOne: 'AI short film',
  contactProjectOptionTwo: 'Funny short',
  contactProjectOptionThree: 'Product advertisement',
  contactProjectOptionFour: 'Visual direction',
  contactProjectOptionFive: 'Something else',
  contactLinkXLabel: 'Follow the work',
  contactLinkTelegramLabel: 'Telegram',
  contactLinkEmailLabel: 'Email',
  contactCopyEmailLabel: 'COPY EMAIL',
  contactCopyEmailCopiedLabel: 'COPIED!',

  footerLeftLabel: 'INDEPENDENT AI FILMMAKER',
  footerBrand: 'CROWNDEX',
  footerRightLabel: 'STORIES IN MOTION',
  footerXLabel: 'Follow on X',
  footerXHandle: '@_CrownDEX',
  footerTelegramLabel: 'Telegram',
  footerTelegramHandle: 'Message me',
  footerEmailLabel: 'Email',
  footerBackTopLabel: 'BACK TO TOP',
} as const;

export type SiteContent = { [K in keyof typeof DEFAULT_SITE_CONTENT]: string };

export function normalizeSiteContent(value: unknown): SiteContent {
  const normalized: Record<string, string> = { ...DEFAULT_SITE_CONTENT };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of Object.keys(DEFAULT_SITE_CONTENT)) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === 'string') normalized[key] = candidate;
    }
  }

  // Upgrade only the exact previous built-in labels. Any custom copy saved by the owner is preserved.
  if (normalized.navStudio === 'Studio') normalized.navStudio = 'About';
  if (normalized.heroStudioCta === 'Enter the studio') normalized.heroStudioCta = 'About me';
  if (normalized.heroBottomLabel === 'ENTER THE STUDIO') normalized.heroBottomLabel = 'ABOUT CROWNDEX';
  if (normalized.marqueeMetaLabel === 'SCROLL TO ENTER THE STUDIO') normalized.marqueeMetaLabel = 'SCROLL TO EXPLORE';
  if (normalized.servicePreviewFallbackEyebrow === 'CDX / STUDIO') normalized.servicePreviewFallbackEyebrow = 'CDX / VISUALS';
  if (normalized.aboutEyebrow === '04 / STUDIO') normalized.aboutEyebrow = '04 / ABOUT';
  if (normalized.aboutTitleLead === 'The creator behind' || normalized.aboutTitleLead === 'Inside the') normalized.aboutTitleLead = 'I’m';
  if (normalized.aboutTitleAccent === 'CrownDEX.' || normalized.aboutTitleAccent === 'studio.') normalized.aboutTitleAccent = 'CrownDEX,';
  if (normalized.programsEyebrow === '05 / CREATOR NETWORK') normalized.programsEyebrow = 'CURRENT AFFILIATIONS';
  if (normalized.programsTitleLead === 'Part of the') normalized.programsTitleLead = 'Creator programs &';
  if (normalized.programsTitleAccent === 'community.') normalized.programsTitleAccent = 'ambassador roles.';
  if (normalized.programsDescription === 'Creator programmes and communities I’m involved with.') normalized.programsDescription = 'Current creator-program and ambassador affiliations.';
  return normalized as SiteContent;
}

export async function fetchLiveContent(): Promise<{
  works: Work[] | null;
  programs: CreatorProgram[] | null;
  settings: SiteSettings | null;
  siteContent: SiteContent | null;
} | null> {
  if (!backend) return null;
  const [workResult, programResult, settingsResult, contentResult] = await Promise.all([
    backend.from('portfolio_works').select('id,title,description,category,url,video_url,thumbnail,featured,published,sort_order').eq('published', true).order('sort_order', { ascending: true }),
    backend.from('creator_programs').select('id,name,role,description,url,logo_url,published,sort_order').eq('published', true).order('sort_order', { ascending: true }),
    backend.from('site_settings').select('id,about_intro,about_secondary,x_profile,telegram_url,avatar_url').eq('id', 1).maybeSingle(),
    backend.from('site_content').select('content').eq('id', 1).maybeSingle()
  ]);
  if (workResult.error) console.warn('CrownDEX: live portfolio unavailable; check Supabase setup.');
  if (programResult.error) console.warn('CrownDEX: creator programs unavailable; check Supabase setup.');
  if (contentResult.error) console.info('CrownDEX: optional website content table is not installed yet; using built-in copy.');
  return {
    works: !workResult.error ? (workResult.data as Work[]) : null,
    programs: !programResult.error ? (programResult.data as CreatorProgram[]) : null,
    settings: !settingsResult.error ? (settingsResult.data as SiteSettings | null) : null,
    siteContent: !contentResult.error && contentResult.data ? normalizeSiteContent(contentResult.data.content) : null
  };
}

export function validXUrl(value: string) {
  if (!value.trim()) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && ['x.com','www.x.com','twitter.com','www.twitter.com'].includes(u.hostname.toLowerCase()) && /^\/[A-Za-z0-9_]+\/status\/\d+\/?$/.test(u.pathname);
  } catch { return false; }
}

export function validHttps(value: string) {
  if (!value.trim()) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
