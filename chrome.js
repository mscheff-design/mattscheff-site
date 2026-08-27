// Shared nav/footer for case-study subpages.
//
// index.html's own nav/footer markup is inline in that file (no
// templating/build step exists to share it directly), so this
// intentionally mirrors it. Links are absolute (/#work, not #work)
// since these pages live two path segments deep. Keep in sync by hand —
// nav/footer content changes rarely, and there are only a handful of
// case-study pages consuming this.

export function renderSiteNav(mountEl) {
  injectStyles();
  mountEl.innerHTML = `
    <nav>
      <a class="nav-name" href="/">MS</a>
      <div class="nav-links">
        <a href="/#work">Work</a>
        <a href="/#photography">Photography</a>
        <a href="/#contact">Contact</a>
      </div>
    </nav>
  `;
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
    .nav-name{font-family:'DM Mono',monospace;font-size:10px;color:rgba(28,20,10,0.5);letter-spacing:0.1em;text-decoration:none}
    .nav-links{display:flex;gap:32px}
    .nav-links a{font-family:'DM Mono',monospace;font-size:10px;color:rgba(28,20,10,0.4);letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:color 0.2s}
    .nav-links a:hover{color:rgba(28,20,10,0.85)}
    footer{position:relative;z-index:1;background:#141008;padding:28px 48px;border-top:0.5px solid rgba(210,200,180,0.08);display:flex;justify-content:space-between;align-items:center}
    .footer-left{font-family:'DM Mono',monospace;font-size:9px;color:rgba(210,200,180,0.2);letter-spacing:0.08em}
    .footer-links{display:flex;gap:24px}
    .footer-links a{font-family:'DM Mono',monospace;font-size:9px;color:rgba(210,200,180,0.25);letter-spacing:0.08em;text-decoration:none;transition:color 0.2s}
    .footer-links a:hover{color:rgba(210,200,180,0.6)}
  `;
  document.head.appendChild(style);
}
