import { useEffect, useMemo, useRef, useState, type ChangeEvent as ReactChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type SyntheticEvent as ReactSyntheticEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  Play,
  Repeat2,
  Send,
  Sparkles,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import projectsData from './data/projects.json';
import embedData from './data/embeds.generated.json';
import xLiveData from './data/x-live.generated.json';
import { backend, fetchLiveContent, DEFAULT_SITE_CONTENT, type CreatorProgram, type SiteSettings, type SiteContent } from './lib/content';

export type Work = {
  id: string;
  url: string;
  video_url?: string;
  title?: string;
  description?: string;
  category: string;
  featured?: boolean;
  thumbnail?: string;
  published?: boolean;
  sort_order?: number;
};

type ProjectMeta = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  previewVideo: string;
  videoUrl: string;
  xUrl: string;
  publishDate: string;
  duration: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  bookmarks: number | null;
  featured: boolean;
};

type ProjectsFile = {
  creator: {
    yearsCreating: number | null;
    location: string;
    openForCollaborations: boolean;
  };
  projects: ProjectMeta[];
};

type Embed = { text?: string; authorName?: string; fetched?: boolean };
type XLiveProject = Partial<Pick<ProjectMeta,
  'thumbnail' | 'previewVideo' | 'videoUrl' | 'duration' |
  'views' | 'likes' | 'comments' | 'reposts' | 'bookmarks'
>> & { fetchedAt?: string; source?: string };
const projectFile = projectsData as ProjectsFile;
const embeds = embedData as Record<string, Embed>;
const xLiveProjects = xLiveData as Record<string, XLiveProject>;
const projectById = new Map(projectFile.projects.map(project => [project.id, project]));
const fallbackWorks: Work[] = projectFile.projects.map((project, index) => ({
  id: project.id,
  url: project.xUrl,
  title: project.title || undefined,
  description: project.description || undefined,
  category: project.category,
  featured: project.featured,
  thumbnail: project.thumbnail || undefined,
  video_url: project.videoUrl || undefined,
  published: true,
  sort_order: index,
}));
const xProfile = 'https://x.com/_CrownDEX';
const telegram = 'https://t.me/didarul_habib96';
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();

function dateFromXId(url: string) {
  const id = /\/status\/(\d+)/.exec(url)?.[1];
  if (!id) return '';
  try {
    const milliseconds = Number((BigInt(id) >> 22n) + 1288834974657n);
    return new Date(milliseconds).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function categoryLabel(work: Work, saved?: Partial<ProjectMeta>) {
  const live = (work.category || '').trim();
  // Preserve specific Supabase admin categories, but allow rich metadata to refine generic legacy records.
  const isGeneric = !live || /^(ai creations?)$/i.test(live);
  const value = (isGeneric ? saved?.category || live : live).toLowerCase();
  if (/meme/.test(value)) return 'Meme';
  if (/short stor(y|ies)|storytelling|narrative/.test(value)) return 'Short Story';
  if (/funny|comedy|humou?r/.test(value)) return 'Funny Short';
  if (/product|advert|\bads?\b/.test(value)) return 'Product Ad';
  if (/visual direction|art direction/.test(value)) return 'Visual Direction';
  return 'AI Film';
}

function projectFor(work: Work): ProjectMeta {
  const saved = projectById.get(work.id);
  const live = xLiveProjects[work.id];
  return {
    id: work.id,
    title: work.title?.trim() || saved?.title || '',
    description: work.description !== undefined ? work.description.trim() : saved?.description || '',
    category: categoryLabel(work, saved),
    thumbnail: work.thumbnail || saved?.thumbnail || live?.thumbnail || '',
    previewVideo: saved?.previewVideo || work.video_url || live?.previewVideo || live?.videoUrl || '',
    videoUrl: work.video_url || saved?.videoUrl || saved?.previewVideo || live?.videoUrl || live?.previewVideo || '',
    xUrl: work.url || saved?.xUrl || '',
    publishDate: saved?.publishDate || dateFromXId(work.url),
    duration: saved?.duration || live?.duration || '',
    views: saved?.views ?? live?.views ?? null,
    likes: saved?.likes ?? live?.likes ?? null,
    comments: saved?.comments ?? live?.comments ?? null,
    reposts: saved?.reposts ?? live?.reposts ?? null,
    bookmarks: saved?.bookmarks ?? live?.bookmarks ?? null,
    featured: work.featured ?? saved?.featured ?? false,
  };
}

function titleFor(work: Work, index: number, project?: ProjectMeta) {
  const custom = work.title?.trim() || project?.title?.trim();
  if (custom) return custom;
  const text = embeds[work.id]?.text?.trim();
  if (text) return text.length > 76 ? `${text.slice(0, 73).trimEnd()}…` : text;
  return `AI film ${String(index + 1).padStart(2, '0')}`;
}

function summaryFor(work: Work, index: number, project?: ProjectMeta) {
  if (project?.description?.trim()) return project.description.trim();
  const text = embeds[work.id]?.text?.trim();
  if (!text) return '';
  const clean = text.replace(/https?:\/\/\S+/g, '').replace(/#[\w]+/g, '').replace(/\s+/g, ' ').trim();
  const title = titleFor(work, index, project);
  if (clean.toLowerCase() === title.toLowerCase()) return '';
  const remainder = clean.toLowerCase().startsWith(title.toLowerCase())
    ? clean.slice(title.length).replace(/^[\s—–:|.]+/, '').trim()
    : clean;
  if (!remainder) return '';
  return remainder.length > 140 ? `${remainder.slice(0, 137).trimEnd()}…` : remainder;
}

function formatDate(value: string) {
  if (!value) return 'DATE NOT SET';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'DATE NOT SET';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function scrollTo(selector: string, reduced: boolean) {
  document.querySelector(selector)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

type XWidgets = {
  widgets: {
    createTweet: (id: string, element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLElement | null>;
  };
};

let widgetPromise: Promise<XWidgets> | null = null;
const activeManagedVideos = new Set<HTMLVideoElement>();

function pauseManagedVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  video.pause();
  activeManagedVideos.delete(video);
}

function pauseAllManagedVideos() {
  activeManagedVideos.forEach(video => video.pause());
  activeManagedVideos.clear();
}

function playManagedVideo(video: HTMLVideoElement): Promise<void> {
  for (const active of Array.from(activeManagedVideos)) {
    if (active.paused || active.ended || !active.isConnected) activeManagedVideos.delete(active);
  }
  if (!activeManagedVideos.has(video)) {
    while (activeManagedVideos.size >= 2) {
      const oldest = activeManagedVideos.values().next().value as HTMLVideoElement | undefined;
      if (!oldest) break;
      pauseManagedVideo(oldest);
    }
    activeManagedVideos.add(video);
  }
  return video.play().catch(error => {
    activeManagedVideos.delete(video);
    throw error;
  });
}

function loadPreviewSource(video: HTMLVideoElement, source: string) {
  if (!source || video.dataset.cdxSource === source) return;
  video.dataset.cdxSource = source;
  video.preload = 'none';
  video.src = source;
  video.load();
}


function getXWidgets(): Promise<XWidgets> {
  const host = window as Window & { twttr?: XWidgets };
  if (host.twttr?.widgets) return Promise.resolve(host.twttr);
  if (widgetPromise) return widgetPromise;
  widgetPromise = new Promise<XWidgets>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.dataset.crowndexX = 'true';
    script.onload = () => host.twttr?.widgets ? resolve(host.twttr) : reject(new Error('X player unavailable'));
    script.onerror = () => reject(new Error('X player blocked'));
    document.head.appendChild(script);
  }).catch(error => {
    widgetPromise = null;
    throw error;
  });
  return widgetPromise;
}


function isLiteMode() {
  const params = new URLSearchParams(window.location.search);
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(any-pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return params.get('lite') === '1'
    || coarsePointer
    || (typeof cores === 'number' && cores <= 4)
    || (typeof memory === 'number' && memory <= 4);
}

function useAdaptiveQuality(reduced: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    const params = new URLSearchParams(window.location.search);
    const forcedLite = params.get('lite') === '1';
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(any-pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const autoLite = !forcedLite && !coarsePointer && ((typeof cores === 'number' && cores <= 4) || (typeof memory === 'number' && memory <= 4));
    const lite = forcedLite || coarsePointer || autoLite;
    root.classList.toggle('cdx-lite', lite);
    root.classList.toggle('cdx-lite-auto', autoLite);
    root.classList.toggle('cdx-reduced-motion', reduced);

    let frame = 0;
    let frameCount = 0;
    let batchStart = 0;
    let stage = 0;
    let disposed = false;

    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const sample = (now: number) => {
      frame = 0;
      if (disposed || document.visibilityState !== 'visible') return;
      if (!batchStart) batchStart = now;
      frameCount += 1;

      if (frameCount < 90) {
        frame = requestAnimationFrame(sample);
        return;
      }

      const elapsed = Math.max(1, now - batchStart);
      const averageFps = 89 * 1000 / elapsed;
      frameCount = 0;
      batchStart = 0;

      if (averageFps < 50 && stage < 5) {
        stage += 1;
        root.dataset.cdxQuality = String(stage);
        if (stage < 5) frame = requestAnimationFrame(sample);
      }
    };

    const startSampling = () => {
      if (reduced || disposed || frame || stage >= 5 || document.visibilityState !== 'visible') return;
      frameCount = 0;
      batchStart = 0;
      frame = requestAnimationFrame(sample);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopFrame();
      else startSampling();
    };

    if (!reduced) startSampling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      stopFrame();
      document.removeEventListener('visibilitychange', onVisibility);
      root.classList.remove('cdx-lite', 'cdx-lite-auto', 'cdx-reduced-motion');
      delete root.dataset.cdxQuality;
    };
  }, [reduced]);
}

function useSectionReveals(reduced: boolean, version: number) {
  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const headings = gsap.utils.toArray<HTMLElement>(
        '.cdx-section-heading h2, .cdx-about-copy h2, .cdx-about-affiliations-heading h3, .cdx-contact-copy h2'
      );
      ScrollTrigger.batch(headings, {
        start: 'top 86%',
        once: true,
        batchMax: 8,
        onEnter: batch => batch.forEach(heading => {
          const words = heading.querySelectorAll<HTMLElement>('.cdx-heading-word');
          if (!words.length) return;
          gsap.fromTo(words,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.56, stagger: 0.06, ease: 'power3.out', overwrite: true }
          );
        }),
      });

      const copy = gsap.utils.toArray<HTMLElement>('.cdx-section .cdx-reveal-copy, .cdx-service-description');
      ScrollTrigger.batch(copy, {
        start: 'top 91%',
        once: true,
        batchMax: 12,
        onEnter: batch => gsap.fromTo(batch,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.56, stagger: 0.06, ease: 'power2.out', overwrite: true }
        ),
      });

      const affiliationCards = gsap.utils.toArray<HTMLElement>('.cdx-about-affiliations .cdx-program-card');
      if (affiliationCards.length) {
        ScrollTrigger.batch(affiliationCards, {
          start: 'top 92%',
          once: true,
          batchMax: 4,
          onEnter: batch => gsap.fromTo(batch,
            { y: 22, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.58, stagger: 0.08, ease: 'power2.out', overwrite: true }
          ),
        });
      }

      const toolkitTags = gsap.utils.toArray<HTMLElement>('.cdx-toolkit > div b');
      if (toolkitTags.length) {
        ScrollTrigger.batch(toolkitTags, {
          start: 'top 90%',
          once: true,
          batchMax: 6,
          onEnter: batch => gsap.fromTo(batch,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.56, stagger: 0.06, ease: 'power2.out', overwrite: true }
          ),
        });
      }


    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => context.revert();
  }, [reduced, version]);
}

