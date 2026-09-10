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
  if (media.type === 'html') {
    // A real HTML document (e.g. an exported Mailchimp campaign) embedded
    // as-is via iframe, rather than a screenshot — table-based email
    // markup with inline styles would otherwise fight the page's own CSS
    // if injected directly. Same-origin, so contentDocument is readable:
    // once it loads, the iframe is resized to the document's own natural
    // height, so it never scrolls internally — all scrolling happens on
    // fullBleedMediaBlock's own scroll-frame instead (see its own
    // scrollable handling), the same as a tall screenshot image would.
    const iframe = document.createElement('iframe');
    iframe.className = 'cs-media-el';
    iframe.src = media.src;
    iframe.title = media.title || '';
    iframe.loading = 'lazy';
    // This is a passive visual embed, not a live page — the source
    // document is full of real "View ->" product links, a mailto, an
    // Instagram follow link, all pointed at the actual client site.
    // pointer-events:none makes the iframe untargetable for clicks/hovers
    // entirely (nothing inside it is reachable), while leaving wheel/touch
    // scroll on the ancestor .cs-full-bleed-scroll-frame unaffected —
    // pointer-events only governs hit-testing for pointer interactions,
    // not scroll.
    iframe.style.pointerEvents = 'none';
    iframe.tabIndex = -1;
    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument;
        const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
        if (h) iframe.style.height = `${h}px`;
      } catch (err) {
        // Cross-origin or otherwise unreadable — leave whatever height
        // was already set rather than throwing.
      }
    });
    return iframe;
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
    const media = mediaEl(props.media, { eager: true });
    // scrollable reuses fullBleedMediaBlock's own scroll-frame mechanism
    // (see buildScrollableMediaFrame) — a source image far taller than any
    // hero could reasonably display at once, e.g. a full homepage
    // screenshot, kept at native width and scrolled through in a bounded
    // frame instead of being cropped down to one static banner slice.
    if (props.scrollable) {
      mediaWrap.appendChild(buildScrollableMediaFrame(media, props));
    } else {
      mediaWrap.appendChild(media);
    }
    wrap.appendChild(mediaWrap);
  }
  return wrap;
}

export function textMediaBlock(props) {
  const orientation = props.orientation === 'left' ? 'left' : 'right';
  const classes = ['cs-block', 'cs-text-media', `cs-text-media--${orientation}`];
  if (props.thumbnail) classes.push('cs-text-media--thumb');
  // flow: true swaps the normal rigid two-column split for an actual CSS
  // float — the image sits inset in the text column and paragraphs wrap
  // around it (and below, once its height runs out), the way a magazine
  // page would set an image against body copy. Needs the media element
  // physically inside .cs-text-media-text (a float only affects layout
  // for content that follows it in the same flow — a separate flex
  // column, as the non-flow layout uses, can't wrap around anything).
  if (props.flow) classes.push('cs-text-media--flow');
  const wrap = el('div', classes.join(' '));
  const text = el('div', 'cs-text-media-text');
  if (props.heading) text.appendChild(el('h2', 'cs-text-media-heading', props.heading));
  const mediaWrap = el('div', 'cs-text-media-media');
  const media = mediaEl(props.media);
  if (media) mediaWrap.appendChild(media);
  if (props.flow) {
    text.appendChild(mediaWrap);
    if (props.body) text.appendChild(el('p', 'cs-text-media-body', props.body));
    wrap.appendChild(text);
  } else {
    if (props.body) text.appendChild(el('p', 'cs-text-media-body', props.body));
    wrap.appendChild(text);
    wrap.appendChild(mediaWrap);
  }
  return wrap;
}

export function textBlock(props) {
  // compact: true halves this block's own top/bottom padding — for a run
  // of short, closely-related text blocks (e.g. STATMASK's Analytics/
  // Collateral/Results) where the default .cs-block padding (64px, so
  // 128px between two adjacent blocks) reads as far more separation than
  // one short paragraph per stop actually calls for. Opt-in and scoped to
  // whichever blocks set it, rather than changing the shared .cs-block
  // padding everywhere.
  const wrap = el('div', 'cs-block cs-text' + (props.compact ? ' cs-text--compact' : ''));
  if (props.heading) wrap.appendChild(el('h2', 'cs-text-heading', props.heading));
  const paragraphs = Array.isArray(props.body) ? props.body : [props.body];
  paragraphs.filter(Boolean).forEach((p) => wrap.appendChild(el('p', 'cs-text-body', p)));
  return wrap;
}

