// theme.js — central palette registry, and the data layer behind the
// dev-only theme switcher (see radio.js's sibling mount pattern in
// index.html/chrome.js for how the switcher itself is wired in).
//
// CSS custom properties handle every DOM-rendered color (the literal
// default values live directly in each page's own <style>, same
// hand-sync convention already used for nav/footer/radio CSS across this
// codebase — see chrome.js's own comment on why). But the 3D card's
// front/back faces are drawn on an HTML5 Canvas (card.js), which custom
// properties can't reach at all — so this module is the single source of
// truth for every theme's values, and drives BOTH the CSS override rules
// injected here (for any non-default theme) AND the JS palette object
// card.js reads from when drawing, so the two can never drift apart.

const THEMES = {
  // The original launch palette — was the live default until DEFAULT_THEME
  // switched to 'letterhead' below; kept exactly as-is so it's still
  // selectable from the ?themes=1 switcher.
  default: {
    bg: '#e8e3d9',
    ink: '#1c140a',
    inkRgb: '28,20,10',
    inkLightRgb: '210,200,180',
    bgDark: '#141008',
    bgDarker: '#0a0805',
    bgFrame: '#0f0c08',
    borderDark: '#1c1610',
    accent: '#F4811F',
    accentRgb: '244,129,31',
    cardStock: '#f7f0e1',
    error: '#a3402a',
    black: '#000',
    // Font *names* only — the actual @font-face/Google Fonts <link> that
    // makes a given name renderable is still hand-authored per page (see
    // each page's own <head>), same hand-sync convention as everything
    // else here. Swapping a theme to a typeface that isn't loaded yet on
    // every page will render as a fallback until that's added.
    fontMono: `'DM Mono',monospace`,
    fontSerif: `'EB Garamond',serif`,
    fontDisplay: `'Space Grotesk',sans-serif`
  },
  // Mechanism-check placeholder only — not a real design. Proves the
  // switcher actually re-themes both the DOM and the card's canvas.
  // Real themes get described and added later. Fonts deliberately left
  // identical to default here — this theme is about proving the color
  // mechanism works, not about typography.
  'placeholder-cool': {
    bg: '#dde3ea',
    ink: '#0d1420',
    inkRgb: '13,20,32',
    inkLightRgb: '188,203,218',
    bgDark: '#0a121e',
    bgDarker: '#05090f',
    bgFrame: '#080d15',
    borderDark: '#101a26',
    accent: '#3E8EF0',
    accentRgb: '62,142,240',
    cardStock: '#e3e9f0',
    error: '#a3402a',
    black: '#000',
    fontMono: `'DM Mono',monospace`,
    fontSerif: `'EB Garamond',serif`,
    fontDisplay: `'Space Grotesk',sans-serif`
  },
  // De Stijl / Neoplasticism-inspired: Mondrian primaries, a geometric
  // display face for the card's hero name, a wonky modernist serif for
  // headings/body, and an asymmetric hard-edge color-block field instead
  // of a flat background. Requires Unbounded and Fraunces to actually be
  // loaded (see each page's Google Fonts <link>) and
  // body{background-attachment:fixed} (see each page's own <style>) so
  // the block composition reads as a fixed backdrop rather than
  // stretching oddly down the page's real scroll height.
  'de-stijl': {
    bg: `linear-gradient(115deg,transparent 0%,transparent 61%,#DA291C 61%,#DA291C 64%,transparent 64%),`
      + `linear-gradient(200deg,transparent 0%,transparent 76%,#1B3F94 76%,#1B3F94 100%),`
      + `linear-gradient(25deg,transparent 0%,transparent 87%,#F5D908 87%,#F5D908 100%),`
      + `#F5F4F0`,
    ink: '#101010',
    inkRgb: '16,16,16',
    inkLightRgb: '245,244,240',
    bgDark: '#13245C',
    bgDarker: '#0C1A42',
    bgFrame: '#0E1D4A',
    borderDark: '#1C2F5E',
    accent: '#DA291C',
    accentRgb: '218,41,28',
    cardStock: '#F5D908',
    error: '#B0221A',
    black: '#000',
    fontMono: `'DM Mono',monospace`,
    fontSerif: `'Fraunces',serif`,
    fontDisplay: `'Unbounded',sans-serif`
  },
  // Letterhead: pre-internet luxury-hotel stationery — crisp cool-grey
  // paper, near-black ink, a single quiet slate-blue accent, and one
  // restrained sans (Manrope) doing both the card's hero name and all
  // body copy, differentiated only by weight/size, the way a real
  // letterhead system uses one typeface throughout rather than pairing
  // faces. Deliberately flat: no color-block field, no circular motifs.
  // fontMono was DM Mono originally (reasoning then: a monospace already
  // reads as "typewritten concierge desk" without further help) — moved
  // off it per explicit request once this became the live default: DM
  // Mono turned out to be the exact face the Urban Architecture case
  // study's own real client site uses, and the user wants this portfolio
  // reading as distinctly its own thing rather than sharing a mono with
  // client work referenced inside it. Tried JetBrains Mono first (still
  // used by "brief" below) — too engineered/technical for what the user
  // actually wanted, which was something warmer and rounder, closer in
  // spirit to Avenir Light. Settled on Fira Mono: Erik Spiekermann's
  // humanist mono for Mozilla, genuinely rounder terminals with real
  // warmth, understated rather than quirky. Requires Manrope and Fira
  // Mono to actually be loaded (see each page's Google Fonts <link>).
  letterhead: {
    bg: '#EDEDE9',
    ink: '#1A1B1E',
    inkRgb: '26,27,30',
    inkLightRgb: '237,237,233',
    bgDark: '#15161A',
    bgDarker: '#0D0E10',
    bgFrame: '#101114',
    borderDark: '#2A2C30',
    accent: '#3E5266',
    accentRgb: '62,82,102',
    cardStock: '#FAFAF7',
    error: '#B23A3A',
    black: '#000',
    fontMono: `'Fira Mono',monospace`,
    fontSerif: `'Manrope',sans-serif`,
    fontDisplay: `'Manrope',sans-serif`
  },
  // Title Card: same restrained one-typeface system as "letterhead" (kept
  // verbatim — Manrope + DM Mono, no new fonts to load), but reads as a
  // Saul Bass film-title card instead of stationery: true black cut-paper
  // wedges on bone paper, one saturated red as the only color, a small
  // counterweight shape opposite the large one for asymmetric balance.
  // Bold flat shapes instead of "letterhead"'s quiet flatness — no
  // gradients-as-texture, no dots or circles, just hard-edged planes.
  'title-card': {
    // Nav and .row-tag both have text that can end up sitting over the
    // black wedge below with no fill behind them to fall back on. This
    // was originally built on mix-blend-mode:difference (self-inverting
    // against whatever's actually behind each pixel, no geometry needed)
    // — abandoned after extensive testing showed Chrome simply never
    // applies mix-blend-mode here, against any backdrop (gradient, solid
    // color, position:fixed, position:absolute, body's own native
    // background — all tried, all pixel-sampled, all identical to the
    // *unblended* prediction). Real geometry hit-testing instead: bgShapes
    // below stores each wedge's polygon as plain [x%,y%] points, used both
    // to render the clip-path shapes (renderBgShapes()) AND to test each
    // reactive element's center point against them on load/scroll/resize
    // (updateReactiveHitTest()), toggling a plain .on-shape class — no
    // blend-mode involved anywhere.
    //
    // The wedges are real solid-color clip-path shapes in .bg-layer, not a
    // gradient on bg — even setting compositing aside, gradients came with
    // their own mix-blend-mode problems during testing, and clip-path
    // shapes are what let updateReactiveHitTest() reuse the exact same
    // point data for both rendering and hit-testing.
    bg: '#F7F7F4',
    bgShapes: [
      { color: '#E4341F', points: [[34, 0], [100, 0], [100, 66]] },
      { color: '#0A0A0A', points: [[38, 0], [100, 0], [100, 62]] },
      { color: '#0A0A0A', points: [[0, 100], [0, 82], [9, 100]] }
    ],
    ink: '#0A0A0A',
    inkRgb: '10,10,10',
    inkLightRgb: '247,247,244',
    bgDark: '#0A0A0A',
    bgDarker: '#000000',
    bgFrame: '#050505',
    borderDark: '#242424',
    accent: '#E4341F',
    accentRgb: '228,52,31',
    cardStock: '#FBFBF8',
    error: '#E4341F',
    black: '#000',
    fontMono: `'DM Mono',monospace`,
    fontSerif: `'Manrope',sans-serif`,
    fontDisplay: `'Manrope',sans-serif`,
    reactiveInkRgb: '255,255,255',
    // .row-tag's own base alpha (0.25) reads too faint once it's actual
    // white-on-shape rather than a differenced/diluted color; .on-shape
    // uses this instead (row-tag only, see index.html).
    reactiveAlpha: '0.55',
    // nav (see chrome.js) uses mix-blend-mode:multiply for an ink-on-paper
    // look everywhere else — but multiply(white, x) = x, so the .on-shape
    // white nav text disappears completely under multiply (it just reveals
    // whatever's behind it, unchanged). Only this theme's nav needs plain
    // normal blending instead.
    navBlend: 'normal'
  },
  // Brief: the one built to actually get hired from, not to test the
  // theming system. Warm off-white paper, near-black ink, one grounded
  // accent — a vivid emerald, distinctive without being a trend, not a
  // retread of the default's orange — and nothing else. No bgShapes, no
  // color-block field, no reactive text needed: the point is that a
  // recruiter's eye should land on the work, not on the page's graphic
  // design. Where the "pop" comes from instead: the accent is genuinely
  // saturated (not a muted corporate green) and the dark section reads as
  // a real deep pine rather than near-neutral black, so --accent has
  // somewhere to actually glow — both cascade for free through every
  // existing var(--accent)/var(--bg-dark) usage (nav hover, the card's own
  // résumé/link color, case-study frame labels, footer) with no new CSS.
  // One confident contemporary sans (Instrument Sans) does both the card's
  // hero name and every body copy — one system, not a display face paired
  // with a decorative one — and JetBrains Mono replaces DM Mono for
  // nav/labels/radio, a small but deliberate signal of digital fluency
  // instead of just inheriting the default's typewriter mono.
  brief: {
    bg: '#E9F2EC',
    ink: '#15161A',
    inkRgb: '21,22,26',
    inkLightRgb: '250,249,245',
    bgDark: '#0B2A1E',
    bgDarker: '#071C14',
    bgFrame: '#082017',
    borderDark: '#1E4534',
    accent: '#0F9D65',
    accentRgb: '15,157,101',
    // A faint sage cast instead of neutral white — every word on the card
    // itself is drawn in card.js's shared ink()/accent() helpers, which
    // aren't theme-branchable, so cardStock is the one lever that ties the
    // card's own resting (non-hover) look back to the accent family.
    cardStock: '#F0F7F2',
    error: '#B23A2E',
    black: '#000',
    fontMono: `'JetBrains Mono',monospace`,
    fontSerif: `'Instrument Sans',sans-serif`,
    fontDisplay: `'Instrument Sans',sans-serif`
  },
  // Ticker: e-commerce is a numbers business — this borrows the one color
  // pairing everyone already reads instantly (market red/green) rather
  // than inventing a "portfolio" palette from scratch. accent is the
  // up-green; error (already a real token, used for the contact form's
  // validation states) does double duty as the down-red, so the two-color
  // ticker language falls directly out of tokens the site already has,
  // no new architecture. Flat and clean on purpose — no bgShapes, no
  // texture — it reads like a data terminal, not a poster. Archivo runs
  // the whole type system (display + body, weight-differentiated, same
  // one-family approach as "letterhead"/"brief"); IBM Plex Mono takes
  // over nav/labels/radio from DM Mono for the tabular, faintly-90s
  // data-readout feel the user specifically asked to keep.
  ticker: {
    bg: '#EFEFE9',
    ink: '#131313',
    inkRgb: '19,19,19',
    inkLightRgb: '239,239,233',
    bgDark: '#101211',
    bgDarker: '#0A0B0A',
    bgFrame: '#0D0E0D',
    borderDark: '#242624',
    accent: '#1E9E5A',
    accentRgb: '30,158,90',
    // Tried painting the card and/or the page a flat saturated mint, both
    // directions — rejected not for the shade but for the pairing itself:
    // a solid-color card sitting on a solid-color field just doesn't read
    // right on this card's realistically-lit 3D material, regardless of
    // hue. Back to neutral paper for both; the color energy stays where
    // it was already landing well — accent green and error red in text,
    // hover states, and the photography section's own glow labels.
    cardStock: '#F7F7F3',
    error: '#D6304C',
    black: '#000',
    fontMono: `'IBM Plex Mono',monospace`,
    fontSerif: `'Archivo',sans-serif`,
    fontDisplay: `'Archivo',sans-serif`
  },
  // Neo Stijl: "de-stijl"'s Mondrian color-block field and ink/accent/error,
  // carried over verbatim (same bg gradient, same red/ink), paired with
  // "ticker"'s type system instead of de-stijl's own (Archivo + IBM Plex
  // Mono replace Unbounded + Fraunces — no new fonts to load, both already
  // required by "ticker"). Two deliberate departures from a straight merge:
  // de-stijl's card was flat primary yellow, matching the Mondrian palette
  // exactly; here the card is warm cream stock instead, grained more
  // heavily than the site-wide default (see GRAIN_ALPHA in card.js) so it
  // reads as a genuinely textured paper object sitting in front of the
  // hard-edged flat color field, rather than one more flat plane within it.
  // And de-stijl's own dark-section blue (bgDark/bgDarker/bgFrame) — fine
  // as a color-block field entry, wrong for the footer and the photography
  // section (both genuinely dark backgrounds, not just a tinted panel),
  // and wrong for a Mondrian panel too — so those go true near-black here
  // instead, restoring the black-and-red (glowing warm on true black, same
  // effect "black and orange" describes under the original theme's actual
  // orange accent) contact-sheet look.
  'neo-stijl': {
    bg: `linear-gradient(115deg,transparent 0%,transparent 61%,#DA291C 61%,#DA291C 64%,transparent 64%),`
      + `linear-gradient(200deg,transparent 0%,transparent 76%,#1B3F94 76%,#1B3F94 100%),`
      + `linear-gradient(25deg,transparent 0%,transparent 87%,#F5D908 87%,#F5D908 100%),`
      + `#F5F4F0`,
    ink: '#101010',
    inkRgb: '16,16,16',
    inkLightRgb: '245,244,240',
    bgDark: '#0A0A0A',
    bgDarker: '#050505',
    bgFrame: '#080808',
    borderDark: '#1E1E1E',
    accent: '#DA291C',
    accentRgb: '218,41,28',
    cardStock: '#F0E9D6',
    grainOpacity: 0.11,
    error: '#B0221A',
    black: '#000',
    fontMono: `'IBM Plex Mono',monospace`,
    fontSerif: `'Archivo',sans-serif`,
    fontDisplay: `'Archivo',sans-serif`
  }
};