function CustomCursor({ reduced }: { reduced: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!finePointer || reduced || isLiteMode() || !dot || !ring || !label) return;

    let x = 0, y = 0, ringX = 0, ringY = 0;
    let frame = 0, rectFrame = 0, visible = false;
    let activeTarget: HTMLElement | null = null;
    let activeRect: DOMRect | null = null;
    const root = document.documentElement;
    const targetSelectors = ['.cdx-work-card', '.cdx-hero-actions .cdx-magnetic'];

    const findTarget = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      for (const selector of targetSelectors) {
        const found = target.closest<HTMLElement>(selector);
        if (found) return found;
      }
      return null;
    };

    const resetTarget = (target: HTMLElement | null) => {
      if (!target) return;
      for (const property of ['--cdx-tilt-x', '--cdx-tilt-y', '--cdx-mag-x', '--cdx-mag-y']) {
        target.style.removeProperty(property);
      }
    };

    const setTarget = (target: HTMLElement | null) => {
      if (target === activeTarget) return;
      resetTarget(activeTarget);
      activeTarget = target;
      activeRect = target ? target.getBoundingClientRect() : null;
    };

    const setCursorMode = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        label.textContent = '';
        ring.dataset.mode = '';
        return;
      }
      const cursorTarget = target.closest<HTMLElement>('[data-cursor]');
      const isPlay = cursorTarget?.dataset.cursor?.toUpperCase() === 'PLAY';
      const isLink = Boolean(target.closest('a,button'));
      const mode = isPlay ? 'play' : isLink ? 'link' : '';
      label.textContent = isPlay ? 'PLAY' : '';
      ring.dataset.mode = mode;
    };

    const applyPointerEffects = () => {
      if (!activeTarget || !activeRect) return;
      const px = Math.max(0, Math.min(1, (x - activeRect.left) / Math.max(1, activeRect.width)));
      const py = Math.max(0, Math.min(1, (y - activeRect.top) / Math.max(1, activeRect.height)));

      if (activeTarget.matches('.cdx-work-card')) {
        if (Number(root.dataset.cdxQuality || 0) >= 4) return;
        activeTarget.style.setProperty('--cdx-tilt-x', `${(0.5 - py) * 4}deg`);
        activeTarget.style.setProperty('--cdx-tilt-y', `${(px - 0.5) * 4}deg`);
      } else if (activeTarget.matches('.cdx-magnetic')) {
        const dx = (px - 0.5) * activeRect.width * 0.12;
        const dy = (py - 0.5) * activeRect.height * 0.12;
        activeTarget.style.setProperty('--cdx-mag-x', `${Math.max(-6, Math.min(6, dx))}px`);
        activeTarget.style.setProperty('--cdx-mag-y', `${Math.max(-6, Math.min(6, dy))}px`);
      }
    };

    const tick = () => {
      frame = 0;
      const dx = x - ringX;
      const dy = y - ringY;
      ringX += dx * 0.18;
      ringY += dy * 0.18;
      if (Math.abs(x - ringX) < 0.22) ringX = x;
      if (Math.abs(y - ringY) < 0.22) ringY = y;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      applyPointerEffects();
      const stillMoving = ringX !== x || ringY !== y;
      dot.classList.toggle('is-moving', stillMoving);
      ring.classList.toggle('is-moving', stillMoving);
      if (stillMoving) frame = requestAnimationFrame(tick);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      const target = event.target;
      setTarget(findTarget(target));
      setCursorMode(target);
      if (!visible) {
        visible = true;
        ringX = x;
        ringY = y;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
        root.classList.add('cdx-cursor-active');
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const over = (event: PointerEvent) => {
      setTarget(findTarget(event.target));
      setCursorMode(event.target);
    };

    const refreshRect = () => {
      if (!activeTarget || rectFrame) return;
      rectFrame = requestAnimationFrame(() => {
        rectFrame = 0;
        if (activeTarget) activeRect = activeTarget.getBoundingClientRect();
        if (!frame && visible) frame = requestAnimationFrame(tick);
      });
    };

    const leave = () => {
      visible = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      dot.classList.remove('is-moving');
      ring.classList.remove('is-moving');
      root.classList.remove('cdx-cursor-active', 'cdx-cursor-text');
      setTarget(null);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    window.addEventListener('scroll', refreshRect, { passive: true });
    window.addEventListener('resize', refreshRect, { passive: true });
    window.addEventListener('pointerleave', leave);
    const onVisibility = () => { if (document.visibilityState === 'hidden') leave(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(rectFrame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('scroll', refreshRect);
      window.removeEventListener('resize', refreshRect);
      window.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', onVisibility);
      resetTarget(activeTarget);
      root.classList.remove('cdx-cursor-active', 'cdx-cursor-text');
    };
  }, [reduced]);

  return (
    <>
      <div ref={dotRef} className="cdx-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cdx-cursor-ring" aria-hidden="true"><span ref={labelRef} /></div>
    </>
  );
}

function IntroLoader({ reduced }: { reduced: boolean }) {
  const [visible, setVisible] = useState(() => {
    if (reduced) return false;
    try { return !window.sessionStorage.getItem('cdx-motion-intro-seen'); }
    catch { return true; }
  });
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!visible || reduced) return;
    let elapsed = 0;
    let lastTime = performance.now();
    let frame = 0;
    let finishTimer = 0;
    const tick = (now: number) => {
      frame = 0;
      if (document.visibilityState !== 'visible') return;
      elapsed += now - lastTime;
      lastTime = now;
      const amount = Math.min(1, elapsed / 520);
      setPercent(Math.round(amount * 100));
      if (amount < 1) frame = requestAnimationFrame(tick);
      else {
        try { window.sessionStorage.setItem('cdx-motion-intro-seen', '1'); } catch { /* Storage may be disabled. */ }
        finishTimer = window.setTimeout(() => setVisible(false), 100);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !frame && elapsed < 520) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(finishTimer);
    };
  }, [visible, reduced]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div role="status" aria-label="Loading CrownDEX portfolio" className="cdx-intro-loader" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }} transition={{ duration: 0.34, ease: [0.76, 0, 0.24, 1] }}>
          <div className="cdx-intro-lockup"><span>CROWN</span><b>DEX</b><i /></div>
          <div className="cdx-intro-bottom"><span>INDEPENDENT AI FILMMAKER</span><strong>{String(percent).padStart(2, '0')}%</strong></div>
          <div className="cdx-intro-progress"><span style={{ width: `${percent}%` }} /></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


