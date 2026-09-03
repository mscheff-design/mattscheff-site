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

export function revealOnScroll(el) {
  injectStyles();
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    el.classList.add('is-revealed');
    promoteDeferredMedia(el);
    return;
  }
  el.classList.add('reveal-init');
  getObserver().observe(el);
}

function injectStyles() {
  if (document.getElementById('scroll-reveal-styles')) return;
  const style = document.createElement('style');
  style.id = 'scroll-reveal-styles';
  style.textContent = `
    .reveal-init{opacity:0;transform:translateY(16px);transition:opacity 0.5s ease,transform 0.5s ease}
    .reveal-init.is-revealed{opacity:1;transform:none}
  `;
  document.head.appendChild(style);
}
