import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent
} from 'react';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring
} from 'framer-motion';

import Lenis from 'lenis';

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Menu,
  Play,
  Send,
  Sparkles,
  X as CloseIcon
} from 'lucide-react';

import worksJson from './data/works.json';
import embedsJson from './data/embeds.generated.json';

type Work = {
  id: string;
  url: string;
  title?: string;
  category: string;
  featured?: boolean;
  thumbnail?: string;
};

type EmbedMeta = {
  text?: string;
  authorName?: string;
  authorUrl?: string;
  fetched?: boolean;
};

const WORKS = worksJson as Work[];
const EMBEDS = embedsJson as Record<string, EmbedMeta>;

const X_PROFILE = 'https://x.com/_CrownDEX';
const TELEGRAM = 'https://t.me/didarul_habib96';

const navLinks = [
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Contact', href: '#contact' }
];

function postId(url: string) {
  return url.match(/status\/(\d+)/)?.[1] ?? '';
}

function workTitle(work: Work, index: number) {
  if (work.title) return work.title;

  const text = EMBEDS[work.id]?.text?.trim();

  if (text) {
    const firstSentence = text.split(/[.!?]\s/)[0];
    return firstSentence.length > 72
      ? firstSentence.slice(0, 69) + '...'
      : firstSentence;
  }

  return `AI Creation ${String(index + 1).padStart(2, '0')}`;
}

function workDescription(work: Work) {
  return EMBEDS[work.id]?.text ||
    'An original AI visual creation by CrownDEX.';
}

type XWidgets = {
  widgets: {
    createTweet: (
      id: string,
      target: HTMLElement,
      options?: Record<string, unknown>
    ) => Promise<HTMLElement | null>;
  };
};

declare global {
  interface Window {
    twttr?: XWidgets;
  }
}

function loadXWidgets(): Promise<XWidgets> {
  if (window.twttr?.widgets) {
    return Promise.resolve(window.twttr);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-crowndex-x]'
    );

    const onReady = () => {
      if (window.twttr?.widgets) {
        resolve(window.twttr);
      } else {
        reject(new Error('X widgets could not initialize.'));
      }
    };

    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('X widget script failed.')),
        { once: true }
      );

      return;
    }

    const script = document.createElement('script');

    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.dataset.crowndexX = 'true';
    script.onload = onReady;
    script.onerror = () => reject(
      new Error('X widget script could not load.')
    );

    document.head.appendChild(script);
  });
}

function Intro({ reduced }: { reduced: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced) {
      setVisible(false);
      return;
    }

    const key = 'crowndex-intro-shown';
    const seen = sessionStorage.getItem(key);

    if (seen) {
      setVisible(false);
      return;
    }

    sessionStorage.setItem(key, '1');

    const timer = window.setTimeout(
      () => setVisible(false),
      1550
    );

    return () => window.clearTimeout(timer);
  }, [reduced]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="intro-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65 }}
        >
          <motion.div
            className="intro-logo"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            CROWN<span>DEX</span>
          </motion.div>

          <div className="intro-line">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1 }}
            />
          </div>

          <span className="intro-caption">
            CREATIVE VISUALS / AI FILMMAKING
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CustomCursor({ reduced }: { reduced: boolean }) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    document.documentElement.classList.add('has-custom-cursor');

    const move = (event: globalThis.MouseEvent) => {
      cursorRef.current?.style.setProperty('--cursor-x', `${event.clientX}px`);
      cursorRef.current?.style.setProperty('--cursor-y', `${event.clientY}px`);
    };

    const hover = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement;
      cursorRef.current?.classList.toggle(
        'cursor-active',
        Boolean(target.closest('[data-cursor="play"]'))
      );
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseover', hover);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', hover);
    };
  }, [reduced]);

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      PLAY
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function WorkCard({
  work,
  index,
  onOpen,
  featured = false
}: {
  work: Work;
  index: number;
  onOpen: () => void;
  featured?: boolean;
}) {
  const title = workTitle(work, index);

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    event.currentTarget.style.setProperty(
      '--mx',
      `${event.clientX - rect.left}px`
    );

    event.currentTarget.style.setProperty(
      '--my',
      `${event.clientY - rect.top}px`
    );
  };

  const thumbnailStyle = work.thumbnail
    ? { backgroundImage: `url("${work.thumbnail}")` }
    : undefined;

  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <motion.article
      className={`work-card ${featured ? 'featured-card' : ''}`}
      data-cursor="play"
      role="button"
      tabIndex={0}
      aria-label={`Play ${title}`}
      onClick={onOpen}
      onKeyDown={handleKey}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay: (index % 3) * 0.08 }}
      whileHover={{ y: -7 }}
    >
      <div
        className={`work-visual visual-${index % 5}`}
        style={thumbnailStyle}
      >
        <div className="visual-topline">
          <span>CDX / {String(index + 1).padStart(2, '0')}</span>
          <span>{work.category}</span>
        </div>

        {!work.thumbnail && (
          <>
            <div className="visual-orb" />
            <div className="visual-ring" />
            <div className="visual-grid" />
          </>
        )}

        <div className="visual-wordmark">
          <span>CROWNDEX</span>
          <strong>{String(index + 1).padStart(2, '0')}</strong>
        </div>

        <div className="play-orb">
          <Play size={19} fill="currentColor" />
        </div>

        <div className="visual-bottomline">
          ORIGINAL AI VISUALS
        </div>
      </div>

      <div className="work-info">
        <div>
          <span className="work-category">{work.category}</span>
          <h3>{title}</h3>
        </div>

        <a
          href={work.url}
          target="_blank"
          rel="noopener noreferrer"
          className="watch-link"
          onClick={(event) => event.stopPropagation()}
        >
          Watch on X <ArrowUpRight size={15} />
        </a>
      </div>
    </motion.article>
  );
}