function CountUp({ value, reduced = false }: { value: number | null; reduced?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value === null ? '—' : reduced ? formatCompact(value) : '0');
  useEffect(() => {
    if (value === null) { setDisplay('—'); return; }
    if (reduced) { setDisplay(formatCompact(value)); return; }
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    let started = false;
    let elapsed = 0;
    let lastTime = 0;
    const tick = (now: number) => {
      frame = 0;
      if (document.visibilityState !== 'visible') return;
      elapsed += now - lastTime;
      lastTime = now;
      const progress = Math.min(1, elapsed / 760);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(formatCompact(Math.round(value * eased)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const animate = () => {
      if (started) return;
      started = true;
      elapsed = 0;
      lastTime = performance.now();
      if (document.visibilityState === 'visible') frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && started && elapsed < 760 && !frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!('IntersectionObserver' in window)) animate();
    else {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { animate(); observer.disconnect(); }
      }, { threshold: 0.3 });
      observer.observe(node);
      return () => { observer.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility); };
    }
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility); };
  }, [value, reduced]);
  return <span ref={ref}>{display}</span>;
}

function StatMetric({ icon, label, value, reduced = false }: { icon: ReactNode; label: string; value: number; reduced?: boolean }) {
  return (
    <span className="cdx-stat-metric" aria-label={`${label}: ${formatCompact(value)}`}>
      <span className="cdx-stat-icon" aria-hidden="true">{icon}</span>
      <span className="cdx-stat-value"><CountUp value={value} reduced={reduced} /></span>
      <span className="cdx-stat-label">{label}</span>
    </span>
  );
}

function ProjectStats({ project, reduced = false, className }: { project: ProjectMeta; reduced?: boolean; className: string }) {
  type Metric = { key: string; icon: ReactNode; label: string; value: number | null };
  const metrics: Metric[] = [
    { key: 'views', icon: <Eye size={13} />, label: 'Views', value: project.views },
    { key: 'likes', icon: <Heart size={13} />, label: 'Likes', value: project.likes },
    { key: 'comments', icon: <MessageCircle size={13} />, label: 'Comments', value: project.comments },
    { key: 'reposts', icon: <Repeat2 size={13} />, label: 'Reposts', value: project.reposts },
    { key: 'bookmarks', icon: <Bookmark size={13} />, label: 'Bookmarks', value: project.bookmarks },
  ];
  const available = metrics.filter((metric): metric is Metric & { value: number } => typeof metric.value === 'number' && Number.isFinite(metric.value));
  if (!available.length) return null;
  return (
    <div className={className} aria-label="Project engagement statistics">
      {available.map(metric => <StatMetric key={metric.key} icon={metric.icon} label={metric.label} value={metric.value} reduced={reduced} />)}
    </div>
  );
}

function Marquee({ reduced, text, metaLabel, copyrightLabel }: { reduced: boolean; text: string; metaLabel: string; copyrightLabel: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = trackRef.current;
    const forceLite = new URLSearchParams(window.location.search).get('lite') === '1';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (!track || reduced || forceLite || coarse) return;

    let visible = false;
    const syncPlayback = () => {
      const active = visible && document.visibilityState === 'visible';
      track.style.setProperty('animation-play-state', active ? 'running' : 'paused', 'important');
      track.classList.toggle('is-active', active);
    };
    if (!('IntersectionObserver' in window)) {
      track.style.setProperty('animation-play-state', 'running', 'important');
      return () => { track.style.removeProperty('animation-play-state'); };
    }
    const observer = new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
      syncPlayback();
    }, { threshold: 0.01 });
    observer.observe(track.parentElement ?? track);
    const onVisibility = () => syncPlayback();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      track.classList.remove('is-active');
      track.style.removeProperty('animation-play-state');
    };
  }, [reduced]);

  const words = text.trim() ? `${text.trim()}   ` : DEFAULT_SITE_CONTENT.marqueeText;
  return (
    <div className="cdx-marquee-shell">
      <div className="cdx-marquee-meta">
        <span>{metaLabel} <i aria-hidden="true">↘</i></span>
        <span>{copyrightLabel.replace('{year}', String(new Date().getFullYear()))}</span>
      </div>
      <div className="cdx-marquee" aria-label="Creative direction, visual worlds, AI short films, product advertisements and cinematic motion">
        <div className="cdx-marquee-track" ref={trackRef}>
          <span>{words}</span><span aria-hidden="true">{words}</span>
        </div>
      </div>
    </div>
  );
}

function Timecode({ reduced }: { reduced: boolean }) {
  const [frames, setFrames] = useState(308);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reduced || !ref.current) return;
    const reel = ref.current.closest('.cdx-showreel');
    if (!reel) return;
    let visible = false;
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (!visible || document.visibilityState !== 'visible' || timer !== undefined) return;
      timer = window.setInterval(() => setFrames(value => value + 2), 80);
    };
    const observer = new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
      if (visible) start(); else stop();
    }, { threshold: 0.5 });
    observer.observe(reel);
    const onVisibility = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [reduced]);
  const totalSeconds = Math.floor(frames / 25);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const frame = frames % 25;
  return <span ref={ref}>{[hours, minutes, seconds, frame].map(value => String(value).padStart(2, '0')).join(':')}</span>;
}

function HeroShowreel({ work, project, reduced, onOpen, posterOverride, chipOne, chipTwo, ratioLabel, recLabel, captionLabel, fallbackTitle }: { work?: Work; project?: ProjectMeta; reduced: boolean; onOpen: () => void; posterOverride: string; chipOne: string; chipTwo: string; ratioLabel: string; recLabel: string; captionLabel: string; fallbackTitle: string }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = project?.videoUrl || work?.video_url;
  useEffect(() => setVideoFailed(false), [videoUrl]);
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !videoUrl || reduced) return;
    let ratio = 0;
    const syncPlayback = () => {
      if (document.visibilityState === 'visible' && ratio >= 0.5) {
        void playManagedVideo(video).catch(() => undefined);
      } else pauseManagedVideo(video);
    };
    const observer = new IntersectionObserver(entries => {
      ratio = entries[0]?.intersectionRatio ?? 0;
      syncPlayback();
    }, { threshold: [0, 0.5, 1] });
    observer.observe(container);
    const onVisibility = () => syncPlayback();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('cdx:resume-videos', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('cdx:resume-videos', onVisibility);
      pauseManagedVideo(video);
    };
  }, [videoUrl, videoFailed, reduced]);
  return (
    <div ref={containerRef} className="cdx-showreel" aria-label="CrownDEX showreel" data-cursor="PLAY">
      {videoUrl && !videoFailed ? (
        <video ref={videoRef} className="cdx-showreel-video" src={videoUrl} poster={posterOverride || project?.thumbnail || undefined} muted loop playsInline preload="metadata" onError={() => { pauseManagedVideo(videoRef.current); setVideoFailed(true); }} aria-label="CrownDEX selected showreel" />
      ) : (posterOverride || project?.thumbnail) ? (
        <img className="cdx-showreel-poster" src={posterOverride || project?.thumbnail || ''} alt={`${work && project ? titleFor(work, 0, project) : 'CrownDEX showreel'} poster`} fetchPriority="high" decoding="async" width={1280} height={720} />
      ) : (
        <div className="cdx-showreel-fallback"><Film size={36} strokeWidth={1.2} /><span>{captionLabel}</span><strong>{fallbackTitle}</strong></div>
      )}
      <div className="cdx-showreel-shade" />
      <div className="cdx-viewfinder" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="cdx-showreel-rec"><i /> {recLabel} <Timecode reduced={reduced} /></div>
      <span className="cdx-showreel-chip cdx-chip-one">{chipOne}</span>
      <span className="cdx-showreel-chip cdx-chip-two">{chipTwo}</span>
      <div className="cdx-showreel-caption"><span>{captionLabel}</span><strong>{work && project ? titleFor(work, 0, project) : fallbackTitle}</strong></div>
      {work && <button className="cdx-showreel-play cdx-magnetic" type="button" onClick={onOpen} aria-label={`Open ${titleFor(work, 0, project)}`}><Play size={17} fill="currentColor" /><span>OPEN FILM</span></button>}
      <span className="cdx-showreel-ratio">{ratioLabel}</span>
      <div className="cdx-showreel-progress" aria-hidden="true"><span /></div>
    </div>
  );
}

