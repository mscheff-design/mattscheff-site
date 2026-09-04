// themeSwitcher.js — dev-only UI for previewing themes live, on top of
// theme.js's data layer. Only renders when the page was loaded with
// ?themes=1 in the URL, so normal visitors never see it; a previously
// chosen non-default theme still applies silently on every page load
// regardless (see theme.js's applyStoredTheme()) so it persists across
// normal browsing while testing without needing to retype the query param
// on every page.
//
// Fixed to a bottom corner rather than folded into the nav — the nav
// already carries three segments (logo/radio/links) and this is a rare,
// temporary tool, not a permanent piece of site chrome.
import { themeNames, getThemeName, setThemeName } from './theme.js';

export function initThemeSwitcher(mountEl) {
  if (!mountEl) return;
  const params = new URLSearchParams(location.search);
  if (params.get('themes') !== '1') return;

  injectStyles();
  const current = getThemeName();
  mountEl.innerHTML = `
    <div class="theme-switcher">
      <span class="theme-switcher-label">Theme</span>
      ${themeNames().map((name) => `<button type="button" class="theme-switcher-btn${name === current ? ' is-active' : ''}" data-theme-name="${name}">${name}</button>`).join('')}
    </div>
  `;
  mountEl.querySelectorAll('.theme-switcher-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setThemeName(btn.dataset.themeName);
      mountEl.querySelectorAll('.theme-switcher-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });
}

function injectStyles() {
  if (document.getElementById('theme-switcher-styles')) return;
  const style = document.createElement('style');
  style.id = 'theme-switcher-styles';
  style.textContent = `
    .theme-switcher{position:fixed;left:16px;bottom:16px;z-index:300;display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(var(--ink-rgb),0.92);border-radius:3px;box-shadow:0 8px 24px rgba(0,0,0,0.3)}
    .theme-switcher-label{font-family:var(--font-mono);font-size:8px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-light-rgb),0.4)}
    .theme-switcher-btn{all:unset;cursor:pointer;font-family:var(--font-mono);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(var(--ink-light-rgb),0.55);padding:3px 7px;border-radius:2px;transition:color 0.2s ease,background 0.2s ease}
    .theme-switcher-btn:hover{color:rgba(var(--ink-light-rgb),0.9)}
    .theme-switcher-btn:focus-visible{outline:1.5px solid var(--accent);outline-offset:1px}
    .theme-switcher-btn.is-active{color:var(--accent);background:rgba(var(--accent-rgb),0.15)}
  `;
  document.head.appendChild(style);
}
