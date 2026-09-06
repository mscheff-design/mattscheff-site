// Shared layout-block library for case-study pages.
//
// Each block is a factory that takes a props object and returns a DOM
// subtree, following the same "config in, DOM subtree out" shape as
// index.html's createContactSheet(config). Blocks are exported individually
// (so a single type can be reused/reordered standalone) plus dispatched
// through renderCaseStudyPage, which per-study pages actually call.
//
// isTouchDevice is recomputed here at module scope rather than shared,
// matching the existing per-file idiom in card.js — there is only one
// device the page ever runs on per session.
import { revealOnScroll } from './reveal.js';
import { JOBS } from './jobs.js';

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const LINK_COLOR = 'var(--accent)';

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function mediaEl(media, { eager = false } = {}) {
  if (!media) return null;
  if (media.type === 'video') {
    const video = document.createElement('video');
    video.className = 'cs-media-el';
    video.muted = true;
    video.loop = media.loop !== false;
    video.playsInline = true;
    video.preload = 'none';
    video.autoplay = true;
    if (media.poster) video.poster = media.poster;
    video.dataset.src = media.src;
    return video;
  }
  const img = document.createElement('img');
  img.className = 'cs-media-el';
  img.src = media.src;
  img.alt = media.alt || '';
  img.loading = eager ? 'eager' : 'lazy';
  return img;
}

// ---- block factories --------------------------------------------------

export function heroBlock(props) {
  const wrap = el('div', 'cs-block cs-hero');
  wrap.appendChild(el('div', 'cs-eyebrow', (props.tags || []).join(' · ')));
  wrap.appendChild(el('h1', 'cs-hero-title', props.title || ''));
  if (props.dates) wrap.appendChild(el('div', 'cs-hero-dates', props.dates));
  if (props.summary) wrap.appendChild(el('p', 'cs-hero-summary', props.summary));
  if (props.media) {
    const mediaWrap = el('div', 'cs-hero-media');
    mediaWrap.appendChild(mediaEl(props.media, { eager: true }));
    wrap.appendChild(mediaWrap);
  }
  return wrap;
}

export function textMediaBlock(props) {
  const orientation = props.orientation === 'left' ? 'left' : 'right';
  const wrap = el('div', `cs-block cs-text-media cs-text-media--${orientation}` + (props.thumbnail ? ' cs-text-media--thumb' : ''));
  const text = el('div', 'cs-text-media-text');
  if (props.heading) text.appendChild(el('h2', 'cs-text-media-heading', props.heading));
  if (props.body) text.appendChild(el('p', 'cs-text-media-body', props.body));
  const mediaWrap = el('div', 'cs-text-media-media');
  const media = mediaEl(props.media);
  if (media) mediaWrap.appendChild(media);
  wrap.appendChild(text);
  wrap.appendChild(mediaWrap);
  return wrap;
}

export function textBlock(props) {
  const wrap = el('div', 'cs-block cs-text');
  if (props.heading) wrap.appendChild(el('h2', 'cs-text-heading', props.heading));
  const paragraphs = Array.isArray(props.body) ? props.body : [props.body];
  paragraphs.filter(Boolean).forEach((p) => wrap.appendChild(el('p', 'cs-text-body', p)));
  return wrap;
}

