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
const LINK_COLOR = '#F4811F';

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
  const wrap = el('div', `cs-block cs-text-media cs-text-media--${orientation}`);
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
  if (media) inner.appendChild(media);
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

const BLOCK_FACTORIES = {
  hero: heroBlock,
  text: textBlock,
  textMedia: textMediaBlock,
  fullBleedMedia: fullBleedMediaBlock,
  statRow: statRowBlock,
  quote: quoteBlock,
  gallery: galleryBlock,
  nextProject: nextProjectBlock
};

function defaultsFromJob(job) {
  return { title: job.name, dates: job.dates, tags: job.tags };
}

export function renderCaseStudyPage(job, config, mountEl) {
  injectStyles();
  (config.blocks || []).forEach(({ type, props }) => {
    const factory = BLOCK_FACTORIES[type];
    if (!factory) {
      console.warn(`Unknown case-study block type: "${type}"`);
      return;
    }
    const mergedProps = type === 'hero' ? { ...defaultsFromJob(job), ...props } : props;
    const node = factory(mergedProps || {});
    mountEl.appendChild(node);
    revealOnScroll(node);
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
    .cs-eyebrow{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(28,20,10,0.4);margin-bottom:18px}
    .cs-hero-title{font-family:'EB Garamond',serif;font-weight:400;font-size:clamp(40px,5.5vw,64px);color:#1c140a;margin-bottom:10px;line-height:1.08}
    .cs-hero-dates{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.08em;color:rgba(28,20,10,0.35);margin-bottom:28px}
    .cs-hero-summary{font-family:'EB Garamond',serif;font-size:19px;line-height:1.6;color:rgba(28,20,10,0.75);max-width:52ch}
    .cs-hero-media{margin-top:48px;width:100vw;margin-left:calc(50% - 50vw)}
    .cs-hero-media .cs-media-el{width:100%;display:block;object-fit:cover}

    /* plain text (no media slot — for text-forward case studies) */
    .cs-text-heading{font-family:'EB Garamond',serif;font-weight:400;font-size:clamp(24px,3vw,32px);color:#1c140a;margin-bottom:16px}
    .cs-text-body{font-family:'EB Garamond',serif;font-size:17px;line-height:1.65;color:rgba(28,20,10,0.75);max-width:62ch;margin-bottom:20px}
    .cs-text-body:last-child{margin-bottom:0}

    /* text + media split */
    .cs-text-media{display:flex;gap:64px;align-items:center}
    .cs-text-media--right{flex-direction:row}
    .cs-text-media--left{flex-direction:row-reverse}
    .cs-text-media-text,.cs-text-media-media{flex:1 1 0;min-width:0}
    .cs-text-media-heading{font-family:'EB Garamond',serif;font-weight:400;font-size:clamp(24px,3vw,32px);color:#1c140a;margin-bottom:16px}
    .cs-text-media-body{font-family:'EB Garamond',serif;font-size:17px;line-height:1.65;color:rgba(28,20,10,0.75)}
    .cs-text-media-media .cs-media-el{width:100%;display:block;border-radius:2px}

    /* full-bleed media */
    .cs-full-bleed{padding:64px 0;max-width:none}
    .cs-full-bleed-inner{width:100vw;margin-left:calc(50% - 50vw)}
    .cs-full-bleed .cs-media-el{width:100%;display:block;object-fit:cover}
    .cs-full-bleed--dark{background:#141008;padding:80px 0}
    .cs-full-bleed--dark .cs-full-bleed-inner{max-width:min(1200px,92vw);margin:0 auto}
    .cs-full-bleed-caption{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;color:rgba(28,20,10,0.4);margin-top:16px;text-align:center}
    .cs-full-bleed--dark .cs-full-bleed-caption{color:rgba(210,200,180,0.4)}

    /* stat row */
    .cs-stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0}
    .cs-stat{padding:0 24px;border-left:0.5px solid rgba(28,20,10,0.12)}
    .cs-stat:first-child{border-left:none;padding-left:0}
    .cs-stat-value{font-family:'EB Garamond',serif;font-size:40px;color:#1c140a;line-height:1}
    .cs-stat-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(28,20,10,0.4);margin-top:10px}

    /* quote */
    .cs-quote{border-left:2px solid ${LINK_COLOR};padding-left:32px}
    .cs-quote-text{font-family:'EB Garamond',serif;font-style:italic;font-size:clamp(24px,3vw,34px);line-height:1.4;color:#1c140a}
    .cs-quote-attribution{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;color:rgba(28,20,10,0.4);margin-top:16px}

    /* gallery */
    .cs-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
    .cs-gallery-item .cs-media-el{width:100%;height:100%;display:block;object-fit:cover;border-radius:2px}
    ${isTouchDevice ? `
    .cs-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px}
    .cs-gallery-item{flex:0 0 min(80vw,420px);scroll-snap-align:start}
    ` : ''}

    /* next project */
    .cs-next-project{text-align:center;border-top:0.5px solid rgba(28,20,10,0.12);padding-top:56px;padding-bottom:96px}
    .cs-next-project-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(28,20,10,0.35);margin-bottom:12px}
    .cs-next-project-link{font-family:'EB Garamond',serif;font-size:28px;color:${LINK_COLOR};text-shadow:0 0 4px rgba(244,129,31,0.5);text-decoration:none;transition:text-shadow 0.2s ease}
    .cs-next-project-link:hover{text-shadow:0 0 7px rgba(244,129,31,0.65)}

    ${isTouchDevice ? `
    .cs-text-media{flex-direction:column !important;gap:24px}
    .cs-hero{padding-top:100px}
    ` : ''}
  `;
  document.head.appendChild(style);
}