function WorkCard({ work, project, index, open, reduced, featuredLayout = false }: {
  work: Work;
  project: ProjectMeta;
  index: number;
  open: () => void;
  reduced: boolean;
  featuredLayout?: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [duration, setDuration] = useState(project.duration);
  const [muted, setMuted] = useState(true);
  const title = titleFor(work, index, project);
  const previewUrl = project.previewVideo || project.videoUrl;
  const hasPoster = Boolean(project.thumbnail && !posterFailed);

  const stopPreview = () => {
    const video = videoRef.current;
    if (!video) return;
    pauseManagedVideo(video);
    try { video.currentTime = 0; } catch { /* Metadata may not be ready. */ }
  };

  const startPreview = () => {
    const video = videoRef.current;
    if (!video || reduced || !previewUrl || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    loadPreviewSource(video, previewUrl);
    video.muted = true;
    if (video.readyState >= 2 && video.currentTime > 0.4) video.currentTime = 0;
    void playManagedVideo(video).catch(() => setPreviewPlaying(false));
  };

  const toggleMute = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  };

  useEffect(() => {
    const card = cardRef.current;
    const video = videoRef.current;
    if (!card || !video || !previewUrl || reduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let ratio = 0;
    const visibilityObserver = new IntersectionObserver(entries => {
      ratio = entries[0]?.intersectionRatio ?? 0;
      if (ratio <= 0.01 || document.visibilityState !== 'visible') pauseManagedVideo(video);
    }, { threshold: [0, 0.01, 0.1, 0.5, 1] });

    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || ratio <= 0.01) pauseManagedVideo(video);
    };
    video.addEventListener('canplay', onVisibility);
    visibilityObserver.observe(card);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('cdx:resume-videos', onVisibility);

    return () => {
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('cdx:resume-videos', onVisibility);
      video.removeEventListener('canplay', onVisibility);
      pauseManagedVideo(video);
    };
  }, [previewUrl, reduced, previewFailed]);

  return (
    <motion.article
      ref={cardRef}
      className={`cdx-work-card${featuredLayout ? ' cdx-work-card--featured' : ''}`}
      data-cursor="VIEW"
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
      transformTemplate={(_: unknown, generated: string) => `perspective(1100px) rotateX(var(--cdx-tilt-x, 0deg)) rotateY(var(--cdx-tilt-y, 0deg)) ${generated}`}
    >
      <motion.button layoutId={`cdx-film-frame-${work.id}`} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className={`cdx-work-visual ${previewPlaying ? 'is-previewing' : ''}`} type="button" onClick={open} onMouseEnter={startPreview} onMouseLeave={stopPreview} onFocus={startPreview} onBlur={stopPreview} aria-label={`Watch ${title}`} data-cursor="PLAY">
        {hasPoster ? <img className="cdx-work-poster" src={project.thumbnail} alt={`${title} poster`} loading="lazy" decoding="async" width="1280" height="720" onError={() => setPosterFailed(true)} /> : <div className="cdx-work-poster-fallback" aria-hidden="true"><svg className="cdx-pixel-crown" viewBox="0 0 32 32" shapeRendering="crispEdges"><path d="M3 9h4l3 6 6-10 6 10 3-6h4l-3 14H6L3 9Z" fill="currentColor"/><path d="M7 25h18v3H7z" fill="currentColor"/></svg><span>CROWNDEX ORIGINAL</span></div>}
        {previewUrl && !previewFailed && <video ref={videoRef} className={`cdx-work-preview${previewPlaying ? ' is-playing' : ''}${!hasPoster && frameReady ? ' is-frame' : ''}`} poster={project.thumbnail || undefined} muted={muted} playsInline loop preload="none" onLoadedMetadata={(event: ReactSyntheticEvent<HTMLVideoElement>) => {
          const video = event.currentTarget;
          const seconds = video.duration;
          if (!duration && Number.isFinite(seconds) && seconds > 0) setDuration(`${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`);
          if (!hasPoster && Number.isFinite(seconds) && seconds > 0 && video.currentTime < 0.4) {
            try { video.currentTime = Math.min(0.5, seconds / 2); } catch { /* Browser may not seek until data is ready. */ }
          }
        }} onSeeked={() => setFrameReady(true)} onPlay={() => setPreviewPlaying(true)} onPause={() => setPreviewPlaying(false)} onError={(event: ReactSyntheticEvent<HTMLVideoElement>) => {
          pauseManagedVideo(event.currentTarget);
          setPreviewFailed(true);
        }} />}
        <span className="cdx-work-shade" />
        {!featuredLayout && <span className="cdx-work-type">{categoryLabel(work, project)}</span>}
        {duration && <span className="cdx-work-duration"><Clock size={11} /> {duration}</span>}
        {!featuredLayout && <span className="cdx-work-number">CDX / {String(index + 1).padStart(2, '0')}</span>}
        <span className="cdx-work-play"><Play size={17} fill="currentColor" /><span>WATCH FILM</span></span>
      </motion.button>
      {featuredLayout && previewUrl && !previewFailed && <button className="cdx-featured-mute" type="button" onClick={toggleMute} aria-label={muted ? 'Unmute featured video' : 'Mute featured video'} aria-pressed={!muted}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}<span>{muted ? 'MUTED' : 'SOUND ON'}</span></button>}

      <div className="cdx-work-details">
        {featuredLayout && <div className="cdx-featured-meta"><span>{categoryLabel(work, project)}</span><span>CDX / {String(index + 1).padStart(2, '0')}</span></div>}
        <div className="cdx-work-meta-head">
          <span className="cdx-work-platform" aria-label="Published on X">𝕏</span>
          <span className="cdx-work-publish-date"><CalendarDays size={12} /> {formatDate(project.publishDate)}</span>
        </div>
        <div className="cdx-work-info-copy">
          <h3 title={title}>{title}</h3>
          {summaryFor(work, index, project) && <p>{summaryFor(work, index, project)}</p>}
        </div>
        <ProjectStats project={project} reduced={reduced} className="cdx-work-stats" />
        <div className="cdx-work-footer">
          <button type="button" onClick={open} data-cursor="PLAY">WATCH FILM <ArrowUpRight size={14} /></button>
          {project.xUrl && <a href={project.xUrl} target="_blank" rel="noopener noreferrer" data-cursor="VIEW">VIEW ON X <ExternalLink size={13} /></a>}
        </div>
      </div>
    </motion.article>
  );
}

