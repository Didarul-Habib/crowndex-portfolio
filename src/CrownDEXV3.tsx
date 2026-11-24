import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import Lenis from 'lenis';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, ExternalLink, Film, Menu, MoveUpRight, Play, Sparkles, X } from 'lucide-react';
import worksData from './data/works.json';
import embedData from './data/embeds.generated.json';

type Work = { id: string; url: string; title?: string; category: string; featured?: boolean; thumbnail?: string };
type Embed = { text?: string; authorName?: string; fetched?: boolean };
const works = worksData as Work[];
const embeds = embedData as Record<string, Embed>;
const xProfile = 'https://x.com/_CrownDEX';
const telegram = 'https://t.me/didarul_habib96';
const nav = [{ label: 'Work', href: '#work' }, { label: 'About', href: '#studio' }, { label: 'Services', href: '#services' }, { label: 'Contact', href: '#contact' }];

function titleFor(work: Work, idx: number) {
  if (work.title?.trim()) return work.title.trim();
  const text = embeds[work.id]?.text?.trim();
  if (text) return text.length > 74 ? `${text.slice(0, 71).trimEnd()}…` : text;
  return `AI visual story ${String(idx + 1).padStart(2, '0')}`;
}
function idFor(url: string) { return /\/status\/(\d+)/.exec(url)?.[1] ?? ''; }
function scrollTo(id: string, reduced: boolean) { document.querySelector(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }

type XWidgets = { widgets: { createTweet: (id: string, el: HTMLElement, options: Record<string, unknown>) => Promise<HTMLElement | null> } };
let widgetPromise: Promise<XWidgets> | null = null;
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
  }).catch(error => { widgetPromise = null; throw error; });
  return widgetPromise;
}


/** Site-wide original "signal field": low-cost canvas rendering with gentle cursor parallax.
 *  This is decorative; animation stops in hidden tabs and for reduced-motion users. */