// Two text sections side by side on desktop (e.g. Challenge next to
// Approach), stacked on mobile — for a pair that reads better as a
// comparison than as two separate full-width stops. Reuses .cs-text-
// heading/.cs-text-body verbatim for each column so the typography
// matches plain textBlock exactly; only the outer layout differs.
// renderCaseStudyPage assigns exactly one chapter-nav id/stop per
// top-level block (off props.heading/chapter/chapterLabel), so the pair
// shares one — props.heading here is used only for that id, not
// rendered, since each column already shows its own heading.
export function textColumnsBlock(props) {
  const wrap = el('div', 'cs-block cs-text-columns');
  const grid = el('div', 'cs-text-columns-grid');
  (props.columns || []).forEach((col) => {
    const column = el('div', 'cs-text-columns-col');
    if (col.heading) column.appendChild(el('h2', 'cs-text-heading', col.heading));
    const paragraphs = Array.isArray(col.body) ? col.body : [col.body];
    paragraphs.filter(Boolean).forEach((p) => column.appendChild(el('p', 'cs-text-body', p)));
    grid.appendChild(column);
  });
  wrap.appendChild(grid);
  return wrap;
}

// "At a Glance" — a case-file ledger sheet, standardized across every case
// study (see moduleBlock below for its Overview/Challenge/Approach
// counterpart). Contained to the normal content column, not full-bleed —
// it's meant to read as a page in the case file, not a banner. Three rows:
// a tag + optional archival case number (caseId, e.g. "UA — 01"), the
// Client/Principal/Role/Engagement fields, then Scope spanning full width.
// The stem (a vertical hairline dropping from the case number down to the
// second hairline) is a quiet echo of the chapter rail's own hash+numeral
// language elsewhere on the page — not a literal physical connection to
// it (the rail is fixed near the viewport edge and only shows above
// 1180px; this sheet sits in the contained column regardless), just the
// same visual vocabulary so the two don't read as unrelated systems.
export function glanceBlock(props) {
  const wrap = el('div', 'cs-block cs-glance');
  const sheet = el('div', 'cs-glance-sheet');
  const frame = el('div', 'cs-glance-frame');

  const head = el('div', 'cs-glance-head');
  head.appendChild(el('div', 'cs-glance-tag', props.heading || 'At a glance'));
  if (props.caseId) {
    const caseId = el('div', 'cs-glance-caseid');
    caseId.appendChild(el('span', 'cs-glance-caseid-mark'));
    caseId.appendChild(el('span', 'cs-glance-caseid-text', props.caseId));
    head.appendChild(caseId);
  }
  frame.appendChild(head);
  frame.appendChild(el('div', 'cs-glance-hr cs-glance-hr--top'));

  const fields = el('div', 'cs-glance-fields');
  (props.items || []).forEach(({ label, value }) => {
    const field = el('div', 'cs-glance-field');
    field.appendChild(el('div', 'cs-glance-label', label));
    field.appendChild(el('div', 'cs-glance-value', value));
    fields.appendChild(field);
  });
  frame.appendChild(fields);
  if (props.caseId) frame.appendChild(el('div', 'cs-glance-stem'));

  sheet.appendChild(frame);
  sheet.appendChild(el('div', 'cs-glance-hr cs-glance-hr--bottom'));
  if (props.scope) {
    const scope = el('div', 'cs-glance-scope');
    scope.appendChild(el('div', 'cs-glance-label', 'Scope'));
    scope.appendChild(el('div', 'cs-glance-value', props.scope));
    sheet.appendChild(scope);
  }
  wrap.appendChild(sheet);
  return wrap;
}