function FilmViewer({
  work,
  project,
  allWorks,
  onClose,
  onPrev,
  onNext,
}: {
  work: Work;
  project: ProjectMeta;
  allWorks: Work[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const embedRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [localVideoFailed, setLocalVideoFailed] = useState(false);
  const index = allWorks.findIndex(item => item.id === work.id);
  const title = titleFor(work, index, project);
  const videoUrl = project.videoUrl || work.video_url;

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
      if (event.key === 'Tab') {
        const items = Array.from(document.querySelectorAll<HTMLElement>('.cdx-film-modal button, .cdx-film-modal a')).filter(element => !element.hasAttribute('disabled'));
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    const element = embedRef.current;
    if (!element) return;
    let alive = true;
    let timedOut = false;
    element.innerHTML = '';
    setLocalVideoFailed(false);
    if (videoUrl) { setState('ready'); return; }
    const postId = /\/status\/(\d+)/.exec(project.xUrl || work.url)?.[1];
    if (!postId) { setState('failed'); return; }
    setState('loading');
    const timer = window.setTimeout(() => { if (alive) { timedOut = true; setState('failed'); } }, 14000);
    getXWidgets()
      .then(api => api.widgets.createTweet(postId, element, { theme: 'dark', dnt: true, conversation: 'none', align: 'center' }))
      .then(result => { if (alive && !timedOut) { clearTimeout(timer); setState(result ? 'ready' : 'failed'); } })
      .catch(() => { if (alive && !timedOut) { clearTimeout(timer); setState('failed'); } });
    return () => { alive = false; clearTimeout(timer); element.innerHTML = ''; };
  }, [work.id, work.url, videoUrl, project.xUrl]);

  return (
    <motion.div className="cdx-film-shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section role="dialog" aria-modal="true" aria-label={`Watch ${title}`} className="cdx-film-modal" initial={{ y: 24, scale: 0.975 }} animate={{ y: 0, scale: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.3 }}>
        <div className="cdx-film-head">
          <div><span className="cdx-eyebrow">NOW PLAYING / {String(index + 1).padStart(2, '0')} OF {String(allWorks.length).padStart(2, '0')}</span><h3>{title}</h3></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close film viewer"><X size={21} /></button>
        </div>
        <div className="cdx-film-content">
          <motion.div layoutId={`cdx-film-frame-${work.id}`} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="cdx-film-stage">
            {videoUrl && !localVideoFailed && <video key={videoUrl} className="cdx-native-video" src={videoUrl} controls playsInline preload="metadata" autoPlay poster={project.thumbnail || undefined} onError={() => setLocalVideoFailed(true)} />}
            {!videoUrl && <div ref={embedRef} className="cdx-x-frame" />}
            {state === 'loading' && !videoUrl && <div className="cdx-film-message"><span className="cdx-spinner" />Opening the original X player…</div>}
            {(state === 'failed' || localVideoFailed) && <div className="cdx-film-fallback"><Film size={32} /><h4>Open the original film</h4><p>The embedded player is unavailable here. You can still watch the original post.</p><a href={project.xUrl || work.url} target="_blank" rel="noopener noreferrer">OPEN VIDEO <ExternalLink size={15} /></a></div>}
          </motion.div>
          <aside className="cdx-film-aside">
            <span className="cdx-eyebrow">PROJECT DETAILS</span>
            <h4>{title}</h4>
            <span className="cdx-film-date"><CalendarDays size={13} /> {formatDate(project.publishDate)}</span>
            {project.description && <p>{project.description}</p>}
            <ProjectStats project={project} className="cdx-film-stats" />
            {project.xUrl && <a className="cdx-film-x-link" href={project.xUrl} target="_blank" rel="noopener noreferrer">VIEW ORIGINAL ON X <ArrowUpRight size={14} /></a>}
          </aside>
        </div>
        <div className="cdx-film-foot">
          <div className="cdx-film-controls"><button type="button" onClick={onPrev} aria-label="Previous project"><ChevronLeft size={19} /></button><button type="button" onClick={onNext} aria-label="Next project"><ChevronRight size={19} /></button></div>
          <span>{categoryLabel(work, project)} · {project.duration || 'SHORT FORM'}</span>
          <a href={project.xUrl || work.url} target="_blank" rel="noopener noreferrer">VIEW ON X <ArrowUpRight size={15} /></a>
        </div>
      </motion.section>
    </motion.div>
  );
}

function ContactForm({ email, content }: { email: string; content: SiteContent }) {
  const [notice, setNotice] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const senderEmail = String(form.get('email') || '').trim();
    const projectType = String(form.get('projectType') || '').trim();
    const brief = String(form.get('brief') || '').trim();
    const subject = encodeURIComponent(`CrownDEX project enquiry — ${projectType || 'New project'}`);
    const body = [`Hello CrownDEX,`, '', `Name: ${name}`, `Email: ${senderEmail}`, `Project: ${projectType}`, '', brief].join('\n');
    if (email) {
      window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
      setNotice('Your email app should open with the project brief ready to send.');
      return;
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(body).then(() => setNotice('Your brief has been copied. Send it using your preferred contact channel.')).catch(() => setNotice('Copy your brief and send it using your preferred contact channel.'));
    } else setNotice('Copy your brief and send it using your preferred contact channel.');
  };
  return (
    <form className="cdx-contact-form" onSubmit={submit}>
      <div className="cdx-form-row">
        <label>{content.contactNameLabel}<input name="name" type="text" autoComplete="name" placeholder={content.contactNamePlaceholder} required maxLength={100} /></label>
        <label>{content.contactEmailLabel}<input name="email" type="email" autoComplete="email" placeholder={content.contactEmailPlaceholder} required maxLength={180} /></label>
      </div>
      <label>{content.contactProjectLabel}
        <select name="projectType" defaultValue={content.contactProjectOptionOne}><option>{content.contactProjectOptionOne}</option><option>{content.contactProjectOptionTwo}</option><option>{content.contactProjectOptionThree}</option><option>{content.contactProjectOptionFour}</option><option>{content.contactProjectOptionFive}</option></select>
      </label>
      <label>{content.contactBriefLabel}<textarea name="brief" rows={4} placeholder={content.contactBriefPlaceholder} required maxLength={2500} /></label>
      <button className="cdx-button cdx-button-gold cdx-form-submit cdx-magnetic" type="submit" data-cursor="VIEW">{email ? content.contactEmailButton : content.contactFormButton} <ArrowUpRight size={17} /></button>
      {notice && <p className="cdx-form-notice" role="status">{notice}</p>}
      {!email && <p className="cdx-form-hint">{content.contactFormHint}</p>}
    </form>
  );
}

function CopyEmailButton({ email, label, copiedLabel }: { email: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { setCopied(false); }
  };
  return <button className="cdx-copy-email cdx-magnetic" type="button" onClick={copy} data-cursor="VIEW"><Mail size={14} /> {copied ? copiedLabel : label} <ArrowUpRight size={13} /></button>;
}

function FpsCounter({ enabled }: { enabled: boolean }) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let frames = 0;
    let startedAt = performance.now();
    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const tick = (now: number) => {
      if (document.visibilityState !== 'visible') { stop(); return; }
      frames += 1;
      if (now - startedAt >= 1000) {
        setFps(Math.round(frames * 1000 / (now - startedAt)));
        frames = 0;
        startedAt = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !frame) {
        startedAt = performance.now();
        frames = 0;
        frame = requestAnimationFrame(tick);
      } else stop();
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [enabled]);
  if (!enabled) return null;
  return <div className="cdx-fps-counter" aria-live="off">{fps || '--'} FPS</div>;
}

/** Only the hovered/focused category plays. Never substitute an unrelated film. */
function ServiceCategoryPreview({ row, service, active, reduced, fallbackEyebrow, fallbackTitle, previewLabel, onOpen }: {
  row: { work: Work; project: ProjectMeta } | null;
  service: { number: string; title: string };
  active: boolean;
  reduced: boolean;
  fallbackEyebrow: string;
  fallbackTitle: string;
  previewLabel: string;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const source = row?.project.previewVideo || row?.project.videoUrl || '';
  const poster = row?.project.thumbnail || '';

  useEffect(() => {
    const video = videoRef.current;
    setPlaying(false);
    setVideoFailed(false);
    if (!video || !active || reduced || !source) {
      pauseManagedVideo(video);
      return;
    }
    const start = () => {
      if (document.hidden || !video.isConnected || !video.paused) return;
      pauseAllManagedVideos();
      void playManagedVideo(video).catch(() => setPlaying(false));
    };
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) start();
      else pauseManagedVideo(video);
    }, { threshold: .25 });
    if (containerRef.current) observer.observe(containerRef.current);
    const onVisibility = () => {
      if (document.hidden) pauseManagedVideo(video);
      else if (containerRef.current && containerRef.current.getBoundingClientRect().bottom > 0 && containerRef.current.getBoundingClientRect().top < window.innerHeight) start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      pauseManagedVideo(video);
    };
  }, [row?.work.id, source, active, reduced]);

  return <div ref={containerRef} className={`cdx-service-preview${playing ? ' is-video-playing' : ''}`} aria-live="polite">
    {poster ? <img src={poster} alt={`Poster for ${row?.work.title || service.title}`} loading="lazy" decoding="async" width={1280} height={720}/> :
      <div className="cdx-service-preview-art"><span>{fallbackEyebrow}</span><strong>{row ? service.title : fallbackTitle}</strong></div>}
    {row && source && !videoFailed && !reduced && <video key={row.work.id} ref={videoRef} src={active ? source : undefined} poster={poster || undefined} muted loop playsInline preload="none"
      aria-label={`${service.title} video preview`} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setVideoFailed(true); }}/>}
    <div className="cdx-service-preview-caption">
      <span>{previewLabel} / {service.number}</span><strong>{service.title}</strong>
      {row ? <button type="button" className="cdx-service-preview-action" onClick={onOpen}>View project <ArrowUpRight size={14}/></button> :
        <small className="cdx-service-preview-empty">No published video in this category yet.</small>}
    </div>
  </div>;
}

const CROWNDEX_THEMES = [
  { id: 'gold', label: 'Gold', accent: '#E8B04B' },
  { id: 'crimson', label: 'Crimson', accent: '#FF2E3D' },
  { id: 'teal', label: 'Teal', accent: '#19C9B5' },
  { id: 'neon', label: 'Neon', accent: '#FF3D81' },
  { id: 'lime', label: 'Lime', accent: '#C8FF3D' },
  { id: 'light', label: 'Light', accent: '#FF4A1C' },
] as const;

type CrownDexTheme = typeof CROWNDEX_THEMES[number]['id'];

function ThemeSwitcher() {
  const readTheme = (): CrownDexTheme => {
    const value = new URLSearchParams(window.location.search).get('theme');
    return CROWNDEX_THEMES.some(theme => theme.id === value) ? value as CrownDexTheme : 'gold';
  };
  const [theme, setTheme] = useState<CrownDexTheme>(readTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const apply = (next: CrownDexTheme) => {
      document.documentElement.dataset.cdxTheme = next;
      setTheme(next);
    };
    apply(readTheme());
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 't' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) return;
      setOpen(value => !value);
    };
    const onPopState = () => apply(readTheme());
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const choose = (next: CrownDexTheme) => {
    const url = new URL(window.location.href);
    if (next === 'gold') url.searchParams.delete('theme');
    else url.searchParams.set('theme', next);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    document.documentElement.dataset.cdxTheme = next;
    setTheme(next);
  };

  return (
    <div className={`cdx-theme-switcher${open ? ' is-open' : ''}`}>
      <button className="cdx-theme-toggle" type="button" aria-expanded={open} aria-label="Open colour palette switcher" onClick={() => setOpen(value => !value)}>
        <span className="cdx-theme-toggle-swatch" style={{ background: CROWNDEX_THEMES.find(item => item.id === theme)?.accent }} />
        <span>PALETTE</span>
        <kbd>T</kbd>
      </button>
      {open && <div className="cdx-theme-panel" role="group" aria-label="Choose colour palette">
        {CROWNDEX_THEMES.map(item => <button key={item.id} type="button" className={theme === item.id ? 'is-active' : ''} onClick={() => choose(item.id)} aria-pressed={theme === item.id}>
          <i style={{ background: item.accent }} />{item.label}{theme === item.id && <span aria-hidden="true">✓</span>}
        </button>)}
      </div>}
    </div>
  );
}