export function fullBleedMediaBlock(props) {
  const wrap = el('div', 'cs-block cs-full-bleed' + (props.theme === 'dark' ? ' cs-full-bleed--dark' : ''));
  const inner = el('div', 'cs-full-bleed-inner');
  const media = mediaEl(props.media);
  if (media && props.scrollable) {
    // scrollable is for a source image far taller than any page could
    // reasonably display at once (e.g. a full-page screenshot) — instead of
    // scaling it down to illegibility, it keeps native width and lets the
    // viewer scroll through it inside a bounded, framed viewport.
    if (props.scrollHint) inner.appendChild(el('div', 'cs-full-bleed-scroll-hint', props.scrollHint));
    const frame = el('div', 'cs-full-bleed-scroll-frame');
    if (props.maxHeight) frame.style.maxHeight = props.maxHeight;
    frame.appendChild(media);
    // the native scrollbar is hidden entirely (CSS) in favor of this custom
    // thin indicator, so its look is consistent regardless of OS/browser
    // scrollbar settings — position/height are driven by real scroll state.
    const track = el('div', 'cs-full-bleed-scroll-track');
    const thumb = el('div', 'cs-full-bleed-scroll-thumb');
    track.appendChild(thumb);
    const updateThumb = () => {
      const trackHeight = track.clientHeight;
      const ratio = frame.clientHeight / frame.scrollHeight;
      const thumbHeight = Math.max(24, ratio * trackHeight);
      const maxScroll = frame.scrollHeight - frame.clientHeight;
      const scrollRatio = maxScroll > 0 ? frame.scrollTop / maxScroll : 0;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.top = `${scrollRatio * (trackHeight - thumbHeight)}px`;
    };
    frame.addEventListener('scroll', updateThumb);
    if (media.tagName === 'IMG') media.addEventListener('load', updateThumb);
    requestAnimationFrame(updateThumb);
    frame.appendChild(track);
    inner.appendChild(frame);
  } else {
    // maxHeight (non-scrollable path) is an escape hatch for a tall/portrait
    // source image (e.g. a scanned document) that would otherwise stretch
    // edge-to-edge at full page height under the default
    // width:100%;object-fit:cover treatment — swaps to object-fit:contain so
    // the whole image stays visible, just bounded shorter.
    if (media && props.maxHeight) {
      media.style.width = 'auto';
      media.style.maxWidth = '100%';
      media.style.maxHeight = props.maxHeight;
      media.style.objectFit = 'contain';
      media.style.margin = '0 auto';
    }
    if (media) inner.appendChild(media);
  }
  if (props.caption) inner.appendChild(el('div', 'cs-full-bleed-caption', props.caption));
  wrap.appendChild(inner);
  return wrap;
}

export function statRowBlock(props) {
  const wrap = el('div', 'cs-block cs-stat-row');
  (props.stats || []).forEach((stat) => {
    const item = el('div', 'cs-stat');
    item.appendChild(el('div', 'cs-stat-value', stat.value));
    item.appendChild(el('div', 'cs-stat-label', stat.label));
    wrap.appendChild(item);
  });
  return wrap;
}

export function quoteBlock(props) {
  const wrap = el('div', 'cs-block cs-quote');
  wrap.appendChild(el('p', 'cs-quote-text', props.text || ''));
  if (props.attribution) wrap.appendChild(el('div', 'cs-quote-attribution', props.attribution));
  return wrap;
}

export function galleryBlock(props) {
  const wrap = el('div', 'cs-block cs-gallery');
  (props.images || []).forEach((image) => {
    const item = el('div', 'cs-gallery-item');
    item.appendChild(mediaEl({ type: 'image', src: image.src, alt: image.alt }));
    wrap.appendChild(item);
  });
  return wrap;
}

// videoTriptych/videoPanel share one "shadowbox" visual language (see their
// shared cs-shadowbox/cs-shadowbox-inner CSS below) — a true-black display
// case (var(--black), not the theme-tinted var(--bg-dark) fullBleedMedia's
// dark variant uses) regardless of which color theme is active.
//
// "Hover for sound" can't be pure CSS — :hover can't touch a video's own
// .muted property — so each tile gets a real mouseenter/mouseleave pair
// that flips .muted directly. Touch has no hover at all, so it swaps to a
// tap-to-toggle affordance instead, matching the isTouchDevice branch
// idiom already used for .cs-gallery/.cs-text-media below.
export function videoTriptychBlock(props) {
  const wrap = el('div', 'cs-block cs-video-triptych cs-shadowbox');
  const grid = el('div', 'cs-video-triptych-grid cs-shadowbox-inner');
  (props.videos || []).slice(0, 3).forEach((item) => {
    const tile = el('div', 'cs-video-tile');
    const video = mediaEl({ type: 'video', src: item.src, poster: item.poster });
    tile.appendChild(video);
    tile.appendChild(el('div', 'cs-video-sound', '🔊 Sound'));
    if (isTouchDevice) {
      tile.addEventListener('click', () => {
        video.muted = !video.muted;
        tile.classList.toggle('is-unmuted', !video.muted);
      });
    } else {
      tile.addEventListener('mouseenter', () => {
        video.muted = false;
        tile.classList.add('is-unmuted');
      });
      tile.addEventListener('mouseleave', () => {
        video.muted = true;
        tile.classList.remove('is-unmuted');
      });
    }
    grid.appendChild(tile);
  });
  wrap.appendChild(grid);
  return wrap;
}