const STORAGE_KEY = 'site-theme';
// "letterhead" is the live site's actual default look — the hand-authored
// :root block in index.html's own <style> is kept in sync with its exact
// values (see injectOverrides()'s comment on why the current DEFAULT_THEME
// never gets its own override rule). The original launch palette lives on
// under the 'default' key below, still selectable via the ?themes=1
// switcher, just no longer what a fresh visitor sees.
const DEFAULT_THEME = 'letterhead';

function tokenDeclarations(p) {
  let decl = `--bg:${p.bg};--ink:${p.ink};--ink-rgb:${p.inkRgb};--ink-light-rgb:${p.inkLightRgb};`
    + `--bg-dark:${p.bgDark};--bg-darker:${p.bgDarker};--bg-frame:${p.bgFrame};--border-dark:${p.borderDark};`
    + `--accent:${p.accent};--accent-rgb:${p.accentRgb};--card-stock:${p.cardStock};--error:${p.error};--black:${p.black};`
    + `--font-mono:${p.fontMono};--font-serif:${p.fontSerif};--font-display:${p.fontDisplay}`;
  // Optional: lets a theme mark specific text as reactive — a different
  // color for whenever updateReactiveHitTest() below finds it sitting over
  // a bgShapes polygon (via the .on-shape class each call site opts into).
  // Only set where a theme actually needs it; every other theme falls
  // through to its var(...,var(--ink-rgb)) fallback at each call site.
  if (p.reactiveInkRgb) decl += `;--reactive-ink-rgb:${p.reactiveInkRgb}`;
  if (p.reactiveAlpha) decl += `;--reactive-alpha:${p.reactiveAlpha}`;
  if (p.navBlend) decl += `;--nav-blend:${p.navBlend}`;
  return decl;
}