export default function CrownDEXV4() {
  const reduced = useReducedMotion() ?? false;
  const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
  useAdaptiveQuality(reduced);

  useEffect(() => {
    document.documentElement.dataset.cdxTheme = 'gold';
  }, []);
  const [works, setWorks] = useState<Work[]>(fallbackWorks);
  const [programs, setPrograms] = useState<CreatorProgram[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent>(() => ({ ...DEFAULT_SITE_CONTENT }));
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<'newest' | 'views' | 'likes'>('newest');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeService, setActiveService] = useState(0);
  const [servicePreviewActive, setServicePreviewActive] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const xProfileUrl = settings?.x_profile || xProfile;
  const telegramUrl = settings?.telegram_url || telegram;
  const effectiveContactEmail = siteContent.contactEmail.trim() || contactEmail;
  const nav = [
    { label: siteContent.navHome, href: '#home' },
    { label: siteContent.navWork, href: '#work' },
    { label: siteContent.navStudio, href: '#about' },
    { label: siteContent.navServices, href: '#services' },
    { label: siteContent.navContact, href: '#contact' },
  ];
  const categories = [
    { value: 'All', label: siteContent.filterAll },
    { value: 'AI Film', label: siteContent.filterAi },
    { value: 'Funny Short', label: siteContent.filterFunny },
    { value: 'Product Ad', label: siteContent.filterAds },
    { value: 'Meme', label: 'Memes' },
    { value: 'Short Story', label: 'Short Stories' },
    { value: 'Visual Direction', label: 'Visual Direction' },
  ];

  const projectRows = useMemo(() => works.map(work => ({ work, project: projectFor(work) })), [works]);
  const featuredRows = useMemo(() => {
    const selected = projectRows.filter(row => row.project.featured).slice(0, 3);
    return selected.length ? selected : projectRows.slice(0, 3);
  }, [projectRows]);
  const selectedWorkRow = featuredRows[0] || projectRows[0];
  const showreelRow = useMemo(() => projectRows.find(row => row.project.featured && row.project.videoUrl) || projectRows.find(row => row.project.videoUrl) || featuredRows[0] || projectRows[0], [projectRows, featuredRows]);
  const filteredRows = useMemo(() => {
    const rows = projectRows.filter(row => category === 'All' || row.project.category === category);
    return rows.sort((a, b) => {
      if (sort === 'views') return (b.project.views ?? -1) - (a.project.views ?? -1);
      if (sort === 'likes') return (b.project.likes ?? -1) - (a.project.likes ?? -1);
      return (b.project.publishDate || '').localeCompare(a.project.publishDate || '');
    });
  }, [projectRows, category, sort]);
  const totalViewsValues = projectRows.map(row => row.project.views).filter((value): value is number => typeof value === 'number');
  const totalViews = totalViewsValues.length ? totalViewsValues.reduce((sum, value) => sum + value, 0) : null;
  const publishedCount = works.filter(work => work.published !== false).length;
  const yearsCreating = projectFile.creator.yearsCreating;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 28 });
  useEffect(() => {
    if (!backend) return;
    let alive = true;
    const reload = async () => {
      const data = await fetchLiveContent();
      if (!alive || !data) return;
      if (data.works !== null) setWorks(data.works);
      if (data.programs !== null) setPrograms(data.programs);
      if (data.settings) setSettings(data.settings);
      if (data.siteContent) setSiteContent(data.siteContent);
    };
    void reload();
    const refresh = () => { if (document.visibilityState === 'visible') void reload(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pauseAllManagedVideos();
      else window.dispatchEvent(new Event('cdx:resume-videos'));
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    let tickerRunning = true;
    const stop = () => { if (!tickerRunning) return; gsap.ticker.remove(tick); lenis.stop(); tickerRunning = false; };
    const start = () => { if (tickerRunning) return; lenis.start(); gsap.ticker.add(tick); tickerRunning = true; ScrollTrigger.refresh(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') stop(); else start(); };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('visibilitychange', onVisibility);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { document.removeEventListener('visibilitychange', onVisibility); stop(); lenis.destroy(); };
  }, [reduced]);

  useEffect(() => {
    const onVisibility = () => document.documentElement.classList.toggle('cdx-page-hidden', document.visibilityState === 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.documentElement.classList.remove('cdx-page-hidden');
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('cdx-menu-open', menuOpen);
    return () => document.body.classList.remove('cdx-menu-open');
  }, [menuOpen]);



  useEffect(() => {
    const sectionIds = ['home', 'work', 'archive', 'services', 'about', 'contact'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter((item): item is HTMLElement => Boolean(item));
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id === 'archive' ? 'work' : entry.target.id); });
    }, { rootMargin: '-34% 0px -56% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useSectionReveals(reduced, works.length + programs.length);

  const closeViewer = () => setActiveIndex(null);
  const previousWork = () => setActiveIndex(index => index === null ? null : (index + works.length - 1) % works.length);
  const nextWork = () => setActiveIndex(index => index === null ? null : (index + 1) % works.length);
  const openWork = (work?: Work) => {
    if (!work) return;
    pauseAllManagedVideos();
    const index = works.findIndex(item => item.id === work.id);
    if (index >= 0) setActiveIndex(index);
  };

  const storedIntro = settings?.about_intro?.trim() || 'I’m CrownDEX, an independent AI filmmaker and visual storyteller based in Bangladesh. I create AI short films, funny shorts and product visuals, bringing each idea from concept to a finished video with its own personality and point of view.';
  // The large About heading already introduces the creator; avoid repeating the same phrase in the paragraph.
  const aboutIntro = storedIntro.replace(/^\s*I[’']m\s+CrownDEX,\s*/i, '');
  const aboutSecondary = settings?.about_secondary?.trim() || 'My work combines creative direction, AI video generation, editing and sound. I enjoy building cinematic stories, playful moments and product-focused visuals, shaping each piece from its first idea through the final cut.';
  // The original three service titles/descriptions remain editable in Admin Studio.
  const services = [
    { number: '01', kind: 'film', title: siteContent.serviceOneTitle, description: siteContent.serviceOneDescription },
    { number: '02', kind: 'product', title: siteContent.serviceTwoTitle, description: siteContent.serviceTwoDescription },
    { number: '03', kind: 'meme', title: 'Memes', description: 'Short, playful edits and meme-style moments made to be shared.' },
    { number: '04', kind: 'story', title: 'Short stories', description: 'Compact stories with characters, emotion and a clear beginning-to-end arc.' },
    { number: '05', kind: 'direction', title: siteContent.serviceThreeTitle, description: siteContent.serviceThreeDescription },
  ];
  const activeServiceItem = services[activeService] || services[0];
  const matchingServiceRows = projectRows.filter(({ project }) => {
    switch (activeServiceItem.kind) {
      case 'product': return project.category === 'Product Ad';
      case 'meme': return project.category === 'Meme' || project.category === 'Funny Short';
      case 'story': return project.category === 'Short Story';
      case 'direction': return project.category === 'Visual Direction';
      default: return project.category === 'AI Film';
    }
  });
  const activeServiceRow = matchingServiceRows.find(row => Boolean(row.project.videoUrl || row.project.previewVideo))
    || matchingServiceRows.find(row => Boolean(row.project.thumbnail))
    || matchingServiceRows[0] || null;

  return (
    <div className="cdx-site">
      <div className="cdx-ambient-background" aria-hidden="true">
        <div className="cdx-ambient-drift">
          <span className="cdx-ambient-blob cdx-ambient-blob--violet" />
          <span className="cdx-ambient-blob cdx-ambient-blob--cyan" />
          <span className="cdx-ambient-blob cdx-ambient-blob--indigo" />
          <span className="cdx-ambient-grid" />
          <div className="cdx-galaxy-stars">
            {Array.from({ length: 26 }, (_, index) => (
              <i key={index} style={{
                left: `${(index * 43 + 11) % 97}%`,
                top: `${(index * 59 + 17) % 94}%`,
                width: `${index % 7 === 0 ? 5 : index % 3 === 0 ? 3 : 2}px`,
                height: `${index % 7 === 0 ? 5 : index % 3 === 0 ? 3 : 2}px`,
                animationDuration: `${9 + (index % 7) * 2.1}s`,
                animationDelay: `${-index * 1.23}s`,
              }} />
            ))}
          </div>
          <span className="cdx-galaxy-streak cdx-galaxy-streak--one" />
          <span className="cdx-galaxy-streak cdx-galaxy-streak--two" />
        </div>
      </div>
      <IntroLoader reduced={reduced} />
      <motion.div className="cdx-scroll-progress" style={{ scaleX: progress }} />
      <CustomCursor reduced={reduced} />
      <FpsCounter enabled={debugMode} />

      <header className="cdx-header">
        <a href="#home" className="cdx-logo cdx-magnetic" aria-label="CrownDEX home" onClick={() => setMenuOpen(false)} data-cursor="VIEW">
          {settings?.avatar_url && <img src={settings.avatar_url} alt="" className="cdx-logo-avatar" width={34} height={34} decoding="async" />}
          <span>{siteContent.heroBrandLead}<span className="cdx-logo-accent">{siteContent.heroBrandAccent}</span></span>
        </a>
        <nav className="cdx-nav" aria-label="Main navigation">
          {nav.map(item => <a key={item.href} href={item.href} className={activeSection === item.href.slice(1) ? 'is-active' : ''} data-cursor="VIEW">{item.label}</a>)}
        </nav>
        <a className="cdx-header-cta cdx-header-cta--nova" href="#contact" data-cursor="VIEW"><span className="cdx-cta-label">{siteContent.headerCta}</span><span className="cdx-cta-icon" aria-hidden="true"><ArrowUpRight size={16} /></span></a>
        <button className="cdx-menu-button cdx-magnetic" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav className="cdx-mobile-nav" aria-label="Mobile navigation" initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }} exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.32 }}>
            {nav.map((item, index) => <motion.a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.055, duration: 0.32 }} data-cursor="VIEW">{item.label}<ArrowUpRight size={19} /></motion.a>)}
          </motion.nav>
        )}
      </AnimatePresence>

      <main>
        <section className="cdx-hero" id="home">
          <div className="cdx-container cdx-hero-layout">
            <div className="cdx-hero-copy">
              <div className="cdx-hero-identity">
                <span className="cdx-hero-avatar-wrap">
                  {settings?.avatar_url ? <img src={settings.avatar_url} alt="CrownDEX profile" width={96} height={96} decoding="async" /> : <span className="cdx-hero-avatar-fallback">CDX</span>}
                  <i aria-label="Online" />
                </span>
                <span className="cdx-hero-identity-copy">
                  <strong>{siteContent.heroIdentity}</strong>

                  <small>{siteContent.heroAvailability}</small>
                </span>
              </div>
              <div className="cdx-hero-wordmark" aria-label={`${siteContent.heroBrandLead}${siteContent.heroBrandAccent}`}><span>{siteContent.heroBrandLead}</span><em>{siteContent.heroBrandAccent}</em></div>
              <h1 className="cdx-hero-headline" aria-label={`${siteContent.heroLineOneLead} ${siteContent.heroLineOneAccent} ${siteContent.heroLineTwoLead} ${siteContent.heroLineTwoAccent}`}><span className="cdx-hero-headline-line">{siteContent.heroLineOneLead} <em>{siteContent.heroLineOneAccent}</em></span><span className="cdx-hero-headline-line cdx-hero-headline-outline">{siteContent.heroLineTwoLead} <em>{siteContent.heroLineTwoAccent}</em></span></h1>
              <p className="cdx-reveal-copy">{siteContent.heroDescription}</p>
              <div className="cdx-hero-actions">
                <a className="cdx-button cdx-button-gold cdx-magnetic" href="#work" data-cursor="VIEW">{siteContent.heroPrimaryCta} <ArrowUpRight size={15} /></a>
                <a className="cdx-button cdx-button-outline cdx-magnetic" href="#about" data-cursor="VIEW">{siteContent.heroStudioCta} <ArrowUpRight size={15} /></a>
                <a className="cdx-button cdx-button-outline cdx-magnetic" href={xProfileUrl} target="_blank" rel="noopener noreferrer" data-cursor="VIEW">{siteContent.heroSocialCta} <ArrowUpRight size={16} /></a>
              </div>
              <div className="cdx-hero-chips" aria-label="Creative services"><span>{siteContent.heroChipOne}</span><span>{siteContent.heroChipTwo}</span><span>{siteContent.heroChipThree}</span></div>
            </div>
            <div className="cdx-showreel-wrap">
              <span className="cdx-card-orbit cdx-card-orbit--hero" aria-hidden="true" />
              <HeroShowreel work={showreelRow?.work} project={showreelRow?.project} reduced={reduced} onOpen={() => openWork(showreelRow?.work)} posterOverride={siteContent.heroShowreelPosterUrl} chipOne={siteContent.heroShowreelChipOne} chipTwo={siteContent.heroShowreelChipTwo} ratioLabel={siteContent.heroShowreelRatio} recLabel={siteContent.heroShowreelRecLabel} captionLabel={siteContent.heroShowreelCaptionLabel} fallbackTitle={siteContent.heroShowreelFallbackTitle} />
            </div>
          </div>
          <div className="cdx-hero-bottom cdx-container"><a href="#about" data-cursor="VIEW"><span>{siteContent.heroBottomLabel}</span><i /><ArrowRight size={14} /></a></div>
        </section>

        <section className="cdx-section cdx-featured" id="work">
          <div className="cdx-container">
            <div className="cdx-section-heading"><div><span className="cdx-eyebrow">{siteContent.selectedWorkEyebrow}</span><h2><span className="cdx-heading-word">{siteContent.selectedWorkTitleLead}</span> <em className="cdx-heading-word">{siteContent.selectedWorkTitleAccent}</em></h2></div><p className="cdx-reveal-copy">{siteContent.selectedWorkDescription}</p></div>
            <div className="cdx-work-grid cdx-work-grid--featured">
              <span className="cdx-card-orbit cdx-card-orbit--featured" aria-hidden="true" />
              {selectedWorkRow && <WorkCard key={selectedWorkRow.work.id} work={selectedWorkRow.work} project={selectedWorkRow.project} index={works.findIndex(item => item.id === selectedWorkRow.work.id)} open={() => openWork(selectedWorkRow.work)} reduced={reduced} featuredLayout />}
            </div>
          </div>
        </section>

        <Marquee reduced={reduced} text={siteContent.marqueeText} metaLabel={siteContent.marqueeMetaLabel} copyrightLabel={siteContent.marqueeCopyright} />

        <section className="cdx-section cdx-archive" id="archive" aria-label="All portfolio projects">
          <div className="cdx-container">
            <div className="cdx-section-heading cdx-archive-heading"><div><span className="cdx-eyebrow">{siteContent.archiveEyebrow}</span><h2><span className="cdx-heading-word">{siteContent.archiveTitleLead}</span> <em className="cdx-heading-word">{siteContent.archiveTitleAccent}</em></h2></div><p className="cdx-reveal-copy">{siteContent.archiveDescription}</p></div>
            <div className="cdx-filter-sort-row">
              <div className="cdx-filter-bar" role="group" aria-label="Filter projects by category">
                {categories.map(item => {
                  const count = item.value === 'All' ? projectRows.length : projectRows.filter(row => row.project.category === item.value).length;
                  return <button key={item.value} type="button" className={item.value === category ? 'is-active' : ''} aria-pressed={item.value === category} onClick={() => setCategory(item.value)}><span className="cdx-filter-name">{item.label}</span><span className="cdx-filter-count">{count}</span>{item.value === category && <motion.i layoutId="cdx-filter-indicator" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}</button>;
                })}
              </div>
              <label className="cdx-sort-control">{siteContent.sortLabel} <select value={sort} onChange={(event: ReactChangeEvent<HTMLSelectElement>) => setSort(event.target.value as 'newest' | 'views' | 'likes')}><option value="newest">Newest</option><option value="views">Most viewed</option><option value="likes">Most liked</option></select></label>
            </div>
            <motion.div layout className="cdx-work-grid cdx-archive-grid">
              <AnimatePresence mode="popLayout">
                {filteredRows.map((row, index) => <motion.div key={row.work.id} className="cdx-archive-cell" layout initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 0 }} transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}><WorkCard work={row.work} project={row.project} index={works.findIndex(item => item.id === row.work.id)} open={() => openWork(row.work)} reduced={reduced} /></motion.div>)}
              </AnimatePresence>
            </motion.div>
            {filteredRows.length === 0 && <p className="cdx-empty-state">No projects in this category yet.</p>}
          </div>
        </section>

        <section className="cdx-section cdx-services" id="services">
          <div className="cdx-container">
            <div className="cdx-section-heading"><div><span className="cdx-eyebrow">{siteContent.servicesEyebrow}</span><h2><span className="cdx-heading-word">{siteContent.servicesTitleLead}</span> <em className="cdx-heading-word">{siteContent.servicesTitleAccent}</em></h2></div><p className="cdx-reveal-copy">{siteContent.servicesDescription}</p></div>
            <div className="cdx-services-layout" onMouseLeave={() => setServicePreviewActive(false)}
              onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setServicePreviewActive(false); }}>
              <div className="cdx-service-accordion">
                {services.map((service, index) => <button key={service.number} type="button" className={`cdx-service-row ${activeService === index ? 'is-active' : ''}`} aria-expanded={activeService === index}
                  onClick={() => { setActiveService(index); setServicePreviewActive(true); }}
                  onMouseEnter={() => { setActiveService(index); setServicePreviewActive(true); }}
                  onFocus={() => { setActiveService(index); setServicePreviewActive(true); }}
                  data-cursor="VIEW"><span className="cdx-service-number">{service.number}</span><span className="cdx-service-row-copy"><strong>{service.title}</strong><span className="cdx-service-description">{activeService === index ? service.description : siteContent.serviceExploreLabel}</span></span><ArrowUpRight size={20} /></button>)}
              </div>
              <ServiceCategoryPreview row={activeServiceRow} service={activeServiceItem} active={servicePreviewActive} reduced={reduced}
                fallbackEyebrow={siteContent.servicePreviewFallbackEyebrow} fallbackTitle="COMING SOON"
                previewLabel={siteContent.servicePreviewLabel} onOpen={() => openWork(activeServiceRow?.work)} />
            </div>
          </div>
        </section>


        <section className="cdx-section cdx-about" id="about" aria-label="About CrownDEX"><span id="studio" className="cdx-anchor-alias" aria-hidden="true" />
          <div className="cdx-container cdx-about-layout">
            <div className="cdx-about-copy">
              <span className="cdx-eyebrow">{siteContent.aboutEyebrow}</span>
              <h2 className="cdx-about-title" aria-label={`${siteContent.aboutTitleLead} ${siteContent.aboutTitleAccent}`}><span className="cdx-heading-word">{siteContent.aboutTitleLead}</span> <em className="cdx-heading-word cdx-headline-shine">{siteContent.aboutTitleAccent}</em></h2>
              <p className="cdx-reveal-copy">{aboutIntro}</p>
              <p className="cdx-reveal-copy">{aboutSecondary}</p>
              {programs.length > 0 && (
                <div className="cdx-about-affiliations cdx-about-affiliations--inline">
                  <div className="cdx-about-affiliations-heading">
                    <span className="cdx-eyebrow">{siteContent.programsEyebrow}</span>
                    <h3><span className="cdx-heading-word">{siteContent.programsTitleLead}</span> <em className="cdx-heading-word">{siteContent.programsTitleAccent}</em></h3>
                    <p>{siteContent.programsDescription}</p>
                  </div>
                  <div className="cdx-program-grid cdx-about-program-grid">
                    {programs.map(program => <article key={program.id} className="cdx-program-card">
                      <div className="cdx-program-logo">{program.logo_url ? <img src={program.logo_url} alt={`${program.name} logo`} loading="lazy" decoding="async" width={52} height={52} /> : <span>{program.name.slice(0, 1).toUpperCase()}</span>}</div>
                      <div className="cdx-program-copy"><span>{program.role || 'CREATOR PROGRAMME'}</span><h3>{program.name}</h3>{program.description && <p>{program.description}</p>}</div>
                      {program.url && <a href={program.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${program.name}`} data-cursor="VIEW"><ArrowUpRight size={18} /></a>}
                    </article>)}
                  </div>
                </div>
              )}
              <div className="cdx-about-stats">
                <div><strong><CountUp value={publishedCount} reduced={reduced} /></strong><span>{siteContent.aboutStatsFilmsLabel}</span></div>
                {totalViews !== null && <div><strong><CountUp value={totalViews} reduced={reduced} /></strong><span>{siteContent.aboutStatsViewsLabel}</span></div>}
                {yearsCreating !== null && <div><strong><CountUp value={yearsCreating} reduced={reduced} /></strong><span>{siteContent.aboutStatsYearsLabel}</span></div>}
              </div>
              <div className="cdx-toolkit"><span>{siteContent.aboutToolkitLabel}</span><div><b><Sparkles size={14} /> {siteContent.aboutToolkitOne}</b><b><Film size={14} /> {siteContent.aboutToolkitTwo}</b><b><Clock size={14} /> {siteContent.aboutToolkitThree}</b></div></div>
            </div>
            <div className="cdx-about-art">
              <span className="cdx-card-orbit cdx-card-orbit--portrait" aria-hidden="true" />
              <div className="cdx-portrait-glow" />
              <div className="cdx-about-photo-frame">
                {(siteContent.aboutPortraitImageUrl || settings?.avatar_url) ? <img src={siteContent.aboutPortraitImageUrl || settings?.avatar_url || ''} alt="CrownDEX creator portrait" loading="lazy" decoding="async" width={680} height={850} /> : <div className="cdx-about-monogram">CD<span>X</span></div>}
              </div>
              <div className="cdx-portrait-orbit" aria-label="Creator, director, storyteller"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="cdx-portrait-circle" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0" /></defs><text><textPath href="#cdx-portrait-circle">CREATOR · DIRECTOR · STORYTELLER · </textPath></text></svg></div>
              <span className="cdx-portrait-badge" aria-hidden="true"><svg viewBox="0 0 24 24" shapeRendering="crispEdges"><path d="M2 7h4v4h3V5h4v6h3V7h4v11H2V7Z" fill="currentColor" /><path d="M4 20h16" stroke="currentColor" strokeWidth="2" /></svg></span>
              <span className="cdx-portrait-chip cdx-portrait-chip-one">{siteContent.aboutPortraitChipOne}</span>
              <span className="cdx-portrait-chip cdx-portrait-chip-two">{siteContent.aboutPortraitChipTwo}</span>
              {siteContent.aboutPortraitChipThree.trim() && <span className="cdx-portrait-chip cdx-portrait-chip-three"><i /> {siteContent.aboutPortraitChipThree}</span>}
            </div>

          </div>
        </section>

        <section className="cdx-section cdx-contact" id="contact">
          <div className="cdx-container cdx-contact-layout">
            <div className="cdx-contact-copy"><span className="cdx-eyebrow">{siteContent.contactEyebrow.replace(/^06\s*\//, '05 /')}</span><h2><span className="cdx-heading-word">{siteContent.contactTitleLead}</span><br /><em className="cdx-heading-word">{siteContent.contactTitleAccent}</em></h2><p className="cdx-reveal-copy">{siteContent.contactDescription}</p>{effectiveContactEmail && <div className="cdx-contact-links"><a className="cdx-magnetic" href={`mailto:${effectiveContactEmail}`} data-cursor="VIEW"><Mail size={15} /> {siteContent.contactLinkEmailLabel} <ArrowUpRight size={15} /></a><CopyEmailButton email={effectiveContactEmail} label={siteContent.contactCopyEmailLabel} copiedLabel={siteContent.contactCopyEmailCopiedLabel} /></div>}</div>
            <div className="cdx-contact-panel"><ContactForm email={effectiveContactEmail} content={siteContent} /></div>
          </div>
        </section>
      </main>

      <footer className="cdx-footer">
        <div className="cdx-container cdx-footer-inner">
          <div className="cdx-footer-topline"><span>{siteContent.footerLeftLabel}</span><a href="#home" className="cdx-footer-wordmark" data-cursor="VIEW">{siteContent.footerBrand}</a><span>{siteContent.footerRightLabel} · © {new Date().getFullYear()}</span></div>
          <div className="cdx-footer-bottom"><a className="cdx-footer-social cdx-footer-social-x" href={xProfileUrl} target="_blank" rel="noopener noreferrer" data-cursor="VIEW"><span className="cdx-footer-social-icon">𝕏</span><span className="cdx-footer-social-copy"><strong>{siteContent.footerXLabel}</strong><small>{siteContent.footerXHandle}</small></span><ArrowUpRight size={17} /></a><a className="cdx-footer-social cdx-footer-social-telegram" href={telegramUrl} target="_blank" rel="noopener noreferrer" data-cursor="VIEW"><span className="cdx-footer-social-icon"><Send size={19}/></span><span className="cdx-footer-social-copy"><strong>{siteContent.footerTelegramLabel}</strong><small>{siteContent.footerTelegramHandle}</small></span><ArrowUpRight size={17} /></a>{effectiveContactEmail && <a className="cdx-footer-social cdx-footer-social-email" href={`mailto:${effectiveContactEmail}`} data-cursor="VIEW"><span className="cdx-footer-social-icon"><Mail size={18}/></span><span className="cdx-footer-social-copy"><strong>{siteContent.footerEmailLabel}</strong><small>{effectiveContactEmail}</small></span><ArrowUpRight size={17} /></a>}<a href="#home" className="cdx-back-top" aria-label="Back to top"><svg viewBox="0 0 44 44" aria-hidden="true"><circle className="cdx-back-ring-track" cx="22" cy="22" r="18" /><motion.circle className="cdx-back-ring-progress" cx="22" cy="22" r="18" pathLength={progress} /></svg><span>{siteContent.footerBackTopLabel} <ArrowUpRight size={13} /></span></a></div>
        </div>
      </footer>

      <AnimatePresence>
        {activeIndex !== null && works[activeIndex] && projectRows[activeIndex] && <FilmViewer key={works[activeIndex].id} work={works[activeIndex]} project={projectRows[activeIndex].project} allWorks={works} onClose={closeViewer} onPrev={previousWork} onNext={nextWork} />}
      </AnimatePresence>
    </div>
  );
}