// The standardized shape for Overview/Challenge/Approach: a short narrative
// lede (sets the scene), the parsed-out scannable bullets (the actual
// content, may contain <strong> lead-ins the same way body arrays
// elsewhere do), and an optional closing line that hands off to whatever
// comes next. No media slot by design — text-only, matching how these
// three sections work in the one case study with real copy; photography/
// identity storytelling happens in the surrounding textMedia/
// fullBleedMedia/gallery blocks instead.
export function moduleBlock(props) {
  const wrap = el('div', 'cs-block cs-module');
  if (props.heading) wrap.appendChild(el('h2', 'cs-module-heading', props.heading));
  if (props.lede) wrap.appendChild(el('p', 'cs-module-lede', props.lede));
  if (props.bullets && props.bullets.length) {
    const list = el('ul', 'cs-module-bullets');
    props.bullets.forEach((b) => list.appendChild(el('li', 'cs-module-bullet', b)));
    wrap.appendChild(list);
  }
  if (props.closing) wrap.appendChild(el('p', 'cs-module-closing', props.closing));
  return wrap;
}

// Builds a bounded, custom-scrollbar viewport for a media element far
// taller than any page could reasonably display at once (e.g. a full-page
// screenshot) — instead of scaling it down to illegibility, it keeps native
// width and lets the viewer scroll through it inside a framed viewport.
// Shared by fullBleedMediaBlock and heroBlock's own scrollable path, so the
// scroll-thumb behavior has one implementation instead of two copies.
function buildScrollableMediaFrame(media, props) {
  const frag = document.createDocumentFragment();
  if (props.scrollHint) frag.appendChild(el('div', 'cs-full-bleed-scroll-hint', props.scrollHint));
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
  // IFRAME's own load listener (see mediaEl) resizes it to its
  // document's natural height first — both listeners are attached to
  // the same 'load' event in this same order, so by the time this one
  // runs, frame.scrollHeight already reflects the resized iframe.
  if (media.tagName === 'IMG' || media.tagName === 'IFRAME') media.addEventListener('load', updateThumb);
  requestAnimationFrame(updateThumb);
  frame.appendChild(track);
  frag.appendChild(frame);
  return frag;
}