// Non-default themes only — the default theme's values are the literal
// :root declarations already hand-authored on every page, so overriding
// them here too would just be a redundant (harmless but pointless) rule.
function injectOverrides() {
  if (document.getElementById('theme-overrides')) return;
  const style = document.createElement('style');
  style.id = 'theme-overrides';
  style.textContent = Object.keys(THEMES)
    .filter((name) => name !== DEFAULT_THEME)
    .map((name) => `:root[data-theme="${name}"]{${tokenDeclarations(THEMES[name])}}`)
    .join('\n');
  document.head.appendChild(style);
}

export function themeNames() {
  return Object.keys(THEMES);
}

export function getThemeName() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES[stored] ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function getPalette(name = getThemeName()) {
  return THEMES[name] || THEMES[DEFAULT_THEME];
}

function polygonCss(points) {
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

// Ray-casting point-in-polygon test. points/px/py are all in the same
// percentage space (0-100) so this works directly against bgShapes'
// stored coordinates without any unit conversion.
function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = (yi > py) !== (yj > py)
      && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// A theme's decorative wedges/blocks (see bgShapes on a THEMES entry, e.g.
// "title-card") are real solid-color clip-path <div>s inside .bg-layer,
// not a CSS gradient on --bg — see the comment on title-card's bg for why.
// Rebuilds them from scratch on every theme change; cheap since there are
// only ever a handful.
function renderBgShapes(name) {
  const layer = document.querySelector('.bg-layer');
  if (!layer) return;
  layer.querySelectorAll('.bg-shape').forEach((el) => el.remove());
  const shapes = getPalette(name).bgShapes;
  if (!shapes) return;
  shapes.forEach(({ color, points }) => {
    const shape = document.createElement('div');
    shape.className = 'bg-shape';
    shape.style.cssText = `position:fixed;inset:0;pointer-events:none;background:${color};clip-path:${polygonCss(points)}`;
    layer.appendChild(shape);
  });
}

// Elements that switch to --reactive-ink-rgb (via the .on-shape class)
// whenever they're sitting over one of the current theme's bgShapes
// polygons. mix-blend-mode looked like the natural fit for this (invert
// based on whatever's actually behind each pixel, no geometry needed) but
// turned out not to work at all here after extensive testing — see the
// comment on title-card's bg in the THEMES table. This does the same job
// with real geometry instead: cheap enough to just re-test every element
// on scroll (rAF-throttled) since there are only ever a handful of them.
const REACTIVE_SELECTOR = '.nav-links a, .row-tag, .radio-toggle, .radio-viz, .radio-station, .radio-now';

function updateReactiveHitTest() {
  const shapes = getPalette().bgShapes;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  document.querySelectorAll(REACTIVE_SELECTOR).forEach((el) => {
    if (!shapes) {
      el.classList.remove('on-shape');
      return;
    }
    const r = el.getBoundingClientRect();
    const cx = (((r.left + r.right) / 2) / vw) * 100;
    const cy = (((r.top + r.bottom) / 2) / vh) * 100;
    const hit = shapes.some((s) => pointInPolygon(cx, cy, s.points));
    el.classList.toggle('on-shape', hit);
  });
}

let reactiveListenersAttached = false;
function ensureReactiveListeners() {
  if (reactiveListenersAttached) return;
  reactiveListenersAttached = true;
  let ticking = false;
  const onScrollOrResize = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateReactiveHitTest();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
}

const changeListeners = [];
// card.js registers here to re-read the palette and redraw its canvas
// faces when the theme changes — CSS custom properties update the DOM
// automatically on their own, but nothing repaints a canvas for you.
export function onThemeChange(fn) {
  changeListeners.push(fn);
}

export function setThemeName(name) {
  if (!THEMES[name]) return;
  try {
    if (name === DEFAULT_THEME) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // localStorage unavailable — theme still applies for this page load,
    // just won't persist across navigation.
  }
  if (name === DEFAULT_THEME) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', name);
  renderBgShapes(name);
  ensureReactiveListeners();
  // Deferred a frame: row-tag/nav elements this hit-tests against may not
  // exist in the DOM yet at the exact moment a theme switch fires.
  requestAnimationFrame(updateReactiveHitTest);
  changeListeners.forEach((fn) => fn(name));
}

// Call once per page, as early as possible (before first paint ideally),
// so a previously-chosen non-default theme applies without a flash of
// the default theme first.
export function applyStoredTheme() {
  injectOverrides();
  const name = getThemeName();
  if (name !== DEFAULT_THEME) document.documentElement.setAttribute('data-theme', name);
  renderBgShapes(name);
  ensureReactiveListeners();
  // Deferred a frame: applyStoredTheme() runs before the page's own JS has
  // necessarily finished rendering row-tag/nav content, so hit-testing
  // immediately here could miss elements that don't exist yet.
  requestAnimationFrame(updateReactiveHitTest);
}
