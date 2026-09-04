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
  // Today's exact site colors — the refactor that introduced this file
  // must be a visual no-op for this theme.
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
  }
};

const STORAGE_KEY = 'site-theme';
const DEFAULT_THEME = 'default';

function tokenDeclarations(p) {
  return `--bg:${p.bg};--ink:${p.ink};--ink-rgb:${p.inkRgb};--ink-light-rgb:${p.inkLightRgb};`
    + `--bg-dark:${p.bgDark};--bg-darker:${p.bgDarker};--bg-frame:${p.bgFrame};--border-dark:${p.borderDark};`
    + `--accent:${p.accent};--accent-rgb:${p.accentRgb};--card-stock:${p.cardStock};--error:${p.error};--black:${p.black};`
    + `--font-mono:${p.fontMono};--font-serif:${p.fontSerif};--font-display:${p.fontDisplay}`;
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
  changeListeners.forEach((fn) => fn(name));
}

// Call once per page, as early as possible (before first paint ideally),
// so a previously-chosen non-default theme applies without a flash of
// the default theme first.
export function applyStoredTheme() {
  injectOverrides();
  const name = getThemeName();
  if (name !== DEFAULT_THEME) document.documentElement.setAttribute('data-theme', name);
}
