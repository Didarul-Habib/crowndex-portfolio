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

export async function fetchLiveContent(): Promise<{
  works: Work[] | null;
  programs: CreatorProgram[] | null;
  settings: SiteSettings | null;
} | null> {
  if (!backend) return null;
  const [workResult, programResult, settingsResult] = await Promise.all([
    backend.from('portfolio_works').select('id,title,category,url,video_url,thumbnail,featured,published,sort_order').eq('published', true).order('sort_order', { ascending: true }),
    backend.from('creator_programs').select('id,name,role,description,url,logo_url,published,sort_order').eq('published', true).order('sort_order', { ascending: true }),
    backend.from('site_settings').select('id,about_intro,about_secondary,x_profile,telegram_url,avatar_url').eq('id', 1).maybeSingle()
  ]);
  if (workResult.error) console.warn('CrownDEX: live portfolio unavailable; check Supabase setup.');
  if (programResult.error) console.warn('CrownDEX: creator programs unavailable; check Supabase setup.');
  return {
    works: !workResult.error ? (workResult.data as Work[]) : null,
    programs: !programResult.error ? (programResult.data as CreatorProgram[]) : null,
    settings: !settingsResult.error ? (settingsResult.data as SiteSettings | null) : null
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