export function fullBleedMediaBlock(props) {
  const wrap = el('div', 'cs-block cs-full-bleed' + (props.theme === 'dark' ? ' cs-full-bleed--dark' : ''));
  const inner = el('div', 'cs-full-bleed-inner');
  const media = mediaEl(props.media);
  if (media && props.scrollable) {
    inner.appendChild(buildScrollableMediaFrame(media, props));
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
const REVEAL_VARIANTS = { fullBleedMedia: 'scale', quote: 'soft', glance: 'ledger' };

const BLOCK_FACTORIES = {
  hero: heroBlock,
  text: textBlock,
  textColumns: textColumnsBlock,
  glance: glanceBlock,
  module: moduleBlock,
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
    /* see textBlock()'s own comment on props.compact */
    .cs-text--compact{padding:24px 0}

    /* two text columns side by side (e.g. Challenge next to Approach) —
       wider than .cs-block's normal 880px cap, since two ~62ch measures
       side by side need more room than one. Each column's own .cs-text-
       body keeps its 62ch cap, so a wide viewport doesn't stretch either
       column's line length past what's comfortable to read. */
    .cs-text-columns{max-width:min(1160px, 100% - 96px)}
    .cs-text-columns-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px}
    .cs-text-columns-col .cs-text-heading{font-size:clamp(22px,2.6vw,28px)}
    @media (max-width:640px){
      .cs-text-columns-grid{grid-template-columns:1fr;gap:40px}
    }

    /* at a glance — a case-file ledger sheet, contained to the normal
       content column (not full-bleed — it reads as a page in the file,
       not a banner). See glanceBlock's own doc comment for the structure. */
    .cs-glance-frame{position:relative}
    .cs-glance-head{display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding-bottom:18px}
    .cs-glance-tag{font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4)}
    .cs-glance-caseid{display:flex;align-items:center;gap:8px;flex:0 0 auto}
    .cs-glance-caseid-mark{width:10px;height:1px;background:rgba(var(--ink-rgb),0.35)}
    .cs-glance-caseid-text{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.5)}
    .cs-glance-hr{height:1px;background:rgba(var(--ink-rgb),0.12)}
    /* the rail-echo stem — spans exactly the frame's height (head is
       excluded from that height calc since it sits above the frame's own
       content flow start... no: frame wraps head+hr-top+fields, so the
       stem runs from the top of the head down to the frame's bottom edge,
       which lines up with cs-glance-hr--bottom right after it. */
    .cs-glance-stem{position:absolute;top:0;bottom:0;right:0;width:1px;background:rgba(var(--ink-rgb),0.12)}
    .cs-glance-fields{display:grid;grid-template-columns:repeat(4,1fr);gap:28px 32px;padding:32px 0}
    .cs-glance-label{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4);margin-bottom:10px}
    .cs-glance-value{font-family:var(--font-serif);font-size:16px;line-height:1.5;color:var(--ink)}
    .cs-glance-scope{padding-top:32px}
    .cs-glance-scope .cs-glance-value{max-width:64ch}
    @media (max-width:640px){
      .cs-glance-fields{grid-template-columns:1fr;gap:20px}
      .cs-glance-head{flex-wrap:wrap;gap:10px}
    }
    /* internal reveal stagger — the outer rise/unfold comes from
       reveal.js's 'ledger' variant (see REVEAL_VARIANTS above); these
       micro-delays on the hairlines/fields ride that same is-revealed
       toggle so the sheet reads as unfolding open top-to-bottom, not just
       fading in as one flat unit. Scoped under .reveal-init, matching
       reveal.js's own rule that nothing starts hidden without JS present. */
    .cs-glance.reveal-init .cs-glance-hr,
    .cs-glance.reveal-init .cs-glance-fields > *,
    .cs-glance.reveal-init .cs-glance-scope{opacity:0;transition:opacity 0.3s ease}
    .cs-glance.is-revealed .cs-glance-hr--top{opacity:1;transition-delay:0.05s}
    .cs-glance.is-revealed .cs-glance-fields > *:nth-child(1){opacity:1;transition-delay:0.09s}
    .cs-glance.is-revealed .cs-glance-fields > *:nth-child(2){opacity:1;transition-delay:0.13s}
    .cs-glance.is-revealed .cs-glance-fields > *:nth-child(3){opacity:1;transition-delay:0.17s}
    .cs-glance.is-revealed .cs-glance-fields > *:nth-child(4){opacity:1;transition-delay:0.21s}
    .cs-glance.is-revealed .cs-glance-hr--bottom{opacity:1;transition-delay:0.24s}
    .cs-glance.is-revealed .cs-glance-scope{opacity:1;transition-delay:0.28s}

    /* overview / challenge / approach — narrative lede + snackable bullets */
    .cs-module-heading{font-family:var(--font-serif);font-weight:400;font-size:clamp(24px,3vw,32px);color:var(--ink);margin-bottom:20px}
    .cs-module-lede{font-family:var(--font-serif);font-size:19px;line-height:1.55;color:var(--ink);max-width:56ch;margin-bottom:28px}
    .cs-module-bullets{list-style:none;margin:0 0 20px;padding:0;max-width:62ch;display:flex;flex-direction:column;gap:14px}
    .cs-module-bullet{position:relative;padding-left:22px;font-family:var(--font-serif);font-size:16px;line-height:1.6;color:rgba(var(--ink-rgb),0.75)}
    .cs-module-bullet::before{content:'';position:absolute;left:0;top:0.75em;width:12px;height:1px;background:${LINK_COLOR}}
    .cs-module-closing{font-family:var(--font-serif);font-style:italic;font-size:16px;line-height:1.6;color:rgba(var(--ink-rgb),0.5);max-width:56ch;margin-top:24px}

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

    /* flow variant — a real CSS float instead of a rigid two-column
       split, so body text wraps around the image (and continues full-
       width once past its height) rather than sitting in its own
       independent lane next to it. display:block on the outer wrap
       since .cs-text-media's own display:flex/gap only meant anything
       for the two-column layout this replaces. */
    .cs-text-media--flow{display:block}
    .cs-text-media--flow .cs-text-media-media{float:right;width:40%;margin:6px 0 24px 44px}
    .cs-text-media--flow.cs-text-media--left .cs-text-media-media{float:left;margin:6px 44px 24px 0}

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
    .cs-full-bleed-scroll-frame .cs-media-el{width:100%;display:block;object-fit:contain;border:0}
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
    .cs-text-media--flow .cs-text-media-media{float:none;width:100%;margin:0 0 20px}
    .cs-hero{padding-top:100px}
    ` : ''}
  `;
  document.head.appendChild(style);
}
