// Shared scroll-reveal + lazy-media utility for case-study pages.
//
// Elements start with no hidden state at all — the "reveal-init" (opacity:0)
// class is only ever added here, at the moment we're about to observe an
// element, so a slow/blocked module script never leaves content invisible;
// worst case it's just a normal, fully visible DOM node.
//
// prefers-reduced-motion is checked once at module load (mirroring the
// isTouchDevice idiom used elsewhere in this codebase) and fully bypasses
// both the animation class and the observer for those users.
const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let observer = null;
function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      promoteDeferredMedia(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  return observer;
}

// <video> has no native loading="lazy", so it's deferred via data-src and
// promoted to src here — the observer doubles as both reveal trigger and
// lazy-loader for that one media type.
function promoteDeferredMedia(root) {
  root.querySelectorAll('[data-src]').forEach((el) => {
    el.src = el.dataset.src;
    el.removeAttribute('data-src');
  });
}

// variant is an optional treatment name ('scale' | 'soft' | 'ledger') for
// blocks that shouldn't get the default fade-up — see blocks.js's
// REVEAL_VARIANTS. Every block got the identical fade-up-16px treatment
// before this; unnamed/unknown variants just fall through to that default.
export function revealOnScroll(el, { variant } = {}) {
  injectStyles();
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    el.classList.add('is-revealed');
    promoteDeferredMedia(el);
    return;
  }
  el.classList.add('reveal-init');
  if (variant) el.classList.add(`reveal-${variant}`);
  getObserver().observe(el);
}

function injectStyles() {
  if (document.getElementById('scroll-reveal-styles')) return;
  const style = document.createElement('style');
  style.id = 'scroll-reveal-styles';
  style.textContent = `
    .reveal-init{opacity:0;transform:translateY(16px);transition:opacity 0.5s ease,transform 0.5s ease}
    .reveal-init.reveal-scale{transform:scale(1.035);transition:opacity 0.7s ease,transform 0.7s ease}
    .reveal-init.reveal-soft{transform:none;transition:opacity 0.9s ease}
    /* "unfolds upward into place" — a document sheet rising in, not a
       dropdown: translateY + a slight scaleY from the top edge, eased out
       with no overshoot/bounce. Used by the At a Glance ledger (see
       blocks.js's glanceBlock) — its own internal hairlines/fields add a
       staggered opacity fade on top of this same is-revealed toggle. */
    .reveal-init.reveal-ledger{transform:translateY(16px) scaleY(0.97);transform-origin:top center;transition:opacity 0.32s cubic-bezier(0.22,1,0.36,1),transform 0.32s cubic-bezier(0.22,1,0.36,1)}
    .reveal-init.is-revealed{opacity:1;transform:none}
  `;
  document.head.appendChild(style);
}