function XLightbox({
  work,
  onClose
}: {
  work: Work;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'failed'
  >('loading');

  const index = WORKS.indexOf(work);
  const title = workTitle(work, index);

  useEffect(() => {
    const target = containerRef.current;

    if (!target) return;

    let active = true;
    target.innerHTML = '';

    setStatus('loading');

    const id = postId(work.url);

    if (!id) {
      setStatus('failed');
      return;
    }

    loadXWidgets()
      .then(api =>
        api.widgets.createTweet(id, target, {
          theme: 'dark',
          dnt: true,
          conversation: 'none',
          align: 'center'
        })
      )
      .then(result => {
        if (active) {
          setStatus(result ? 'ready' : 'failed');
        }
      })
      .catch(() => {
        if (active) setStatus('failed');
      });

    return () => {
      active = false;
      target.innerHTML = '';
    };
  }, [work]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="lightbox-panel"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, y: 35, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          onClick={event => event.stopPropagation()}
        >
          <div className="lightbox-header">
            <div>
              <span className="eyebrow">CROWNDEX / ORIGINAL WORK</span>
              <h3>{title}</h3>
            </div>

            <button
              className="icon-button"
              onClick={onClose}
              aria-label="Close video"
            >
              <CloseIcon size={21} />
            </button>
          </div>

          <div className="lightbox-stage">
            <div ref={containerRef} className="tweet-container" />

            {status === 'loading' && (
              <div className="embed-message">
                <span className="loading-orb" />
                Loading official X post...
              </div>
            )}

            {status === 'failed' && (
              <div className="embed-fallback">
                <div className="fallback-icon">
                  <Play size={24} />
                </div>

                <h4>Open this creation on X</h4>

                <p>
                  The embedded post could not be displayed.
                  You can still view the original post directly.
                </p>

                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button"
                >
                  Watch on X <ExternalLink size={16} />
                </a>
              </div>
            )}
          </div>

          <div className="lightbox-footer">
            <span>{work.category}</span>

            <a
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original post <ArrowUpRight size={15} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const reduced = useReducedMotion() ?? false;

  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('All Work');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  const { scrollYProgress } = useScroll();

  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true
    });

    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  const categories = useMemo(
    () => [...new Set(WORKS.map(work => work.category))],
    []
  );

  const featured = WORKS.filter(work => work.featured).slice(0, 3);

  const filteredWorks = filter === 'All Work'
    ? WORKS
    : WORKS.filter(work => work.category === filter);

  const openWork = (work: Work) => setSelectedWork(work);
  const closeWork = () => setSelectedWork(null);

  const scrollToWork = () => {
    document.querySelector('#work')?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth'
    });
  };

  return (
    <div className="site-shell">
      <motion.div
        className="scroll-progress"
        style={{ scaleX: progress }}
      />

      <Intro reduced={reduced} />
      <CustomCursor reduced={reduced} />

      {/* NAVIGATION */}

      <header className="navbar">
        <a href="#home" className="brand-logo" aria-label="CrownDEX home">
          CROWN<span>DEX</span><i />
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map(link => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className="nav-cta">
          Hire me <ArrowUpRight size={15} />
        </a>

        <button
          className="mobile-menu-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <CloseIcon /> : <Menu />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            {navLinks.map((link, index) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                {link.label}
                <ArrowUpRight />
              </motion.a>
            ))}

            <a
              href="#contact"
              className="mobile-hire"
              onClick={() => setMenuOpen(false)}
            >
              Let's create something <ArrowUpRight />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* HERO */}

        <section className="hero" id="home">
          <div className="hero-background">
            <div className="hero-grid" />
            <div className="hero-glow hero-glow-one" />
            <div className="hero-glow hero-glow-two" />
            <div className="hero-orbit" />
          </div>

          <div className="hero-content">
            <motion.div
              className="hero-kicker"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <span className="live-dot" />
              INDEPENDENT AI VIDEO CREATOR
            </motion.div>

            <h1>
              <motion.span
                initial={{ opacity: 0, y: 55 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35 }}
              >
                Crafting AI
              </motion.span>

              <motion.span
                className="gradient-text"
                initial={{ opacity: 0, y: 55 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.48 }}
              >
                Worlds.
              </motion.span>

              <motion.span
                initial={{ opacity: 0, y: 55 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.61 }}
              >
                Creating Visual
              </motion.span>

              <motion.span
                className="gradient-text"
                initial={{ opacity: 0, y: 55 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.74 }}
              >
                Impact.
              </motion.span>
            </h1>

            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
            >
              Cinematic AI short films. Product advertisements.
              Visual stories built to capture attention and make
              ideas unforgettable.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.05 }}
            >
              <button className="primary-button" onClick={scrollToWork}>
                Explore my work <ArrowUpRight size={17} />
              </button>

              <a href="#contact" className="secondary-button">
                Let's collaborate <ArrowRight size={17} />
              </a>
            </motion.div>
          </div>

          <div className="hero-bottom">
            <span>AI FILMMAKING / PRODUCT VISUALS / STORYTELLING</span>
            <a href="#work">
              SCROLL TO EXPLORE <ArrowDown size={15} />
            </a>
          </div>
        </section>

        {/* MARQUEE */}

        <div className="marquee-section" aria-label="Creative services">
          <div className="marquee-track">
            {Array.from({ length: 2 }).map((_, i) => (
              <div className="marquee-group" key={i}>
                {[
                  'AI SHORT FILMS',
                  'PRODUCT ADVERTISEMENTS',
                  'VISUAL STORYTELLING',
                  'CINEMATIC MOTION',
                  'CREATIVE CONCEPTS'
                ].map(item => (
                  <span key={item}>
                    {item} <Sparkles size={16} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FEATURED WORK */}

        <section className="section work-section" id="featured">
          <div className="section-topline">
            <SectionHeading
              eyebrow="01 / SELECTED CREATIONS"
              title="Made to be seen."
              description="A selection of AI-powered visuals and cinematic creations."
            />

            <a href="#work" className="text-link">
              Explore all work <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="featured-grid">
            {featured.map((work, index) => (
              <WorkCard
                key={work.id}
                work={work}
                index={index}
                featured
                onOpen={() => openWork(work)}
              />
            ))}
          </div>
        </section>

        {/* ALL WORK */}

        <section className="section all-work-section" id="work">
          <SectionHeading
            eyebrow="02 / THE PORTFOLIO"
            title="The complete picture."
            description="Explore the creative work of CrownDEX. Select a project to open its original X post."
          />

          <div className="filter-bar" aria-label="Filter portfolio">
            {['All Work', ...categories].map(category => (
              <button
                key={category}
                className={filter === category ? 'filter-active' : ''}
                onClick={() => setFilter(category)}
                aria-pressed={filter === category}
              >
                {category}
              </button>
            ))}
          </div>

          <motion.div layout className="work-grid">
            <AnimatePresence mode="popLayout">
              {filteredWorks.map(work => (
                <motion.div
                  layout
                  key={work.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <WorkCard
                    work={work}
                    index={WORKS.indexOf(work)}
                    onOpen={() => openWork(work)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* ABOUT */}

        <section className="section about-section" id="about">
          <div className="about-grid">
            <div className="about-copy">
              <span className="eyebrow">03 / THE CREATOR</span>

              <h2>
                Not just content.
                <br />
                <span className="gradient-text">Visual experiences.</span>
              </h2>

              <p>
                I'm CrownDEX, an independent AI content creator
                focused on cinematic short-form videos and
                product advertising.
              </p>

              <p>
                I turn creative concepts into visual stories
                through AI-assisted image and video creation,
                visual direction and storytelling.
              </p>

              <a
                href={X_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Follow my creative journey <ArrowUpRight size={16} />
              </a>
            </div>

            <div className="about-art">
              <div className="about-art-grid" />
              <div className="about-art-orb" />
              <div className="about-art-ring ring-one" />
              <div className="about-art-ring ring-two" />

              <div className="about-art-label">
                <span>CREATIVE IDENTITY</span>
                <strong>CROWNDEX</strong>
                <small>AI / MOTION / VISUALS</small>
              </div>

              <Sparkles className="about-spark" size={27} />
            </div>
          </div>
        </section>

        {/* SERVICES */}

        <section className="section services-section" id="services">
          <SectionHeading
            eyebrow="04 / WHAT I CREATE"
            title="Creative, without limits."
            description="From the first idea to the final visual, built around the story your brand wants to tell."
          />

          <div className="services-grid">
            {[
              {
                number: '01',
                title: 'AI Product Ads',
                description: 'Attention-grabbing product visuals and cinematic advertisements designed around the product.'
              },
              {
                number: '02',
                title: 'AI Short Films',
                description: 'Original short-form cinematic stories with imaginative worlds and visual storytelling.'
              },
              {
                number: '03',
                title: 'Brand Commercials',
                description: 'Creative video concepts that translate brand identity into memorable visual experiences.'
              },
              {
                number: '04',
                title: 'Concept Development',
                description: 'Creative direction, story concepts and visual planning from an initial idea to a finished direction.'
              }
            ].map(service => (
              <motion.div
                className="service-card"
                key={service.number}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <span className="service-number">{service.number}</span>
                <div className="service-icon"><Sparkles size={21} /></div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ArrowUpRight className="service-arrow" size={19} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* PROCESS */}

        <section className="section process-section" id="process">
          <SectionHeading
            eyebrow="05 / THE WORKFLOW"
            title="From idea to impact."
            description="A simple creative process designed to take an idea from concept to final delivery."
          />

          <div className="process-grid">
            {[
              ['01', 'Brief', 'Understand the goal, audience and creative direction.'],
              ['02', 'Concept', 'Develop the visual idea, hook and storytelling approach.'],
              ['03', 'Create & Edit', 'Generate the visuals and refine the video experience.'],
              ['04', 'Deliver', 'Prepare the final content for its intended platform.']
            ].map(([number, title, description]) => (
              <div className="process-item" key={number}>
                <span className="process-number">{number}</span>
                <div className="process-connector" />
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}

        <section className="section contact-section" id="contact">
          <div className="contact-panel">
            <div className="contact-glow" />

            <span className="eyebrow">06 / LET'S CREATE SOMETHING</span>

            <h2>
              Have an idea?
              <br />
              <span className="gradient-text">Let's make it visual.</span>
            </h2>

            <p>
              Looking for cinematic AI content or a creative
              product advertisement? Let's talk about your next project.
            </p>

            <div className="contact-actions">
              <a
                href={X_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-button"
              >
                Message on X <ArrowUpRight size={17} />
              </a>

              <a
                href={TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-button"
              >
                Telegram <Send size={16} />
              </a>
            </div>

            <div className="contact-bottom">
              <span>OPEN TO CREATIVE CONVERSATIONS</span>
              <span>LET'S BUILD SOMETHING DIFFERENT.</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer className="footer">
        <a href="#home" className="brand-logo">
          CROWN<span>DEX</span><i />
        </a>

        <span className="footer-copy">
          © {new Date().getFullYear()} CrownDEX. All rights reserved.
        </span>

        <div className="footer-socials">
          <a href={X_PROFILE} target="_blank" rel="noopener noreferrer">
            X <ArrowUpRight size={14} />
          </a>

          <a href={TELEGRAM} target="_blank" rel="noopener noreferrer">
            Telegram <ArrowUpRight size={14} />
          </a>

          <a href="#home">
            Back to top <ArrowDown className="back-top-icon" size={14} />
          </a>
        </div>
      </footer>

      <AnimatePresence>
        {selectedWork && (
          <XLightbox
            work={selectedWork}
            onClose={closeWork}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;