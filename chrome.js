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
      <div class="nav-radio" id="navRadio"></div>
      <div class="nav-links">
        <a href="/">Home</a>
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
    /* The frosted glass lives on nav::before, not nav itself, so its
       bottom-edge fade (mask-image, below) only feathers the glass layer —
       fading nav's own background would fade the nav TEXT sitting on top of
       it too, which should stay fully legible right to the edge. */
    /* inset highlight = a thin line of light catching the glass's top edge;
       the two 1px off-white shadows below it are a whisper of chromatic
       fringing (warm below, cool above) where the glass meets the page. */
    nav{position:fixed;top:0;left:0;width:100%;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:20px 48px;mix-blend-mode:normal;box-shadow:0 6px 14px -7px rgba(var(--ink-rgb),0.24),inset 0 1px 0 rgba(255,255,255,0.4),0 1px 0 rgba(255,80,60,0.06),0 -1px 0 rgba(60,140,255,0.06)}
    /* backdrop-filter blur never extends past its own element's box — masking
       the fade within a box exactly nav's height just clips the blur dead at
       the edge (a hard seam), it doesn't taper it. Extending this layer 32px
       below nav's own bottom and only starting the mask fade at that former
       edge gives the blur physical room to actually dissipate into the page.
       The diagonal gradient (layered above the flat tint) is a soft sheen,
       as if the glass is catching ambient light at an angle. */
    nav::before{content:'';position:absolute;top:0;left:0;right:0;height:calc(100% + 32px);z-index:-1;background:linear-gradient(120deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0) 35%,rgba(255,255,255,0) 65%,rgba(255,255,255,0.05) 100%),rgba(var(--ink-rgb),0.022);backdrop-filter:blur(8px) saturate(1.45);-webkit-backdrop-filter:blur(8px) saturate(1.45);-webkit-mask-image:linear-gradient(to bottom,black 0,black calc(100% - 32px),transparent 100%);mask-image:linear-gradient(to bottom,black 0,black calc(100% - 32px),transparent 100%)}
    /* faint grain (an SVG feTurbulence data-uri, tiled) so the frost reads as
       an imperfect physical surface rather than a perfectly flat color wash —
       shares ::before's exact size/fade so it dissolves at the same edge. */
    nav::after{content:'';position:absolute;top:0;left:0;right:0;height:calc(100% + 32px);z-index:-1;pointer-events:none;opacity:0.035;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:90px 90px;-webkit-mask-image:linear-gradient(to bottom,black 0,black calc(100% - 32px),transparent 100%);mask-image:linear-gradient(to bottom,black 0,black calc(100% - 32px),transparent 100%)}
    .nav-links{display:flex;gap:32px}
    .nav-links a{font-family:var(--font-mono);font-size:10px;color:rgba(var(--ink-rgb),0.4);letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:color 0.2s;text-shadow:0 1px 2px rgba(var(--ink-rgb),0.12)}
    .nav-links a.on-shape{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.4)}
    .nav-links a:hover{color:rgba(var(--ink-rgb),0.85)}
    .nav-links a.on-shape:hover{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.85)}

    .nav-radio{display:flex;align-items:center;gap:10px}
    .radio-toggle{all:unset;cursor:pointer;display:flex;align-items:center;justify-content:center;width:14px;color:rgba(var(--ink-rgb),0.45);transition:color 0.2s;filter:drop-shadow(0 1px 1.5px rgba(var(--ink-rgb),0.14))}
    .radio-toggle.on-shape{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.45)}
    .radio-toggle:hover{color:rgba(var(--ink-rgb),0.85)}
    .radio-toggle.on-shape:hover{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.85)}
    .radio-toggle:focus-visible{outline:1.5px solid var(--accent);outline-offset:2px;border-radius:2px}
    .radio-toggle svg{fill:currentColor}
    .radio-toggle .icon-pause{display:none}
    .nav-radio.is-playing .icon-play{display:none}
    .nav-radio.is-playing .icon-pause{display:block}
    .nav-radio.is-playing .radio-toggle{color:var(--accent)}
    /* Not a real audio analyser — see radio.js's comment above vizBars for
       why (the NTS stream sends no CORS headers, so Web Audio can't read
       real frequency data from it). Three bars on independent sine waves. */
    .radio-viz{display:flex;align-items:flex-end;gap:2px;height:9px;filter:drop-shadow(0 1px 1.5px rgba(var(--ink-rgb),0.14))}
    .radio-viz span{display:block;width:2px;height:100%;border-radius:1px;background:rgba(var(--ink-rgb),0.4);transform-origin:bottom;transform:scaleY(0.18);transition:transform 0.2s ease,background-color 0.2s ease}
    .radio-viz.on-shape span{background:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.4)}
    .nav-radio.is-playing .radio-viz span{background:var(--accent)}
    .radio-station{all:unset;cursor:pointer;font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4);transition:color 0.2s;white-space:nowrap;text-shadow:0 1px 2px rgba(var(--ink-rgb),0.12)}
    .radio-station.on-shape{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.4)}
    .radio-station:hover{color:rgba(var(--ink-rgb),0.85)}
    .radio-station.on-shape:hover{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.85)}
    .radio-station:focus-visible{outline:1.5px solid var(--accent);outline-offset:2px;border-radius:2px}
    .radio-now{display:inline-block;font-family:var(--font-mono);font-size:8.5px;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.3);max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 2px rgba(var(--ink-rgb),0.1)}
    .radio-now.on-shape{color:rgba(var(--reactive-ink-rgb,var(--ink-rgb)),0.3)}
    .radio-now-track{display:inline-block;white-space:nowrap}
    /* Only .is-ticking gets the edge fade + animation — a title short enough
       to just sit still shouldn't have its own edges needlessly softened. */
    .radio-now.is-ticking{-webkit-mask-image:linear-gradient(to right,transparent 0,black 12px,black calc(100% - 12px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,black 12px,black calc(100% - 12px),transparent 100%)}
    .radio-now.is-ticking .radio-now-track{animation-name:radio-ticker;animation-timing-function:linear;animation-iteration-count:infinite}
    @keyframes radio-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    .radio-volume{-webkit-appearance:none;appearance:none;width:44px;height:2px;background:rgba(var(--ink-rgb),0.15);border-radius:2px;cursor:pointer}
    .radio-volume::-webkit-slider-thumb{-webkit-appearance:none;width:7px;height:7px;border-radius:50%;background:rgba(var(--ink-rgb),0.5);cursor:pointer}
    .radio-volume::-moz-range-thumb{width:7px;height:7px;border:none;border-radius:50%;background:rgba(var(--ink-rgb),0.5);cursor:pointer}
    @media (max-width:640px){.radio-now,.radio-volume{display:none}}
    footer{position:relative;z-index:1;background:var(--bg-dark);padding:28px 48px;border-top:0.5px solid rgba(var(--ink-light-rgb),0.08);display:flex;justify-content:space-between;align-items:center}
    .footer-left{font-family:var(--font-mono);font-size:9px;color:rgba(var(--ink-light-rgb),0.2);letter-spacing:0.08em}
    .footer-links{display:flex;gap:24px}
    .footer-links a{font-family:var(--font-mono);font-size:9px;color:rgba(var(--ink-light-rgb),0.25);letter-spacing:0.08em;text-decoration:none;transition:color 0.2s}
    .footer-links a:hover{color:rgba(var(--ink-light-rgb),0.6)}
  `;
  document.head.appendChild(style);
}
