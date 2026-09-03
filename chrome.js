// Shared nav/footer for case-study subpages.
//
// index.html's own nav/footer markup is inline in that file (no
// templating/build step exists to share it directly), so this
// intentionally mirrors it. Links are absolute (/#work, not #work)
// since these pages live two path segments deep. Keep in sync by hand —
// nav/footer content changes rarely, and there are only a handful of
// case-study pages consuming this.

import { initRadioWidget } from './radio.js';
import { applyStoredTheme } from './theme.js';
import { initThemeSwitcher } from './themeSwitcher.js';

export function renderSiteNav(mountEl) {
  injectStyles();
  applyStoredTheme();
  mountEl.innerHTML = `
    <nav>
      <a class="nav-name" href="/">MS</a>
      <div class="nav-radio" id="navRadio"></div>
      <div class="nav-links">
        <a href="/#work">Work</a>
        <a href="/#photography">Photography</a>
        <a href="/#contact">Contact</a>
      </div>
    </nav>
    <div id="themeSwitcher"></div>
  `;
  initRadioWidget(mountEl.querySelector('#navRadio'));
  initThemeSwitcher(mountEl.querySelector('#themeSwitcher'));
}

export function renderSiteFooter(mountEl) {
  injectStyles();
  mountEl.innerHTML = `
    <footer>
      <span class="footer-left">© 2026 Matthew Scheffler</span>
      <div class="footer-links">
        <a href="https://instagram.com/matt_scheff" target="_blank">Instagram</a>
        <a href="https://linkedin.com/mattscheffler" target="_blank">LinkedIn</a>
        <a href="mailto:hello@mattscheff.com">Email</a>
      </div>
    </footer>
  `;
}

function injectStyles() {
  if (document.getElementById('site-chrome-styles')) return;
  const style = document.createElement('style');
  style.id = 'site-chrome-styles';
  style.textContent = `
    nav{position:fixed;top:0;left:0;width:100%;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:20px 48px;mix-blend-mode:multiply}
    .nav-name{font-family:'DM Mono',monospace;font-size:10px;color:rgba(var(--ink-rgb),0.5);letter-spacing:0.1em;text-decoration:none}
    .nav-links{display:flex;gap:32px}
    .nav-links a{font-family:'DM Mono',monospace;font-size:10px;color:rgba(var(--ink-rgb),0.4);letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:color 0.2s}
    .nav-links a:hover{color:rgba(var(--ink-rgb),0.85)}

    .nav-radio{display:flex;align-items:center;gap:10px}
    .radio-toggle{all:unset;cursor:pointer;display:flex;align-items:center;justify-content:center;width:14px;color:rgba(var(--ink-rgb),0.45);transition:color 0.2s}
    .radio-toggle:hover{color:rgba(var(--ink-rgb),0.85)}
    .radio-toggle:focus-visible{outline:1.5px solid var(--accent);outline-offset:2px;border-radius:2px}
    .radio-toggle svg{fill:currentColor}
    .radio-toggle .icon-pause{display:none}
    .nav-radio.is-playing .icon-play{display:none}
    .nav-radio.is-playing .icon-pause{display:block}
    .nav-radio.is-playing .radio-toggle{color:var(--accent)}
    .radio-station{all:unset;cursor:pointer;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4);transition:color 0.2s;white-space:nowrap}
    .radio-station:hover{color:rgba(var(--ink-rgb),0.85)}
    .radio-station:focus-visible{outline:1.5px solid var(--accent);outline-offset:2px;border-radius:2px}
    .radio-now{font-family:'DM Mono',monospace;font-size:8.5px;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.3);max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .radio-volume{-webkit-appearance:none;appearance:none;width:44px;height:2px;background:rgba(var(--ink-rgb),0.15);border-radius:2px;cursor:pointer}
    .radio-volume::-webkit-slider-thumb{-webkit-appearance:none;width:7px;height:7px;border-radius:50%;background:rgba(var(--ink-rgb),0.5);cursor:pointer}
    .radio-volume::-moz-range-thumb{width:7px;height:7px;border:none;border-radius:50%;background:rgba(var(--ink-rgb),0.5);cursor:pointer}
    @media (max-width:640px){.radio-now,.radio-volume{display:none}}
    footer{position:relative;z-index:1;background:var(--bg-dark);padding:28px 48px;border-top:0.5px solid rgba(var(--ink-light-rgb),0.08);display:flex;justify-content:space-between;align-items:center}
    .footer-left{font-family:'DM Mono',monospace;font-size:9px;color:rgba(var(--ink-light-rgb),0.2);letter-spacing:0.08em}
    .footer-links{display:flex;gap:24px}
    .footer-links a{font-family:'DM Mono',monospace;font-size:9px;color:rgba(var(--ink-light-rgb),0.25);letter-spacing:0.08em;text-decoration:none;transition:color 0.2s}
    .footer-links a:hover{color:rgba(var(--ink-light-rgb),0.6)}
  `;
  document.head.appendChild(style);
}