// Single-video counterpart to videoTriptychBlock — same shadowbox, one
// centered vertical tile, and a text annotation that fades in on hover
// (a plain CSS :hover reveal, unlike the triptych's mute toggle, since
// showing/hiding a caption doesn't need to touch the video element at
// all) or on tap on touch devices, via the same isTouchDevice swap.
export function videoPanelBlock(props) {
  const wrap = el('div', 'cs-block cs-video-panel cs-shadowbox');
  const inner = el('div', 'cs-video-panel-inner cs-shadowbox-inner');
  const tile = el('div', 'cs-video-tile cs-video-panel-tile');
  const media = props.video || {};
  tile.appendChild(mediaEl({ type: 'video', src: media.src, poster: media.poster }));
  if (props.annotation) {
    tile.appendChild(el('div', 'cs-video-annotation', props.annotation));
    if (isTouchDevice) {
      tile.addEventListener('click', () => tile.classList.toggle('is-active'));
    }
  }
  inner.appendChild(tile);
  wrap.appendChild(inner);
  return wrap;
}

export function nextProjectBlock(props) {
  const wrap = el('div', 'cs-block cs-next-project');
  const target = props.nextId ? JOBS.find((j) => j.id === props.nextId) : null;
  if (target && target.caseStudyUrl) {
    wrap.appendChild(el('div', 'cs-next-project-label', 'Next'));
    const link = el('a', 'cs-next-project-link', `${target.name} →`);
    link.href = target.caseStudyUrl;
    wrap.appendChild(link);
  } else {
    const link = el('a', 'cs-next-project-link', '← Back to Work');
    link.href = '/#work';
    wrap.appendChild(link);
  }
  return wrap;
}

// Every block used the identical fade-up-16px reveal before this — full-bleed
// images (already the most dramatic/full-width moment on the page) get a
// slower scale-in instead, and quotes get a slower plain fade with no
// vertical motion, since a pull-quote reads better materializing quietly
// than sliding in like a data row. Everything else keeps the default.
const REVEAL_VARIANTS = { fullBleedMedia: 'scale', quote: 'soft' };

const BLOCK_FACTORIES = {
  hero: heroBlock,
  text: textBlock,
  textMedia: textMediaBlock,
  fullBleedMedia: fullBleedMediaBlock,
  statRow: statRowBlock,
  quote: quoteBlock,
  gallery: galleryBlock,
  videoTriptych: videoTriptychBlock,
  videoPanel: videoPanelBlock,
  nextProject: nextProjectBlock
};