type SignalDot = { x: number; y: number; radius: number; phase: number; speed: number; tint: number; depth: number };
function SignalField({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reduced) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let width = 0, height = 0, dpr = 1, frame = 0, last = 0;
    let dots: SignalDot[] = [];
    let mx = -9999, my = -9999;
    let visible = document.visibilityState === 'visible';
    let seed = 912847;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 912847;
      dots = Array.from({ length: Math.min(100, Math.round(width / 18)) }, () => ({
        x: random() * width, y: random() * height, radius: .55 + random() * 1.5,
        phase: random() * Math.PI * 2, speed: .4 + random() * 1.3,
        tint: Math.floor(random() * 3), depth: .15 + random() * .85
      }));
    };
    const move = (event: PointerEvent) => { mx = event.clientX; my = event.clientY; };
    const leave = () => { mx = -9999; my = -9999; };
    const visibility = () => { visible = document.visibilityState === 'visible'; if (visible) last = 0; };
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || now - last < 32) return; // cap at approximately 30 fps
      last = now;
      ctx.clearRect(0, 0, width, height);
      const t = now / 1000;
      for (const dot of dots) {
        const dx = mx - dot.x, dy = my - dot.y;
        const distance = Math.hypot(dx, dy);
        const influence = fine && distance < 210 ? (1 - distance / 210) ** 2 * dot.depth : 0;
        const driftX = Math.sin(t * .24 * dot.speed + dot.phase) * 12 * dot.depth;
        const driftY = Math.cos(t * .17 * dot.speed + dot.phase) * 11 * dot.depth;
        const drawX = dot.x + driftX - dx * influence * .12;
        const drawY = dot.y + driftY - dy * influence * .12;
        const alpha = .12 + .30 * (.5 + .5 * Math.sin(t * dot.speed + dot.phase)) + influence * .35;
        const hue = dot.tint === 0 ? '183,145,255' : dot.tint === 1 ? '109,232,237' : '255,119,183';
        ctx.fillStyle = `rgba(${hue},${Math.min(alpha,.76)})`;
        ctx.beginPath(); ctx.arc(drawX, drawY, dot.radius + influence * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      // Deliberate editorial light sweep, not a copied particle trajectory.
      for (let i = 0; i < 2; i++) {
        const u = (t * (.052 + i * .013) + .35 * i) % 1;
        const sx = width * (1.2 - 1.45 * u);
        const sy = height * (.10 + .60 * u) + i * 80;
        const grad = ctx.createLinearGradient(sx - 75, sy - 20, sx + 6, sy + 2);
        grad.addColorStop(0, 'rgba(164,123,255,0)');
        grad.addColorStop(.85, i ? 'rgba(110,223,232,.15)' : 'rgba(222,140,255,.19)');
        grad.addColorStop(1, 'rgba(255,255,255,.35)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx - 75, sy - 20); ctx.lineTo(sx + 6, sy + 2); ctx.stroke();
      }
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (fine) { window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerleave', leave); }
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [reduced]);
  return <canvas className="cdx-signal-field" ref={canvasRef} aria-hidden="true" />;
}

function LightCursor({ reduced }: { reduced: boolean }) {
  const halo = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const h = halo.current; const c = core.current;
    if (!h || !c) return;
    let x = -400, y = -400, tx = -400, ty = -400, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      const target = e.target;
      const interactive = target instanceof Element && Boolean(target.closest('a,button,[role="button"]'));
      h.classList.toggle('cdx-pointer-active', interactive);
      c.classList.toggle('cdx-pointer-active', interactive);
      c.textContent = target instanceof Element && target.closest('.cdx-poster-button') ? 'PLAY' : '';
    };
    const animate = () => {
      x += (tx - x) * .13; y += (ty - y) * .13;
      h.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      c.style.transform = `translate3d(${tx}px,${ty}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(animate);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, [reduced]);
  return <><div className="cdx-pointer-light" ref={halo} aria-hidden="true"/><div className="cdx-pointer-dot" ref={core} aria-hidden="true"/></>;
}

function useSectionChoreography(reduced: boolean) {
  useEffect(() => {
    if (reduced || !('IntersectionObserver' in window)) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      '.cdx-section-heading, .cdx-about-copy, .cdx-about-art, .cdx-contact > h2, .cdx-story-step'
    ));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('cdx-is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    targets.forEach(el => { el.classList.add('cdx-reveal'); observer.observe(el); });
    return () => { observer.disconnect(); targets.forEach(el => el.classList.remove('cdx-reveal')); };
  }, [reduced]);
}

function StudioIdentity() {
  return <div className="cdx-identity-card" aria-label="CrownDEX studio identity">
    <div className="cdx-identity-orbit" />
    <div className="cdx-identity-grid" />
    <div className="cdx-identity-lens" />
    <span className="cdx-identity-label">THE PERSON BEHIND THE FRAMES</span>
    <div className="cdx-identity-mark">C<span>D</span><i>X</i></div>
    <div className="cdx-identity-caption"><span>CREATIVE IDENTITY / CROWNDEX</span><strong>STORY-FIRST. FRAME-OBSESSED.</strong></div>
    <span className="cdx-identity-corner">EST. IN IMAGINATION / ∞</span>
  </div>;
}

function Intro({ reduced }: { reduced: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (reduced || sessionStorage.getItem('crowndex-signal-intro')) return;
    sessionStorage.setItem('crowndex-signal-intro', '1');
    setOpen(true);
    const timer = window.setTimeout(() => setOpen(false), 1450);
    return () => window.clearTimeout(timer);
  }, [reduced]);
  return <AnimatePresence>{open && <motion.div className="cdx-intro" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45 }}>
    <motion.div initial={{ opacity: 0, letterSpacing: '0.8em' }} animate={{ opacity: 1, letterSpacing: '-.065em' }} transition={{ duration: .8 }} className="cdx-intro-name">CROWN<span>DEX</span></motion.div>
    <div className="cdx-intro-rule"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1 }} /></div>
    <button onClick={() => setOpen(false)}>SKIP INTRO <ArrowUpRight size={12}/></button>
  </motion.div>}</AnimatePresence>;
}

function Poster({ work, index, compact = false }: { work: Work; index: number; compact?: boolean }) {
  return <div className={`cdx-poster cdx-palette-${index % 5} ${work.thumbnail ? 'cdx-has-thumb' : ''}`} style={work.thumbnail ? { backgroundImage: `url("${work.thumbnail}")` } : undefined}>
    <div className="cdx-poster-grid" aria-hidden="true"/>
    {!work.thumbnail && <><div className="cdx-poster-disc"/><div className="cdx-poster-ring"/><div className="cdx-poster-streak"/></>}
    <div className="cdx-poster-header"><span>CDX / {String(index + 1).padStart(2, '0')}</span><span>VISUAL FILE</span></div>
    <div className="cdx-poster-center"><span>{work.category}</span><b>{compact ? 'C/D' : 'CROWN / DEX'}</b></div>
    <div className="cdx-poster-bottom"><span>ORIGINAL CREATIVE WORK</span><span>↗</span></div>
  </div>;
}

function WorkCard({ work, index, open, big = false }: { work: Work; index: number; open: () => void; big?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  function tilt(event: ReactMouseEvent<HTMLDivElement>) {
    if (reduced || !window.matchMedia('(hover: hover)').matches || !ref.current) return;
    const r = event.currentTarget.getBoundingClientRect();
    const xp = (event.clientX - r.left) / r.width;
    const yp = (event.clientY - r.top) / r.height;
    ref.current.style.setProperty('--tilt-x', `${((.5 - yp) * 7).toFixed(2)}deg`);
    ref.current.style.setProperty('--tilt-y', `${((xp - .5) * 7).toFixed(2)}deg`);
    ref.current.style.setProperty('--mx', `${(xp * 100).toFixed(2)}%`);
    ref.current.style.setProperty('--my', `${(yp * 100).toFixed(2)}%`);
  }
  const reset = () => { if (ref.current) { ref.current.style.setProperty('--tilt-x', '0deg'); ref.current.style.setProperty('--tilt-y', '0deg'); } };
  return <motion.article className={`cdx-work-card ${big ? 'cdx-work-big' : ''}`} initial={{ opacity: 0, y: 44 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .13 }} transition={{ duration: .66 }}>
    <div className="cdx-tilt" ref={ref} onMouseMove={tilt} onMouseLeave={reset}>
      <button className="cdx-poster-button" type="button" onClick={open} aria-label={`Play ${titleFor(work, index)}`}>
        <Poster work={work} index={index}/><span className="cdx-card-shine" aria-hidden="true"/><span className="cdx-card-corner" aria-hidden="true">VIEW THE FILM ↗</span>
        <span className="cdx-poster-play"><Play fill="currentColor" size={19}/><span>PLAY FILM</span></span>
      </button>
      <div className="cdx-work-meta"><div><span className="cdx-overline">{work.category} <i/> PROJECT {String(index + 1).padStart(2, '0')}</span><h3>{titleFor(work, index)}</h3></div><a href={work.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${titleFor(work, index)} on X`}><ArrowUpRight size={20}/></a></div>
    </div>
  </motion.article>;
}

function FilmViewer({ work, onClose, onPrev, onNext }: { work: Work; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  const embedRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'loading'|'ready'|'failed'>('loading');
  const index = works.findIndex(w => w.id === work.id);
  useEffect(() => {
    const old = document.body.style.overflow;
    const prior = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'Tab') {
        const buttons = Array.from(document.querySelectorAll<HTMLElement>('.cdx-film-modal button, .cdx-film-modal a'));
        const visible = buttons.filter(el => !el.hasAttribute('disabled'));
        if (visible.length) {
          if (e.shiftKey && document.activeElement === visible[0]) { e.preventDefault(); visible[visible.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === visible[visible.length - 1]) { e.preventDefault(); visible[0].focus(); }
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', key); prior?.focus(); };
  }, [onClose, onPrev, onNext]);
  useEffect(() => {
    const el = embedRef.current;
    if (!el) return;
    let alive = true;
    let timedOut = false;
    el.innerHTML = '';
    setState('loading');
    const id = idFor(work.url);
    if (!id) { setState('failed'); return; }
    const timer = window.setTimeout(() => { if (alive) { timedOut = true; setState('failed'); } }, 14000);
    getXWidgets().then(api => api.widgets.createTweet(id, el, { theme: 'dark', dnt: true, conversation: 'none', align: 'center' }))
      .then(iframe => { if (alive && !timedOut) { clearTimeout(timer); setState(iframe ? 'ready' : 'failed'); } })
      .catch(() => { if (alive && !timedOut) { clearTimeout(timer); setState('failed'); } });
    return () => { alive = false; clearTimeout(timer); el.innerHTML = ''; };
  }, [work]);
  return <motion.div className="cdx-film-shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section role="dialog" aria-modal="true" aria-label={`Watch ${titleFor(work, index)}`} className="cdx-film-modal" initial={{ y: 36, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: .3 }}>
      <div className="cdx-film-head"><div><span className="cdx-overline">NOW SHOWING / {String(index + 1).padStart(2, '0')} OF {String(works.length).padStart(2, '0')}</span><h3>{titleFor(work, index)}</h3></div><button ref={closeRef} onClick={onClose} aria-label="Close viewer"><X size={22}/></button></div>
      <div className="cdx-film-stage"><div ref={embedRef} className="cdx-x-frame"/>{state === 'loading' && <div className="cdx-film-message"><span className="cdx-spinner"/>Opening the official X player…</div>}{state === 'failed' && <div className="cdx-film-fallback"><Film size={34}/><h4>Watch the original on X</h4><p>The embedded player is unavailable here, but the original post can still be opened.</p><a href={work.url} target="_blank" rel="noopener noreferrer">VIEW ON X <ExternalLink size={16}/></a></div>}</div>
      <div className="cdx-film-foot"><div className="cdx-film-controls"><button onClick={onPrev} aria-label="Previous project"><ChevronLeft/></button><button onClick={onNext} aria-label="Next project"><ChevronRight/></button></div><a href={work.url} target="_blank" rel="noopener noreferrer">OPEN POST ON X <ArrowUpRight size={16}/></a></div>
    </motion.section>
  </motion.div>;
}

function HeroArtwork({ onOpen }: { onOpen: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const r = useRef<HTMLDivElement>(null);
  function move(e: ReactMouseEvent<HTMLDivElement>) {
    if (reduced || !r.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    r.current.style.setProperty('--px', `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
    r.current.style.setProperty('--py', `${((e.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
  }
  return <div className="cdx-art" ref={r} onMouseMove={move} aria-label="CrownDEX cinematic motion artwork">
    <div className="cdx-art-orbit cdx-orbit-one"/><div className="cdx-art-orbit cdx-orbit-two"/>
    <div className="cdx-art-axis cdx-axis-v"/><div className="cdx-art-axis cdx-axis-h"/>
    <div className="cdx-art-aura"/><div className="cdx-art-satellite cdx-art-satellite-one"/><div className="cdx-art-satellite cdx-art-satellite-two"/>
    <motion.div className="cdx-art-frame" animate={reduced ? undefined : { y: [0, -9, 0], rotate: [-1, 1, -1] }} transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}>
      <div className="cdx-art-top"><span>CDX / MOTION STUDIES</span><span>● RECORDING</span></div>
      <div className="cdx-art-visual"><div className="cdx-art-prism"/><div className="cdx-art-ellipse"/><div className="cdx-art-noise"/><span>IDEAS INTO</span><b>FRAMES.</b></div>
      <div className="cdx-art-bottom"><span>EST. IN IMAGINATION</span><span>01 — ∞</span></div>
    </motion.div>
    <motion.div className="cdx-art-note cdx-note-a" animate={reduced ? undefined : { y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}><Sparkles size={16}/><span>VISUAL DIRECTION<br/><strong>Beyond ordinary.</strong></span></motion.div>
    <motion.div className="cdx-art-note cdx-note-b" animate={reduced ? undefined : { y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}><span className="cdx-note-pulse"/><span>ORIGINAL<br/><strong>AI CREATIONS</strong></span></motion.div>
    <button onClick={onOpen} className="cdx-art-play" aria-label="Explore featured project"><Play size={17} fill="currentColor"/> FEATURED PROJECT <ArrowUpRight size={15}/></button>
  </div>;
}

export default function CrownDEXV3() {
  const reduced = useReducedMotion() ?? false;
  useSectionChoreography(reduced);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 25 });
  const [menu, setMenu] = useState(false);
  const [category, setCategory] = useState('All');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const featured = works.filter(w => w.featured).slice(0, 3);
  const categories = useMemo(() => ['All', ...Array.from(new Set(works.map(w => w.category)))], []);
  const filtered = category === 'All' ? works : works.filter(w => w.category === category);
  const close = () => setActiveIndex(null);
  const prev = () => setActiveIndex(i => i === null ? null : (i + works.length - 1) % works.length);
  const next = () => setActiveIndex(i => i === null ? null : (i + 1) % works.length);
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    let frame = 0;
    const tick = (time: number) => { lenis.raf(time); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, [reduced]);
  useEffect(() => { document.body.classList.toggle('cdx-menu-open', menu); return () => document.body.classList.remove('cdx-menu-open'); }, [menu]);
  return <div className="cdx-site">
    <SignalField reduced={reduced}/><LightCursor reduced={reduced}/>
    <div className="cdx-aurora cdx-aurora-a" aria-hidden="true"/><div className="cdx-aurora cdx-aurora-b" aria-hidden="true"/>
    <motion.div className="cdx-progress" style={{ scaleX: progress }}/>
    <Intro reduced={reduced}/>
    <header className="cdx-header"><a href="#home" className="cdx-logo" onClick={() => setMenu(false)}>CROWN<span>DEX</span><i/></a>
      <nav className="cdx-nav" aria-label="Main navigation">{nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <a href={telegram} className="cdx-header-cta" target="_blank" rel="noopener noreferrer">LET'S TALK <ArrowUpRight size={15}/></a>
      <button className="cdx-menu-button" aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </header>
    <AnimatePresence>{menu && <motion.nav className="cdx-mobile-nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Mobile navigation">{nav.map((item, i) => <motion.a key={item.href} href={item.href} onClick={() => setMenu(false)} initial={{ x: -25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .07 * i }}>{item.label}<ArrowUpRight/></motion.a>)}</motion.nav>}</AnimatePresence>
    <main>
      <section className="cdx-hero cdx-v3-hero" id="home"><div className="cdx-hero-ghost" aria-hidden="true">C/D</div><div className="cdx-hero-grid"/><div className="cdx-hero-beam"/>
        <div className="cdx-hero-layout"><div className="cdx-hero-copy"><motion.div className="cdx-kicker" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 }}><i/> INDEPENDENT AI FILMMAKER / CREATIVE STUDIO</motion.div>
          <div className="cdx-persona-line"><span className="cdx-persona-icon">CD<span>X</span></span><span>INDEPENDENT AI VIDEO CREATOR<br/><strong>VISUALS / STORIES / MOTION</strong></span><span className="cdx-persona-pulse"/></div>
          <h1 aria-label="CrownDEX. The impossible, made visible.">
            <motion.span className="cdx-title-brand" initial={{ opacity: 0, y: 70, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: .95, delay: .18 }}>CROWN<em>DEX</em></motion.span>
            <motion.span className="cdx-title-small" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .38 }}>THE IMPOSSIBLE</motion.span>
            <motion.span className="cdx-title-outlined" initial={{ opacity: 0, y: 65 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .55 }}>MADE <em>VISIBLE.</em></motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .8 }}>An independent creative studio turning impossible ideas into cinematic AI films, high-impact product visuals, and stories worth watching twice.</motion.p>
          <motion.div className="cdx-hero-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .94 }}><button className="cdx-button-main" onClick={() => scrollTo('#work', reduced)}>EXPLORE THE FILMS <ArrowUpRight size={17}/></button><a href={xProfile} target="_blank" rel="noopener noreferrer" className="cdx-button-ghost">FIND ME ON X <ArrowRight size={16}/></a></motion.div>
          <div className="cdx-hero-stat"><span><b>{String(works.length).padStart(2, '0')}</b> SHOWCASED PROJECTS</span><span className="cdx-hero-stat-divider"/><span>01 CREATIVE VISION</span></div>
        </div><HeroArtwork onOpen={() => works.length && setActiveIndex(works.findIndex(w => w.id === (featured[0]?.id || works[0].id)))}/></div>
        <div className="cdx-hero-floor"><span>SCROLL TO ENTER THE STUDIO</span><ArrowDownRight size={18}/><span className="cdx-floor-right">© {new Date().getFullYear()} CROWNDEX / ALL ORIGINAL WORK</span></div>
      </section>
      <div className="cdx-marquee" aria-label="Creative disciplines"><div className="cdx-marquee-track">{Array.from({length: 2}).map((_,i) => <div className="cdx-marquee-group" key={i}>{['AI SHORT FILMS', 'PRODUCT ADVERTISEMENTS', 'CINEMATIC MOTION', 'CREATIVE DIRECTION', 'VISUAL WORLDS'].map(name => <span key={name}>{name}<b>✳</b></span>)}</div>)}</div></div>
      <section className="cdx-section cdx-selected" id="selected"><div className="cdx-section-heading"><div><span className="cdx-overline">01 / THE SELECTED REEL</span><h2>Frames with <em>feeling.</em></h2></div><p>A few frames from the CrownDEX universe. Each one leads to the original creation on X.</p></div><div className="cdx-selected-grid">{featured.map(w => <WorkCard key={w.id} work={w} index={works.indexOf(w)} big={w.id === featured[0]?.id} open={() => setActiveIndex(works.indexOf(w))}/>)}</div></section>
      <section className="cdx-section cdx-all" id="work"><div className="cdx-section-heading"><div><span className="cdx-overline">02 / EVERY CREATION</span><h2>The moving <em>archive.</em></h2></div><p>Watch through the official X player, or jump straight to the original post.</p></div><div className="cdx-filter-bar" role="group" aria-label="Project categories">{categories.map(c => <button key={c} className={c === category ? 'cdx-filter-active' : ''} aria-pressed={c === category} onClick={() => setCategory(c)}>{c} <span>{c === 'All' ? works.length : works.filter(w => w.category === c).length}</span></button>)}</div><motion.div layout className="cdx-all-grid"><AnimatePresence mode="popLayout">{filtered.map(w => <motion.div key={w.id} layout initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .94 }} transition={{ duration: .3 }}><WorkCard work={w} index={works.indexOf(w)} open={() => setActiveIndex(works.indexOf(w))}/></motion.div>)}</AnimatePresence></motion.div></section>
      <section className="cdx-section cdx-about cdx-v3-about" id="studio">
        <div className="cdx-about-art"><StudioIdentity/></div>
        <div className="cdx-about-copy">
          <span className="cdx-overline">03 / THE MIND BEHIND THE MOTION</span>
          <h2>Not content.<br/><em>An experience.</em></h2>
          <p>I’m CrownDEX — an independent AI video creator exploring the space between imagination and cinema. I build short visual stories, product films and experimental worlds with a clear idea behind every frame.</p>
          <p>My approach is simple: start with a strong concept, shape the visual language, then refine the final cut until the story feels intentional.</p>
          <div className="cdx-about-values">
            <div><span>THE FOCUS</span><strong>Film-first storytelling</strong></div>
            <div><span>THE STYLE</span><strong>Bold but considered</strong></div>
            <div><span>THE PLATFORM</span><strong>Made for real audiences</strong></div>
          </div>
          <div className="cdx-skill-tags">{['AI SHORT FILMS','PRODUCT AD VISUALS','CREATIVE DIRECTION','VISUAL EXPERIMENTS'].map(t => <span key={t}>{t}</span>)}</div>
          <div className="cdx-about-links"><a href={xProfile} target="_blank" rel="noopener noreferrer" className="cdx-inline-link">FOLLOW THE WORK ON X <ArrowUpRight size={18}/></a><a href={telegram} target="_blank" rel="noopener noreferrer" className="cdx-inline-link">LET’S COLLABORATE <ArrowUpRight size={18}/></a></div>
        </div>
      </section>
      <section className="cdx-story-section" aria-label="Creative process">
        <div className="cdx-story-heading"><span className="cdx-overline">04 / HOW THE MAGIC HAPPENS</span><h2>FROM SPARK <em>TO SCREEN.</em></h2></div>
        <div className="cdx-story-grid">
          <div className="cdx-story-step"><span>01 / DISCOVER</span><strong>THE IDEA.</strong><p>Find the emotion, the hook, and the creative angle.</p></div>
          <div className="cdx-story-step"><span>02 / DESIGN</span><strong>THE WORLD.</strong><p>Explore cinematic language, motion and composition.</p></div>
          <div className="cdx-story-step"><span>03 / REFINE</span><strong>THE FILM.</strong><p>Shape the edit and sound around the story.</p></div>
        </div>
      </section>
      <section className="cdx-section cdx-services" id="services"><div className="cdx-section-heading"><div><span className="cdx-overline">05 / WHAT I BRING TO LIFE</span><h2>Built to <em>stand out.</em></h2></div><p>From the first wild idea to the final cinematic frame.</p></div><div className="cdx-service-grid">{[['01','AI PRODUCT CAMPAIGNS','Product-focused visuals and short advertisements designed to make an impression.'],['02','CINEMATIC SHORT FILMS','Character, atmosphere and storytelling translated into expressive AI videos.'],['03','BRAND STORYTELLING','Ideas shaped around brand personality, tone, and visual identity.'],['04','CONCEPT → FINAL CUT','Concept development, visual direction and creative refinement.']].map(([n, t, d]) => <motion.div key={n} whileHover={{ y: -7 }} className="cdx-service"><div><span>{n} /</span><MoveUpRight size={22}/></div><h3>{t}</h3><p>{d}</p></motion.div>)}</div></section>
      <section className="cdx-contact" id="contact"><div className="cdx-contact-glow"/><span className="cdx-overline">06 / NEXT PROJECT</span><h2>GOT A<br/><em>WILD IDEA?</em></h2><p>Let’s turn it into something worth replaying.</p><div className="cdx-contact-buttons"><a className="cdx-button-main" href={telegram} target="_blank" rel="noopener noreferrer">START A CONVERSATION <ArrowUpRight size={18}/></a><a className="cdx-button-ghost" href={xProfile} target="_blank" rel="noopener noreferrer">CONNECT ON X <ArrowRight size={16}/></a></div><div className="cdx-contact-stamp">CROWNDEX <Check size={17}/> READY FOR YOUR NEXT BRIEF</div></section>
    </main>
    <footer className="cdx-footer"><a href="#home" className="cdx-logo">CROWN<span>DEX</span><i/></a><span>© {new Date().getFullYear()} CROWNDEX / INDEPENDENT AI CREATOR</span><div><a href={xProfile} target="_blank" rel="noopener noreferrer">X <ArrowUpRight size={14}/></a><a href={telegram} target="_blank" rel="noopener noreferrer">TELEGRAM <ArrowUpRight size={14}/></a><a href="#home">BACK TO TOP ↑</a></div></footer>
    <AnimatePresence>{activeIndex !== null && works[activeIndex] && <FilmViewer key={works[activeIndex].id} work={works[activeIndex]} onClose={close} onPrev={prev} onNext={next}/>}</AnimatePresence>
  </div>;
}