function defaultsFromJob(job) {
  return { title: job.name, dates: job.dates, tags: job.tags };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function renderCaseStudyPage(job, config, mountEl) {
  injectStyles();
  const chapters = [];
  (config.blocks || []).forEach(({ type, props }) => {
    const factory = BLOCK_FACTORIES[type];
    if (!factory) {
      console.warn(`Unknown case-study block type: "${type}"`);
      return;
    }
    const mergedProps = type === 'hero' ? { ...defaultsFromJob(job), ...props } : props;
    const node = factory(mergedProps || {});
    // heroBlock uses `title`, not `heading`, so it's naturally excluded here —
    // nextProject is excluded by BLOCK_FACTORIES never reading a `heading` prop.
    // `chapter: true` is an explicit opt-in — most headed blocks are supporting
    // detail, not a narrative beat worth a stop on the chapter rail. The rail
    // label defaults to the section's own heading but can be shortened via
    // `chapterLabel` (e.g. heading "A custom Shopify storefront" → "Website").
    if (mergedProps && mergedProps.heading) {
      node.id = slugify(mergedProps.heading);
      if (mergedProps.chapter) {
        const fullTitle = String(mergedProps.heading).replace(/<[^>]+>/g, '');
        const label = mergedProps.chapterLabel ? String(mergedProps.chapterLabel) : fullTitle;
        chapters.push({ id: node.id, label, fullTitle });
      }
    }
    mountEl.appendChild(node);
    revealOnScroll(node, { variant: REVEAL_VARIANTS[type] });
  });
  if (!isTouchDevice && chapters.length > 2) renderChapterNav(mountEl, chapters);
}

// A fixed, right-edge vertical timeline — a horizontal hash + numeral per
// headed section, evenly spread down the track (not proportional to the
// section's actual page offset, which crowded nearby ticks together). The
// numeral stays permanently visible; the full section title is a bonus that
// reveals only on dock-style magnification toward the cursor, or for
// whichever section is currently in view via IntersectionObserver. Skipped
// on touch (nowhere good for a fixed sidebar on a narrow screen) and hidden
// under 1180px via CSS, where it would start overlapping body text.
function renderChapterNav(mountEl, chapters) {
  const nav = el('nav', 'cs-chapter-nav');
  nav.appendChild(el('div', 'cs-chapter-track'));

  const ticks = chapters.map(({ id, label, fullTitle }, i) => {
    const tick = el('button', 'cs-chapter-tick');
    tick.type = 'button';
    tick.setAttribute('aria-label', fullTitle);
    tick.style.top = `${chapters.length > 1 ? (i / (chapters.length - 1)) * 100 : 50}%`;
    tick.appendChild(el('span', 'cs-chapter-hash'));
    tick.appendChild(el('span', 'cs-chapter-num', String(i + 1).padStart(2, '0')));
    tick.appendChild(el('span', 'cs-chapter-label', label));
    tick.addEventListener('click', () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(tick);
    return { id, tick, label: tick.querySelector('.cs-chapter-label') };
  });
  mountEl.appendChild(nav);

  // Dock-style magnification: ticks within MAGNET_RADIUS of the cursor scale
  // up and their full-title label fades in, falling off with distance; the
  // active section's label stays visible even with the cursor elsewhere.
  const MAGNET_RADIUS = 70;
  nav.addEventListener('mousemove', (e) => {
    ticks.forEach(({ tick, label }) => {
      const rect = tick.getBoundingClientRect();
      const dist = Math.abs(e.clientY - (rect.top + rect.height / 2));
      const proximity = Math.max(0, 1 - dist / MAGNET_RADIUS);
      tick.style.transform = `translate(50%, -50%) scale(${1 + proximity * 0.7})`;
      label.style.opacity = String(Math.max(tick.classList.contains('is-active') ? 1 : 0, proximity));
      label.style.transform = `translateY(-50%) translateX(${(1 - proximity) * 6}px)`;
    });
  });
  nav.addEventListener('mouseleave', () => {
    ticks.forEach(({ tick, label }) => {
      tick.style.transform = '';
      label.style.opacity = tick.classList.contains('is-active') ? '1' : '';
      label.style.transform = '';
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const match = ticks.find((it) => it.id === entry.target.id);
      if (!match) return;
      ticks.forEach((it) => {
        it.tick.classList.remove('is-active');
        it.label.style.opacity = '';
      });
      match.tick.classList.add('is-active');
      match.label.style.opacity = '1';
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  chapters.forEach(({ id }) => {
    const target = document.getElementById(id);
    if (target) observer.observe(target);
  });
}

// ---- styles -------------------------------------------------------------

function injectStyles() {
  if (document.getElementById('case-study-blocks-styles')) return;
  const style = document.createElement('style');
  style.id = 'case-study-blocks-styles';
  style.textContent = `
    .cs-block{max-width:min(880px, 100% - 96px);margin:0 auto;padding:64px 0}

    /* hero */
    .cs-hero{padding-top:140px}
    .cs-eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4);margin-bottom:18px}
    .cs-hero-title{font-family:var(--font-serif);font-weight:400;font-size:clamp(40px,5.5vw,64px);color:var(--ink);margin-bottom:10px;line-height:1.08}
    .cs-hero-dates{font-family:var(--font-mono);font-size:11px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.35);margin-bottom:28px}
    .cs-hero-summary{font-family:var(--font-serif);font-size:19px;line-height:1.6;color:rgba(var(--ink-rgb),0.75);max-width:52ch}
    .cs-hero-media{margin-top:48px;width:100vw;margin-left:calc(50% - 50vw)}
    .cs-hero-media .cs-media-el{width:100%;display:block;object-fit:cover}

    /* plain text (no media slot — for text-forward case studies) */
    .cs-text-heading{font-family:var(--font-serif);font-weight:400;font-size:clamp(24px,3vw,32px);color:var(--ink);margin-bottom:16px}
    .cs-text-body{font-family:var(--font-serif);font-size:17px;line-height:1.65;color:rgba(var(--ink-rgb),0.75);max-width:62ch;margin-bottom:20px}
    .cs-text-body:last-child{margin-bottom:0}

    /* text + media split */
    .cs-text-media{display:flex;gap:64px;align-items:center}
    .cs-text-media--right{flex-direction:row}
    .cs-text-media--left{flex-direction:row-reverse}
    .cs-text-media-text,.cs-text-media-media{flex:1 1 0;min-width:0}
    .cs-text-media-heading{font-family:var(--font-serif);font-weight:400;font-size:clamp(24px,3vw,32px);color:var(--ink);margin-bottom:16px}
    .cs-text-media-body{font-family:var(--font-serif);font-size:17px;line-height:1.65;color:rgba(var(--ink-rgb),0.75)}
    .cs-text-media-media .cs-media-el{width:100%;display:block;border-radius:2px}

    /* thumbnail variant — a small reference image beside the text, not a half-width co-lead */
    .cs-text-media--thumb{align-items:flex-start;gap:40px}
    .cs-text-media--thumb .cs-text-media-text{flex:1 1 auto}
    .cs-text-media--thumb .cs-text-media-media{flex:0 0 240px;width:240px}
    .cs-text-media--thumb .cs-text-media-media .cs-media-el{border:1px solid rgba(var(--ink-rgb),0.12)}

    /* full-bleed media */
    .cs-full-bleed{padding:64px 0;max-width:none}
    .cs-full-bleed-inner{width:100vw;margin-left:calc(50% - 50vw)}
    .cs-full-bleed .cs-media-el{width:100%;display:block;object-fit:cover}
    .cs-full-bleed--dark{background:var(--bg-dark);padding:80px 0}
    .cs-full-bleed--dark .cs-full-bleed-inner{max-width:min(1200px,92vw);margin:0 auto}
    .cs-full-bleed-caption{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.4);margin-top:16px;text-align:center}
    .cs-full-bleed--dark .cs-full-bleed-caption{color:rgba(var(--ink-light-rgb),0.4)}

    /* scrollable full-bleed — a source image far taller than any viewport (e.g. a full-page screenshot) */
    .cs-full-bleed-scroll-hint{font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4);text-align:center;margin-bottom:16px}
    .cs-full-bleed-scroll-frame{position:relative;max-width:min(900px,92vw);margin:0 auto;overflow-y:auto;border:1px solid rgba(var(--ink-rgb),0.15);box-shadow:0 12px 32px rgba(0,0,0,0.18);scrollbar-width:none}
    .cs-full-bleed-scroll-frame::-webkit-scrollbar{display:none}
    .cs-full-bleed-scroll-frame .cs-media-el{width:100%;display:block;object-fit:contain}
    .cs-full-bleed-scroll-track{position:absolute;top:10px;bottom:10px;right:8px;width:3px;background:rgba(var(--ink-rgb),0.08);border-radius:2px;pointer-events:none}
    .cs-full-bleed-scroll-thumb{position:absolute;left:0;width:100%;background:rgba(var(--ink-rgb),0.32);border-radius:2px}

    /* stat row */
    .cs-stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0}
    .cs-stat{padding:0 24px;border-left:0.5px solid rgba(var(--ink-rgb),0.12)}
    .cs-stat:first-child{border-left:none;padding-left:0}
    .cs-stat-value{font-family:var(--font-serif);font-size:40px;color:var(--ink);line-height:1}
    .cs-stat-label{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4);margin-top:10px}

    /* quote */
    .cs-quote{border-left:2px solid ${LINK_COLOR};padding-left:32px}
    .cs-quote-text{font-family:var(--font-serif);font-style:italic;font-size:clamp(24px,3vw,34px);line-height:1.4;color:var(--ink)}
    .cs-quote-attribution{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.4);margin-top:16px}

    /* gallery */
    .cs-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
    .cs-gallery-item .cs-media-el{width:100%;height:100%;display:block;object-fit:cover;border-radius:2px}
    ${isTouchDevice ? `
    .cs-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px}
    .cs-gallery-item{flex:0 0 min(80vw,420px);scroll-snap-align:start}
    ` : ''}

    /* video showcase — shared shadowbox treatment (videoTriptych + videoPanel) */
    .cs-shadowbox{max-width:none;background:var(--black);padding:64px 0}
    .cs-shadowbox-inner{max-width:min(1100px,92vw);margin:0 auto;padding:0 24px;box-sizing:border-box}
    .cs-video-tile{position:relative;aspect-ratio:9/16;overflow:hidden;background:#000;box-shadow:inset 0 0 32px rgba(0,0,0,0.6)}
    .cs-video-tile .cs-media-el{width:100%;height:100%;display:block;object-fit:cover}
    .cs-video-sound{position:absolute;right:10px;bottom:10px;font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);background:rgba(0,0,0,0.4);padding:4px 8px;border-radius:2px;pointer-events:none;transition:color 0.2s ease,background-color 0.2s ease}
    .cs-video-tile:hover .cs-video-sound,.cs-video-tile.is-unmuted .cs-video-sound{color:#fff;background:rgba(0,0,0,0.7)}

    .cs-video-triptych-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}

    .cs-video-panel-inner{max-width:min(420px,80vw)}
    .cs-video-annotation{position:absolute;left:0;right:0;bottom:0;padding:18px 16px;background:linear-gradient(to top,rgba(0,0,0,0.85),transparent);font-family:var(--font-mono);font-size:11px;line-height:1.5;letter-spacing:0.02em;color:#fff;opacity:0;transform:translateY(6px);transition:opacity 0.25s ease,transform 0.25s ease;pointer-events:none}
    .cs-video-panel-tile:hover .cs-video-annotation,.cs-video-panel-tile.is-active .cs-video-annotation{opacity:1;transform:translateY(0)}

    ${isTouchDevice ? `
    .cs-video-triptych-grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px}
    .cs-video-triptych-grid .cs-video-tile{flex:0 0 min(70vw,300px);scroll-snap-align:start}
    ` : ''}

    /* chapter nav — fixed vertical timeline, right edge, evenly spaced hash
       ticks for a curated set of narrative beats (opt in via chapter:true) */
    .cs-chapter-nav{position:fixed;left:auto;right:26px;top:16vh;bottom:16vh;z-index:30;width:1px;padding:0;display:block;background:none;mix-blend-mode:normal}
    .cs-chapter-track{position:absolute;top:0;bottom:0;right:0;width:1px;background:rgba(var(--ink-rgb),0.12)}
    .cs-chapter-tick{position:absolute;right:0;top:0;transform:translate(50%,-50%);display:flex;flex-direction:row-reverse;align-items:center;gap:10px;background:none;border:none;padding:8px;cursor:pointer;transition:transform 0.15s ease-out}
    .cs-chapter-hash{display:block;width:12px;height:1px;background:rgba(var(--ink-rgb),0.4);transition:width 0.15s ease,background-color 0.15s ease}
    .cs-chapter-tick.is-active .cs-chapter-hash{width:20px;background:var(--ink)}
    .cs-chapter-num{font-family:var(--font-mono);font-size:10px;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.55);width:16px;text-align:right;pointer-events:none;transition:color 0.15s ease}
    .cs-chapter-tick.is-active .cs-chapter-num{color:var(--ink)}
    /* label is taken out of flex flow entirely (position:absolute) so its text
       width — which varies per chapter — can never affect the tick's own box
       size, which the translate(50%,-50%) centering above is relative to;
       without this, a long hidden title could shove the always-visible
       hash+numeral off past the track (and off-screen) for that one tick. */
    .cs-chapter-label{position:absolute;top:50%;right:100%;transform:translateY(-50%);margin-right:2px;font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.6);opacity:0;white-space:nowrap;transition:opacity 0.15s ease;pointer-events:none}
    .cs-chapter-tick.is-active .cs-chapter-label{color:var(--ink)}
    @media (max-width:1180px){.cs-chapter-nav{display:none}}

    /* next project */
    .cs-next-project{text-align:center;border-top:0.5px solid rgba(var(--ink-rgb),0.12);padding-top:56px;padding-bottom:96px}
    .cs-next-project-label{font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.35);margin-bottom:12px}
    .cs-next-project-link{font-family:var(--font-mono);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${LINK_COLOR};text-decoration:none;transition:opacity 0.2s ease}
    .cs-next-project-link:hover{opacity:0.65}

    ${isTouchDevice ? `
    .cs-text-media{flex-direction:column !important;gap:24px}
    .cs-hero{padding-top:100px}
    ` : ''}
  `;
  document.head.appendChild(style);
}
