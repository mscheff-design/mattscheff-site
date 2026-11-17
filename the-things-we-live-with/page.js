// The Things We Live With: page behaviour and styles.
//
// Experience: a run of slow, horizontal shelves stacked down the page, one
// per section (Photographs, Listening, Film, Books, Design), like the
// separate shelves of a reference library. On each, every work stands on one
// thin line (a shelf edge and a horizon at once) in its own real shape:
// records square, photographs and film at their natural ratio. Native
// scroll-snap does the moving, so it has the platform's own momentum; on top
// of that, works away from center sit smaller and quieter, like things in the
// rearview. Nothing moves on its own. Whichever work settles in the center of
// a shelf gets its caption and Matthew's note beneath that shelf; music plays
// through the nav's own radio (preview mode), never automatically.
//
// Built only from letterhead's existing parts: Manrope for anything you read,
// Fira Mono for metadata, thin rules, numbered rows, the site green for links.

import { DRAFT, PAGE, SECTIONS, ITEMS } from './data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const KIND_LABEL = { photograph: 'Photograph', film: 'Film', record: 'Record', poster: 'Film', book: 'Photobook', place: 'Place', cover: 'Film' };
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderEditorialPage(mountEl, radio) {
  injectStyles();
  const visible = ITEMS.filter((it) => DRAFT || it.status !== 'candidate');
  // A section with nothing on it is left out when published; in DRAFT it
  // keeps its shelf, holding an empty "to come" slot.
  const sections = SECTIONS
    .map((sec) => ({ ...sec, items: visible.filter((it) => it.section === sec.id) }))
    .filter((sec) => sec.items.length || DRAFT);
  const items = sections.flatMap((sec) => sec.items);

  mountEl.innerHTML = `
    <header class="tw-head">
      ${DRAFT ? `<div class="tw-draftbar">Working draft · hidden page · candidates and draft copy are shown</div>` : ''}
      <div class="tw-head-tags">
        <span class="tw-tag">A selection</span>
        <span class="tw-code"><span class="tw-code-mark"></span>${esc(PAGE.code)}</span>
      </div>
      <div class="tw-head-grid">
        <div class="tw-head-main">
          <h1 class="tw-title">${esc(PAGE.title)}</h1>
          <p class="tw-descriptor">${esc(PAGE.descriptor)}</p>
          <p class="tw-byline">${esc(PAGE.byline)}</p>
          ${PAGE.epigraph ? `<blockquote class="tw-epigraph"><p>${esc(PAGE.epigraph.text)}</p><cite>${esc(PAGE.epigraph.by)}</cite></blockquote>` : ''}
          ${renderCopy(PAGE.intro, 'tw-intro')}
        </div>
        <div class="tw-contents" role="navigation" aria-label="Contents">
          <span class="tw-tag tw-contents-tag">Contents</span>
          <ol class="tw-contents-list">
            ${sections.map((sec, si) => `<li><a class="tw-jump-link tw-contents-link${sec.items.length ? '' : ' is-empty'}" href="#${esc(sec.id)}"><span class="tw-contents-n">${pad(si + 1)}</span><span class="tw-contents-label">${esc(sec.label)}</span><span class="tw-contents-leader" aria-hidden="true"></span><span class="tw-contents-count">${sec.items.length ? pad(sec.items.length) : '—'}</span></a></li>`).join('')}
          </ol>
        </div>
      </div>
    </header>

    ${sections.map((sec, si) => renderShelf(sec, si)).join('')}


    <div class="tw-exit"><a class="tw-link" href="/">← mattscheff.com</a></div>

    <div class="tw-gallery" role="dialog" aria-modal="true" aria-label="Photographs" hidden>
      <div class="tw-gallery-head">
        <div class="tw-gallery-book"><img class="tw-gallery-cover" alt=""><div><p class="tw-gallery-title"></p><p class="tw-gallery-by"></p><p class="tw-gallery-pub"></p></div></div>
        <button class="tw-gallery-close" type="button">Close ×</button>
      </div>
      <div class="tw-gallery-row"></div>
    </div>

    <div class="tw-lightbox" hidden>
      <button class="tw-lightbox-close" type="button">Close ×</button>
      <figure class="tw-lightbox-fig"><img alt=""><figcaption></figcaption></figure>
    </div>
  `;

  // ---- Lightbox: look closer ----
  const lb = mountEl.querySelector('.tw-lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  let lastFocus = null;
  function openLightbox(it) {
    if (!it.image) return;
    lastFocus = document.activeElement;
    lbImg.src = it.image;
    lbImg.alt = it.alt || '';
    lbCap.textContent = [it.creator, it.title, it.title && it.date && String(it.title).includes(it.date) ? null : it.date].filter(Boolean).join(' · ');
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.querySelector('.tw-lightbox-close').focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    document.body.style.overflow = mountEl.querySelector('.tw-gallery')?.hidden === false ? 'hidden' : '';
    if (lastFocus) lastFocus.focus();
  }
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.tw-lightbox-close')) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) { closeLightbox(); e.stopImmediatePropagation(); } }); // one layer per Esc

  // ---- Photobook gallery: the book's sample photographs side by side ----
  // Up to three, set as a triptych at one shared height (each keeps its own
  // proportions); on a phone they stack. A photograph opens full screen.
  const gal = mountEl.querySelector('.tw-gallery');
  const galRow = gal.querySelector('.tw-gallery-row');
  let galFocus = null;
  function openGallery(it) {
    const xs = (it.samples || []).slice(0, 3);
    if (!xs.length) return;
    galFocus = document.activeElement;
    gal.querySelector('.tw-gallery-cover').src = it.image;
    gal.querySelector('.tw-gallery-title').textContent = it.title;
    gal.querySelector('.tw-gallery-by').textContent = it.creator;
    gal.querySelector('.tw-gallery-pub').textContent = [it.publisher, it.date].filter(Boolean).join(' · ');
    const sum = xs.reduce((a, x) => a + x.ratio, 0);
    galRow.style.setProperty('--sum', sum);
    galRow.style.setProperty('--n', xs.length);
    galRow.innerHTML = xs.map((x, k) => `
      <figure class="tw-gallery-fig" style="--r:${x.ratio}">
        <button class="tw-gallery-img" type="button" data-k="${k}" aria-label="${esc(`View ${x.title} larger`)}"><img src="${esc(x.src)}" alt="${esc(`${x.by || it.creator}, ${x.title}`)}" decoding="async"></button>
        <figcaption>
          <span class="tw-gallery-cap">${x.by ? `${esc(x.by)}, ` : ''}${esc(x.title)}${x.date && !x.title.includes(x.date) ? `, ${esc(x.date)}` : ''}</span>
          <span class="tw-gallery-credit">${x.source ? `<a href="${esc(x.source.url)}" target="_blank" rel="noopener">${esc(x.credit)} ↗</a>` : esc(x.credit)}</span>
        </figcaption>
      </figure>`).join('');
    galRow.querySelectorAll('.tw-gallery-img').forEach((b) => b.addEventListener('click', () => {
      const x = xs[Number(b.dataset.k)];
      openLightbox({ image: x.src, alt: x.title, creator: x.by || it.creator, title: x.title, date: x.date });
    }));
    gal.hidden = false;
    document.body.style.overflow = 'hidden';
    gal.querySelector('.tw-gallery-close').focus();
  }
  function closeGallery() {
    gal.hidden = true;
    document.body.style.overflow = '';
    if (galFocus) galFocus.focus();
  }
  gal.addEventListener('click', (e) => { if (e.target === gal || e.target.closest('.tw-gallery-close')) closeGallery(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !gal.hidden) { closeGallery(); e.stopImmediatePropagation(); } });

  // ---- Listening, through the nav radio ----
  const preview = { id: null, playing: false };
  const set = { on: false, items: [], i: 0, shelf: null, btn: null };
  function playItem(it) {
    if (!radio || !it.preview) return;
    // Same track as the set's current one: just pause/resume it, set intact.
    if (!(set.on && set.items[set.i] === it)) set.on = false;
    radio.playPreview({ id: it.id, src: it.preview, label: `${it.creator} — ${it.title}` });
  }

  // ---- The set: every preview on a shelf, in order, through the nav radio ----
  function playSetFrom(i) {
    while (i < set.items.length && !set.items[i].preview) i++; // skip any clip that failed to load
    if (i >= set.items.length) { set.on = false; radio.stopPreview(); return; }
    set.on = true;
    set.i = i;
    const it = set.items[i];
    radio.playPreview({
      id: it.id, src: it.preview, label: `${it.creator} — ${it.title}`,
      setLabel: `Set ${pad(i + 1)}/${pad(set.items.length)}`,
      onNext: () => playSetFrom(i + 1),
    });
    set.shelf.goToItem(it); // the shelf glides along to the record that's playing
  }
  function syncSetButton() {
    if (!set.btn) return;
    const on = set.on && preview.playing;
    set.btn.classList.toggle('is-on', on);
    set.btn.querySelector('.tw-play-label').textContent = on ? 'Pause the set' : (set.on ? 'Resume the set' : 'Play the set');
  }

  // ---- Shelves ----
  const shelves = sections.map((sec) => {
    const el = mountEl.querySelector(`#${sec.id}`);
    if ((sec.layout === 'list' || sec.layout === 'objects') && sec.items.length) {
      if (sec.layout === 'objects') el.querySelectorAll('.tw-objfig-img').forEach((b) => b.addEventListener('click', () => {
        const it = sec.items[Number(b.dataset.i)];
        openLightbox({ image: it.image, alt: it.alt, creator: it.creator, title: it.title, date: '' });
      }));
      return { syncPreview() {}, refreshItem() {}, goToItem() {} }; // static
    }
    if (sec.layout === 'records' && sec.items.length) {
      const shelf = initWall(el, sec, { openLightbox, playItem, preview });
      initRecordViews(el, { onSwitch: shelf.hide });
      return shelf;
    }
    return (sec.layout === 'wall' || sec.layout === 'plates') && sec.items.length
      ? initWall(el, sec, { openLightbox, openGallery })
      : { syncPreview() {}, refreshItem() {}, goToItem() {} }; // empty draft shelf
  });

  const setIdx = sections.findIndex((sec) => sec.set && sec.items.length);
  if (setIdx >= 0 && radio) {
    set.items = sections[setIdx].items;
    set.shelf = shelves[setIdx];
    set.btn = mountEl.querySelector(`#${sections[setIdx].id} .tw-setplay`);
    set.btn.addEventListener('click', () => {
      if (set.on) { const it = set.items[set.i]; radio.playPreview({ id: it.id }); return; } // pause/resume
      playSetFrom(0);
    });
  }

  window.addEventListener('radio-preview', (e) => {
    Object.assign(preview, e.detail);
    if (!preview.id) set.on = false; // back on NTS: the set is over
    shelves.forEach((sh) => sh.syncPreview());
    syncSetButton();
  });

  // ---- Apple catalog: artwork, preview clip, and link for records ----
  // One request for every record on the page (the lookup API takes a list).
  const records = items.filter((it) => it.itunesId);
  if (records.length) (async () => {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${records.map((it) => it.itunesId).join(',')}`);
      const byId = new Map((await res.json()).results.map((r) => [r.trackId, r]));
      records.forEach((it) => {
        const r = byId.get(it.itunesId);
        if (!r) return;
        it.preview = r.previewUrl || null;
        it.image = r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '1000x1000bb') : null;
        if (r.trackViewUrl) it.source = { label: 'Apple Music', url: r.trackViewUrl };
        shelves.forEach((sh) => sh.refreshItem(it));
      });
      if (set.btn) set.btn.disabled = !set.items.some((it) => it.preview);
    } catch { /* offline: covers stay labelled squares, the links still work */ }
  })();

  // ---- Jump links: glide the page to a shelf; mark the shelf in view ----
  const jumpEls = [...mountEl.querySelectorAll('.tw-jump-link')];
  jumpEls.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.getElementById(a.getAttribute('href').slice(1));
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 90, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  }));
  const markCurrent = () => {
    const probe = window.innerHeight * 0.45;
    let current = null;
    sections.forEach((sec) => {
      const r = document.getElementById(sec.id).getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = sec.id;
    });
    jumpEls.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${current}`));
  };
  window.addEventListener('scroll', markCurrent, { passive: true });
  markCurrent();
  // Arriving with a #shelf in the URL lands on that shelf.
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    const el = document.getElementById(location.hash.slice(1));
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 90 });
  }
  initReveal(mountEl);
}

// Media arrives as it scrolls into view, staggered across whatever arrives
// together. Photobooks and posters fall into place as if lightly tossed down
// in front of the reader; the rest simply appears. (The record grid's own
// scatter, on switching views, is separate: see initRecordViews.)
// Photobooks and film posters get the toss; everything else just fades up.
const TOSSED = '.tw-plate, .tw-wall:not(.tw-wall--plates) > .tw-hang';
function initReveal(root) {
  if (prefersReducedMotion || !document.body.animate) return;
  let pending = [...root.querySelectorAll('.tw-plate, .tw-rec, .tw-wall:not(.tw-wall--plates) > .tw-hang, .tw-list-fig, .tw-objfig-frame')];
  pending.forEach((el) => el.classList.add('tw-pre'));
  // Checked on scroll rather than with an IntersectionObserver, so a jump
  // (contents link, fast fling) can never skip past a piece and strand it
  // hidden: anything already scrolled past simply appears.
  const check = () => {
    const line = window.innerHeight * 0.94;
    const arriving = [];
    pending = pending.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top > line) return true;
      if (r.bottom < 0) el.classList.remove('tw-pre');
      else arriving.push([el, r]);
      return false;
    });
    arriving.sort((a, b) => (a[1].top - b[1].top) || (a[1].left - b[1].left));
    arriving.forEach(([el], k) => {
      // Tossed onto the table: starts a touch closer (larger), above, and
      // turned, lands just past rest, then settles square.
      const jx = (Math.random() - 0.5) * 16, rot = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2.2);
      el.classList.remove('tw-pre');
      if (!el.matches(TOSSED)) {
        // Playlist, bookstores and objects simply appear.
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: Math.min(k, 8) * 50, easing: 'ease-out', fill: 'backwards' });
        return;
      }
      el.animate([
        { opacity: 0, transform: `translate(${jx}px, -26px) rotate(${rot}deg) scale(1.07)`, easing: 'cubic-bezier(.4,0,.7,.9)' },
        { opacity: 1, transform: `translate(${jx * 0.08}px, 2px) rotate(${-rot * 0.18}deg) scale(0.996)`, offset: 0.62, easing: 'cubic-bezier(.3,.7,.4,1)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 820, delay: Math.min(k, 8) * 70, fill: 'backwards' });
    });
    if (!pending.length) { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); }
  };
  // Called straight from scroll (no rAF gate: a frame requested while the tab
  // is hidden never runs, which would wedge the gate shut). The list only
  // shrinks, so the work per scroll event is small.
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check, { passive: true });
  check();
}

// A wall: posters hung in a grid. One shared card follows whichever poster is
// hovered (mouse), focused (keyboard), or tapped (touch, where it pins open as
// a bottom sheet until dismissed).
function initWall(shelfEl, section, { openLightbox, openGallery, playItem, preview }) {
  const items = section.items;
  const wall = shelfEl.querySelector('.tw-wall, .tw-recs');
  const card = shelfEl.querySelector('.tw-card');
  const hangs = [...wall.querySelectorAll('.tw-hang, .tw-rec')];
  const isRecords = section.layout === 'records';
  // Listening in List view has no card: the row already carries the details,
  // so a click simply plays (or pauses) that track. Grid keeps the card.
  const listMode = () => isRecords && wall.classList.contains('is-list');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let current = -1;
  let pinned = false;
  let hideTimer = 0;

  function place(i) {
    if (window.matchMedia('(max-width: 760px)').matches) { card.style.left = card.style.top = ''; return; }
    const w = wall.getBoundingClientRect();
    const r = hangs[i].getBoundingClientRect();
    const cw = card.offsetWidth, gap = 18;
    let left = r.right - w.left + gap;
    if (left + cw > w.width) left = r.left - w.left - gap - cw; // no room right: open to the left
    left = Math.max(0, left);
    let top = r.top - w.top;
    const vh = window.innerHeight;
    const overflow = r.top + card.offsetHeight - (vh - 16);
    if (overflow > 0) top -= Math.min(overflow, r.top - 90); // keep it on screen, below the nav
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }
  function show(i) {
    clearTimeout(hideTimer);
    if (i !== current) {
      current = i;
      const it = items[i];
      card.innerHTML = isRecords ? renderRecordCard(it, i + 1, preview)
        : section.layout === 'plates' ? renderPlateCard(it, i + 1) : renderCard(it, i + 1);
      const play = card.querySelector('.tw-card-play');
      if (play && playItem) play.addEventListener('click', () => playItem(it));
      card.setAttribute('aria-label', `${it.title}, ${it.creator}, ${it.date}`);
      card.querySelectorAll('.tw-still').forEach((b) => b.addEventListener('click', () => {
        const st = it.stills[Number(b.dataset.k)];
        openLightbox({ image: st.src, alt: st.alt, creator: it.title, title: it.date, date: st.credit });
      }));
      const big = card.querySelector('.tw-card-enlarge');
      if (big) big.addEventListener('click', () => (big.classList.contains('tw-card-gallery') && openGallery ? openGallery(it) : openLightbox(it)));
      const close = card.querySelector('.tw-card-close');
      if (close) close.addEventListener('click', () => hide(true));
      hangs.forEach((h, j) => h.classList.toggle('is-current', j === i));
    }
    wall.classList.add('has-current');
    card.hidden = false;
    place(i);
    requestAnimationFrame(() => card.classList.add('is-open'));
    card.classList.add('is-open');
  }
  function hide(force = false) {
    if (pinned && !force) return;
    pinned = false;
    card.classList.remove('is-open');
    wall.classList.remove('has-current');
    hangs.forEach((h) => h.classList.remove('is-current', 'is-pinned'));
    current = -1;
  }
  const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => hide(), 160); };

  hangs.forEach((h, i) => {
    if (canHover) {
      h.addEventListener('mouseenter', () => { if (listMode()) return; if (!pinned || current === i) show(i); });
      h.addEventListener('mouseleave', scheduleHide);
    }
    h.addEventListener('focus', () => { if (listMode()) return; if (!pinned) show(i); });
    h.addEventListener('blur', () => { if (!card.contains(document.activeElement)) scheduleHide(); });
    // Click / tap pins the card open (and is the only way in on touch).
    // Photobooks go straight to their gallery instead; the card stays a hover.
    h.addEventListener('click', (e) => {
      e.stopPropagation();
      if (section.layout === 'plates' && openGallery && (items[i].samples || []).length) { hide(true); openGallery(items[i]); return; }
      if (listMode()) { if (playItem) playItem(items[i]); return; }
      if (pinned && current === i) { hide(true); return; }
      pinned = false;
      show(i);
      pinned = true;
      hangs.forEach((x, j) => x.classList.toggle('is-pinned', j === i));
    });
  });
  card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  card.addEventListener('mouseleave', scheduleHide);
  card.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { if (pinned) hide(true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current >= 0) hide(true); });
  window.addEventListener('resize', () => { if (current >= 0) place(current); });

  if (!isRecords) return { refreshItem() {}, syncPreview() {}, goToItem() {} };
  // Records: artwork and previews arrive later from Apple; keep covers, the
  // playing dot, and an open card in step with them.
  return {
    hide: () => hide(true),
    refreshItem(it) {
      const j = items.indexOf(it);
      if (j < 0) return;
      const img = hangs[j].querySelector('img');
      if (img && it.image) { img.src = it.image; hangs[j].classList.remove('is-empty'); }
      if (j === current) { const keep = pinned; current = -1; show(j); pinned = keep; }
    },
    syncPreview() {
      hangs.forEach((h, j) => h.classList.toggle('is-playing', preview.playing && items[j].id === preview.id));
      const btn = card.querySelector('.tw-card-play');
      if (btn) {
        const on = preview.playing && btn.dataset.id === preview.id;
        btn.classList.toggle('is-on', on);
        btn.querySelector('.tw-play-label').textContent = on ? 'Pause preview' : 'Play preview';
      }
    },
    goToItem() {},
  };
}

// Listening's Grid / List switch. The covers travel between arrangements:
// each one is measured before and after the switch, then animated from where
// it was to where it now sits, drifting a little off course on the way (a
// small random detour and tilt) and leaving a beat after its neighbour, so
// the grid seems to scatter into the list and gather back again.
function initRecordViews(shelfEl, { onSwitch } = {}) {
  const recs = shelfEl.querySelector('.tw-recs');
  const btns = [...shelfEl.querySelectorAll('.tw-viewswitch button')];
  let view = 'list'; // the page leads with the track list
  function setView(v) {
    if (v === view) return;
    if (onSwitch) onSwitch();
    const arts = [...recs.querySelectorAll('.tw-rec-art')];
    const first = arts.map((a) => a.getBoundingClientRect());
    view = v;
    recs.classList.toggle('is-grid', v === 'grid');
    recs.classList.toggle('is-list', v === 'list');
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    if (prefersReducedMotion || !arts[0] || !arts[0].animate) return;
    const last = arts.map((a) => a.getBoundingClientRect());
    arts.forEach((a, k) => {
      const f = first[k], l = last[k];
      if (!l.width || !l.height) return;
      const dx = f.left - l.left, dy = f.top - l.top;
      const sx = f.width / l.width, sy = f.height / l.height;
      const jx = (Math.random() - 0.5) * 90, jy = (Math.random() - 0.5) * 70, rot = (Math.random() - 0.5) * 16;
      a.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: `translate(${dx * 0.42 + jx}px, ${dy * 0.42 + jy}px) scale(${(sx + 1) / 2}, ${(sy + 1) / 2}) rotate(${rot}deg)`, offset: 0.45 },
        { transform: 'none' },
      ], { duration: 760, delay: k * 24, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'backwards' });
    });
    recs.querySelectorAll('.tw-rec-n, .tw-rec-main, .tw-rec-year').forEach((el) => el.animate(
      [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 380, easing: 'ease-out', fill: 'backwards' }));
  }
  btns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
}

function renderWall(sec) {
  // Plates (Photobooks): square tiles, each holding one book's cover on a
  // ground that matches its source photo, labelled with title and author.
  if (sec.layout === 'plates') return `
      <div class="tw-wall tw-wall--plates">
        ${sec.items.map((it, i) => renderTile(it, i)).join('')}
        <div class="tw-card" role="dialog" hidden></div>
      </div>`;
  return `
      <div class="tw-wall">
        ${sec.items.map((it, i) => `
        <button class="tw-hang" type="button" style="--r:${it.ratio || '2 / 3'}" aria-label="${esc(`${it.title}, ${it.creator}, ${it.date}`)}" aria-haspopup="dialog">
          <img src="${esc(it.image)}" alt="${esc(it.alt)}" ${i > 4 ? 'loading="lazy"' : ''} decoding="async" draggable="false">
          ${DRAFT && it.status === 'candidate' ? '<span class="tw-hang-tag">Candidate</span>' : ''}
        </button>`).join('')}
        <div class="tw-card" role="dialog" hidden></div>
      </div>`;
}

// Rows for Objects: from the section's `rows` (item ids; a nested list is a
// stacked cell), or plain rows of three. A stacked cell's width share uses the
// combined shape of its images (heights add at a shared width).
function objectRows(sec) {
  const byId = new Map(sec.items.map((it) => [it.id, it]));
  if (!sec.rows) return chunk(sec.items, 3);
  return sec.rows.map((row) => row.map((c) => (Array.isArray(c) ? c.map((id) => byId.get(id)).filter(Boolean) : byId.get(c))).filter((c) => (Array.isArray(c) ? c.length : c)));
}
const cellRatio = (cell) => (Array.isArray(cell) ? 1 / cell.reduce((a, it) => a + 1 / (it.ratio || 0.8), 0) : (cell.ratio || 0.8));
const chunk = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// One entry in Objects & Spaces: the whole object at its own proportions
// (never cropped), then number, title, designer, and credits. An
// entry without an authorized image keeps a labelled placeholder.
function objFrame(it, i) {
  const img = it.image
    ? `<button class="tw-objfig-img" type="button" data-i="${i}" aria-label="${esc(`View ${it.title} larger`)}"><img src="${esc(it.image)}" alt="${esc(it.alt)}" loading="lazy" decoding="async" style="aspect-ratio:${it.ratio}"></button>`
    : `<div class="tw-objfig-ph" role="img" aria-label="${esc(`${it.title}: image to come`)}"><span class="tw-tag">${esc(it.title)}</span><span class="tw-objfig-ph-note">${esc(it.placeholder || 'Image to come')}</span></div>`;
  return `<div class="tw-objfig-frame">${img}</div>`;
}
function objCap(it, i) {
  const links = [it.source, it.also].filter(Boolean).map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a>`);
  return `
          <figcaption class="tw-objfig-cap">
            <span class="tw-objfig-n">${esc(it.n || pad(i + 1))}</span>
            <h3 class="tw-objfig-title">${esc(it.title)}</h3>
            <p class="tw-objfig-by">${esc(it.creator)}${it.subtitle ? ` <span class="tw-objfig-sub">· ${esc(it.subtitle)}</span>` : ''}</p>
            <p class="tw-objfig-credit">${[esc(it.credit || ''), ...links].filter(Boolean).join(' · ')}</p>
          </figcaption>`;
}
function renderObject(it, i, place) {
  const style = place ? ` style="grid-column:${place.col};grid-row:${place.row};--drop:${place.drop || 0}px"` : '';
  const shape = (it.ratio || 1) > 1.3 ? ' is-wide-shape' : ' is-tall-shape';
  const side = place && place.cap ? ` cap-${place.cap}` : '';
  return `
        <figure class="tw-objfig${place ? shape + side : ''}"${style}>
          ${objFrame(it, i)}${objCap(it, i)}
        </figure>`;
}
// Two wide, low objects stacked in one column: the upper one whole with its
// caption, the lower one's image ending on the row's baseline and its caption
// on the row's caption line, like its neighbours.
function renderObjectStack(items, idx) {
  const [top, bottom] = items;
  return `
        <div class="tw-objstack">
          <div class="tw-objstack-upper">
            <figure class="tw-objfig is-stacked">${objFrame(top, idx(top))}${objCap(top, idx(top))}</figure>
            ${objFrame(bottom, idx(bottom))}
          </div>
          ${objCap(bottom, idx(bottom))}
        </div>`;
}

// One entry in a list section (Bookstores): name and city lead; the note is
// Matthew's, in a draft slot until he writes it.
function renderListEntry(it, n) {
  return `
        <li class="tw-list-entry">
          <span class="tw-list-n">${pad(n)}</span>
          <div class="tw-list-body">
            <div class="tw-list-line">
              <h3 class="tw-list-name">${esc(it.title)}</h3>
              <span class="tw-list-city">${esc(it.city)}</span>
            </div>
            ${it.blurb ? `<p class="tw-list-blurb">${esc(it.blurb)}</p>` : ''}
            ${it.note ? `<p class="tw-list-note">${esc(it.note)}</p>` : ''}
            <p class="tw-list-links">${[
              it.source ? `<a class="tw-list-src" href="${esc(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.label)} ↗</a>` : '',
              it.about ? `<a class="tw-list-src" href="${esc(it.about.url)}" target="_blank" rel="noopener">${esc(it.about.label)} ↗</a>` : '',
            ].join('')}</p>
            ${it.photo ? `<p class="tw-list-credit"><a href="${esc(it.photo.url)}" target="_blank" rel="noopener">${esc(['Photo: ' + it.photo.credit, it.photo.license, it.photo.via].filter(Boolean).join(' · '))}</a></p>` : ''}
          </div>
          ${it.image ? `
          <figure class="tw-list-fig">
            <img src="${esc(it.image)}" alt="${esc(it.alt || '')}" loading="lazy" decoding="async">
          </figure>` : ''}
        </li>`;
}

// One photobook tile: the cover alone, straight on, at its own proportions.
// Hover shows the first of the book's sample photographs.
function renderTile(it, i) {
  const c = it.cover || { src: it.image, size: [3, 4] };
  const [W, H] = c.size;
  const lazy = i > 7 ? 'loading="lazy"' : '';
  return `
        <figure class="tw-plate">
          <button class="tw-hang tw-tile${it.samples && it.samples.length ? ' has-inside' : ''}" type="button" style="--cr:${+(W / H).toFixed(4)}" aria-label="${esc(`${it.title}, ${it.creator}`)}" aria-haspopup="dialog">
            <img class="tw-tile-cover" src="${esc(c.src)}" alt="${esc(it.alt)}" ${lazy} decoding="async" draggable="false">
            ${it.samples && it.samples.length ? `<span class="tw-tile-inside" aria-hidden="true"><img src="${esc(it.samples[0].src)}" alt="" loading="lazy" decoding="async" draggable="false" style="aspect-ratio:${it.samples[0].ratio}"></span>` : ''}
            ${DRAFT && it.status === 'candidate' ? '<span class="tw-hang-tag">Candidate</span>' : ''}
          </button>
          <figcaption class="tw-plate-cap">
            <span class="tw-plate-who">${esc(it.title)}</span>
            <span class="tw-plate-what">${esc(it.creator)}</span>
          </figcaption>
        </figure>`;
}

// The card for a photobook: the book, its edition, and a way into its pictures.
function renderPlateCard(it, n) {
  const k = (it.samples || []).length;
  return `
    <button class="tw-card-close" type="button" aria-label="Close">Close ×</button>
    <span class="tw-tag">${pad(n)} · Photobook${DRAFT && it.status === 'candidate' ? ' · candidate' : ''}</span>
    <h3 class="tw-card-title">${esc(it.title)}</h3>
    <p class="tw-card-by">${esc(it.creator)}</p>
    <p class="tw-card-context">${esc([it.publisher, it.date].filter(Boolean).join(' · '))}${it.edition ? `<br>${esc(it.edition)}` : ''}</p>
    ${k ? `<button class="tw-card-enlarge tw-card-gallery" type="button">View ${k === 1 ? 'photograph' : `${k} photographs`}</button>` : ''}
    <p class="tw-card-credit">${esc(it.credit)} · <a class="tw-src" href="${esc(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.label)} ↗</a></p>`;
}

function renderCard(it, n) {
  return `
    <button class="tw-card-close" type="button" aria-label="Close">Close ×</button>
    <span class="tw-tag">${pad(n)} · ${esc(KIND_LABEL[it.kind] || 'Film')}${DRAFT && it.status === 'candidate' ? ' · candidate' : ''}</span>
    <h3 class="tw-card-title">${esc(it.title)}</h3>
    <p class="tw-card-by">${esc(it.creator)} · ${esc(it.date)}</p>
    ${it.context ? `<p class="tw-card-context">${esc(it.context)}</p>` : ''}
    ${it.kind === 'photograph' && it.image ? '<button class="tw-card-enlarge" type="button">View larger</button>' : ''}
    ${it.stills && it.stills.length ? `
    <div class="tw-stills tw-card-stills">
      ${it.stills.map((st, k) => `<button class="tw-still" type="button" data-k="${k}" style="--r:${st.ratio}" aria-label="${esc(`Still from ${it.title}: ${st.alt}`)}"><img src="${esc(st.src)}" alt="" decoding="async"></button>`).join('')}
    </div>` : ''}
    <p class="tw-card-credit">${esc(it.credit)} · <a class="tw-src" href="${esc(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.label)} ↗</a></p>`;
}

function renderShelf(sec, si) {
  const n = sec.items.length;
  if (sec.layout === 'objects' && n) {
    const [one, many] = sec.unit || ['work', 'works'];
    return `
    <section class="tw-shelf tw-shelf--objects" id="${esc(sec.id)}" aria-label="${esc(sec.label)}">
      <div class="tw-shelf-head">
        <span class="tw-tag tw-shelf-name">${pad(si + 1)} — ${esc(sec.label)}</span>
        <span class="tw-code"><span class="tw-code-mark"></span>${pad(n)} ${n === 1 ? one : many}</span>
      </div>
      ${sec.note ? renderCopy(sec.note, 'tw-shelf-note') : ''}
      ${sec.collage ? `
      <div class="tw-collage">
        ${sec.items.map((it, i) => renderObject(it, i, sec.collage[it.id])).join('')}
      </div>` : `
      <div class="tw-objects">
        ${objectRows(sec).map((row) => `
        <div class="tw-objrow" style="grid-template-columns:${row.map((cell) => `${Math.sqrt(cellRatio(cell)).toFixed(4)}fr`).join(' ')}">
          ${row.map((cell) => (Array.isArray(cell) ? renderObjectStack(cell, (it) => sec.items.indexOf(it)) : renderObject(cell, sec.items.indexOf(cell)))).join('')}
        </div>`).join('')}
      </div>`}
    </section>`;
  }
  if (sec.layout === 'list' && n) {
    const [one, many] = sec.unit || ['work', 'works'];
    return `
    <section class="tw-shelf tw-shelf--list" id="${esc(sec.id)}" aria-label="${esc(sec.label)}">
      <div class="tw-shelf-head">
        <span class="tw-tag tw-shelf-name">${pad(si + 1)} — ${esc(sec.label)}</span>
        <span class="tw-code"><span class="tw-code-mark"></span>${pad(n)} ${n === 1 ? one : many}</span>
      </div>
      ${sec.note ? renderCopy(sec.note, 'tw-shelf-note') : ''}
      <ol class="tw-list">
        ${sec.items.map((it, i) => renderListEntry(it, i + 1)).join('')}
      </ol>
    </section>`;
  }
  if ((sec.layout === 'wall' || sec.layout === 'plates') && n) {
    return `
    <section class="tw-shelf tw-shelf--wall" id="${esc(sec.id)}" aria-label="${esc(sec.label)}">
      <div class="tw-shelf-head">
        <span class="tw-tag tw-shelf-name">${pad(si + 1)} — ${esc(sec.label)}</span>
        <span class="tw-code"><span class="tw-code-mark"></span>${pad(n)} ${n === 1 ? 'work' : 'works'}</span>
      </div>
      ${sec.note ? renderCopy(sec.note, 'tw-shelf-note') : ''}
      ${renderWall(sec)}
    </section>`;
  }
  if (sec.layout === 'records' && n) return renderRecords(sec, si);
  // Nothing chosen yet: a draft-only placeholder (left out when published).
  return `
    <section class="tw-shelf" id="${esc(sec.id)}" aria-label="${esc(sec.label)}">
      <div class="tw-shelf-head">
        <span class="tw-tag tw-shelf-name">${pad(si + 1)} — ${esc(sec.label)}</span>
        <span class="tw-code"><span class="tw-code-mark"></span>To come</span>
      </div>
    </section>`;
}

// Listening: one set of records that can lie as a grid of covers or stand as
// a two-column track list. The same elements move between the two, so the
// covers can travel from one arrangement to the other.
function renderRecords(sec, si) {
  const n = sec.items.length;
  const gridIcon = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="0" y="0" width="5" height="5"/><rect x="7" y="0" width="5" height="5"/><rect x="0" y="7" width="5" height="5"/><rect x="7" y="7" width="5" height="5"/></svg>';
  const listIcon = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="0" y="0.5" width="3" height="3"/><rect x="4.5" y="1.25" width="7.5" height="1.5"/><rect x="0" y="4.5" width="3" height="3"/><rect x="4.5" y="5.25" width="7.5" height="1.5"/><rect x="0" y="8.5" width="3" height="3"/><rect x="4.5" y="9.25" width="7.5" height="1.5"/></svg>';
  return `
    <section class="tw-shelf tw-shelf--records" id="${esc(sec.id)}" aria-label="${esc(sec.label)}">
      <div class="tw-shelf-head">
        <span class="tw-tag tw-shelf-name">${pad(si + 1)} — ${esc(sec.label)}</span>
        ${sec.set ? `
        <span class="tw-set">
          <button class="tw-play tw-setplay" type="button" disabled><span class="tw-play-icon" aria-hidden="true"></span><span class="tw-play-label">Play the set</span></button>
          <span class="tw-set-meta">${pad(n)} tracks · 30-second previews${[
            sec.set.spotifyUrl ? `<a class="tw-src" href="${esc(sec.set.spotifyUrl)}" target="_blank" rel="noopener">Spotify ↗</a>` : '',
            sec.set.appleMusicUrl ? `<a class="tw-src" href="${esc(sec.set.appleMusicUrl)}" target="_blank" rel="noopener">Apple Music ↗</a>` : '',
          ].filter(Boolean).map((l) => ' · ' + l).join('')}</span>
        </span>` : `<span class="tw-code"><span class="tw-code-mark"></span>${pad(n)} tracks</span>`}
      </div>
      ${sec.note ? renderCopy(sec.note, 'tw-shelf-note') : ''}
      <div class="tw-recbar">
        <div class="tw-viewswitch" role="group" aria-label="${esc(sec.label)} view">
          <button type="button" data-view="list" aria-pressed="true">${listIcon}<span>List</span></button>
          <button type="button" data-view="grid" aria-pressed="false">${gridIcon}<span>Grid</span></button>
        </div>
      </div>
      <p class="tw-recs-hint">Tap a track to hear a 30-second preview</p>
      <div class="tw-recs is-list" style="--rows:${Math.ceil(n / 2)}">
        ${sec.items.map((it, i) => `
        <button class="tw-rec${it.image ? '' : ' is-empty'}" type="button" data-i="${i}" aria-label="${esc(`${it.title}, ${it.creator}, ${it.date}`)}" aria-haspopup="dialog">
          <span class="tw-rec-art"><img ${it.image ? `src="${esc(it.image)}"` : ''} alt="${esc(it.alt)}" ${i > 9 ? 'loading="lazy"' : ''} decoding="async" draggable="false"><span class="tw-spin" aria-hidden="true"></span><span class="tw-album-cap" aria-hidden="true"><span class="tw-album-cap-t">${esc(it.title)}</span><span class="tw-album-cap-a">${esc(it.creator)}</span></span></span>
          <span class="tw-rec-n"><span class="tw-rec-num">${pad(i + 1)}</span><span class="tw-rec-ico" aria-hidden="true"></span></span>
          <span class="tw-rec-main"><span class="tw-rec-title">${esc(it.title)}</span><span class="tw-rec-artist">${esc(it.creator)}</span><span class="tw-rec-album">${esc((it.context || '').replace(/^From /, ''))}</span></span>
          <span class="tw-rec-year">${esc(it.date)}</span>
        </button>`).join('')}
        <div class="tw-card" role="dialog" hidden></div>
      </div>
      <p class="tw-recs-credit">Cover art and 30-second previews via Apple Music</p>
    </section>`;
}

// The card for a record: what it is, Matthew's note, and a 30-second preview.
function renderRecordCard(it, n, previewState) {
  const on = previewState.playing && previewState.id === it.id;
  return `
    <button class="tw-card-close" type="button" aria-label="Close">Close ×</button>
    <span class="tw-tag">${pad(n)} · Record</span>
    <h3 class="tw-card-title">${esc(it.title)}</h3>
    <p class="tw-card-by">${esc(it.creator)} · ${esc(it.date)}</p>
    ${it.context ? `<p class="tw-card-context">${esc(it.context)}</p>` : ''}
    ${it.preview ? `<button class="tw-play tw-card-play${on ? ' is-on' : ''}" type="button" data-id="${esc(it.id)}"><span class="tw-play-icon" aria-hidden="true"></span><span class="tw-play-label">${on ? 'Pause preview' : 'Play preview'}</span></button>` : ''}
    <p class="tw-card-credit">${esc(it.credit)} · <a class="tw-src" href="${esc(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.label)} ↗</a></p>`;
}

// ---------------------------------------------------------------- markup

function renderCopy(copy, cls) {
  if (!copy || (!DRAFT && copy.draft)) return '';
  return `<p class="${cls}${copy.draft ? ' is-draft' : ''}">${copy.draft && DRAFT ? '<span class="tw-draft">Draft</span>' : ''}${esc(copy.text)}</p>`;
}


// ---------------------------------------------------------------- styles

function injectStyles() {
  if (document.getElementById('tw-styles')) return;
  const style = document.createElement('style');
  style.id = 'tw-styles';
  style.textContent = `
    .tw{--green:#1f7a54;--shelf-h:340px;--record:300px;--gap:64px;padding-bottom:40px;color:var(--ink)}
    .tw-tag{font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4)}
    .tw-code{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.4)}
    .tw-code-mark{width:10px;height:1px;background:rgba(var(--ink-rgb),0.35)}
    .tw-link{font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--green);text-decoration:none}
    .tw-link:hover{text-decoration:underline;text-underline-offset:3px}
    .tw-src{color:inherit;text-underline-offset:2px}
    .tw-src:hover{color:var(--green)}
    .tw a:focus-visible,.tw button:focus-visible{outline:1.5px solid var(--accent);outline-offset:3px}

    .tw-draftbar{display:inline-block;margin-bottom:34px;font-family:var(--font-mono);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#7a5a12;background:#f3e7c4;border:0.5px solid #d9c27f;padding:7px 12px;border-radius:2px;}
    .tw-draft{display:inline-block;margin-right:8px;font-family:var(--font-mono);font-size:8.5px;letter-spacing:0.12em;text-transform:uppercase;color:#7a5a12;background:#f3e7c4;padding:2px 5px;border-radius:2px;vertical-align:2px}
    .is-draft{color:rgba(var(--ink-rgb),0.5)!important}

    .tw-head{max-width:1120px;margin:0 auto;padding:130px 48px 0}
    .tw-head-tags{display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding-bottom:18px;margin-bottom:34px;border-bottom:0.5px solid rgba(var(--ink-rgb),0.18)}
    /* The project title alone is set in a book serif (EB Garamond, loaded only on
       this page); everything else stays in the site's letterhead type. */
    .tw-title{font-family:'EB Garamond',Georgia,serif;font-weight:400;font-size:clamp(40px,5.4vw,64px);line-height:1.04;letter-spacing:-0.012em}
    .tw-descriptor{font-family:var(--font-serif);font-size:18px;color:rgba(var(--ink-rgb),0.7);margin-top:10px}
    .tw-byline{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.4);margin-top:14px}
    .tw-epigraph{margin:36px 0 0}
    .tw-epigraph p{font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:22px;line-height:1.4;color:var(--ink)}
    .tw-epigraph cite{display:block;margin-top:6px;font-style:normal;font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.5)}
    .tw-intro{font-family:var(--font-serif);font-size:18px;line-height:1.6;color:rgba(var(--ink-rgb),0.78);max-width:60ch;margin-top:22px}

    /* Header: the title and intro on the left, a library-card contents
       list on the right (it replaces the old row of section links). */
    .tw-head-grid{display:grid;grid-template-columns:minmax(0,1fr) 250px;column-gap:72px;align-items:end}
    .tw-contents{padding-bottom:4px}
    .tw-contents-tag{display:block;padding-bottom:10px;border-bottom:0.5px solid rgba(var(--ink-rgb),0.18)}
    .tw-contents-list{list-style:none}
    .tw-contents-link{display:grid;grid-template-columns:26px auto minmax(12px,1fr) auto;align-items:baseline;column-gap:8px;padding:10px 0;border-bottom:0.5px solid rgba(var(--ink-rgb),0.1);text-decoration:none;font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.6);transition:color 0.2s}
    .tw-contents-n{color:rgba(var(--ink-rgb),0.35)}
    .tw-contents-leader{border-bottom:1px dotted rgba(var(--ink-rgb),0.28);transform:translateY(-3px)}
    .tw-contents-count{color:rgba(var(--ink-rgb),0.4);font-size:9.5px}
    .tw-contents-link:hover,.tw-contents-link.is-current{color:var(--ink)}
    .tw-contents-link:hover .tw-contents-n,.tw-contents-link.is-current .tw-contents-n{color:var(--ink)}
    .tw-contents-link.is-empty{color:rgba(var(--ink-rgb),0.3)}

    /* One shelf per section, stacked like the shelves of a reference library. */
    .tw-shelf{margin-top:120px;scroll-margin-top:90px}
    .tw-shelf:first-of-type{margin-top:96px}
    .tw-shelf-head{max-width:1024px;margin:0 max(48px,calc((100% - 1024px) / 2));display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding-bottom:16px;border-bottom:0.5px solid rgba(var(--ink-rgb),0.18)}
    .tw-shelf-name{color:rgba(var(--ink-rgb),0.7);white-space:nowrap;flex-shrink:0}
    .tw-set{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:8px 16px}
    /* Listening: Grid / List switch, set apart under the shelf label. */
    .tw-recbar{max-width:1024px;margin:26px max(48px,calc((100% - 1024px) / 2)) 0;display:flex}
    .tw-viewswitch{display:inline-flex;border:0.5px solid rgba(var(--ink-rgb),0.4);border-radius:3px;padding:3px;gap:3px}
    .tw-viewswitch button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:9px;padding:9px 18px;border-radius:2px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.55);transition:color 0.2s,background 0.2s}
    .tw-viewswitch button svg{width:12px;height:12px;fill:currentColor}
    .tw-viewswitch button:hover{color:var(--ink)}
    .tw-viewswitch button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
    .tw-viewswitch button:focus-visible{outline:1px solid var(--accent);outline-offset:2px}
    /* The records: one set of elements, two arrangements. */
    .tw-recs{position:relative;max-width:1024px;margin:28px max(48px,calc((100% - 1024px) / 2)) 0}
    .tw-rec{all:unset;box-sizing:border-box;cursor:pointer;display:grid;min-width:0;-webkit-tap-highlight-color:transparent}
    .tw-rec-art{position:relative;display:block;overflow:hidden;background:rgba(var(--ink-rgb),0.06);transform-origin:0 0}
    .tw-rec-art img{display:block;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}
    .tw-rec.is-empty .tw-rec-art img{visibility:hidden}
    .tw-rec.is-playing .tw-spin{opacity:1}
    .tw-rec:focus-visible .tw-rec-art{outline:1px solid var(--accent);outline-offset:4px}
    .tw-rec-n,.tw-rec-year{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;color:rgba(var(--ink-rgb),0.4)}
    .tw-rec-title,.tw-rec-artist{display:block;font-family:var(--font-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tw-rec-title{font-size:15px;color:var(--ink)}
    .tw-rec-artist{font-size:13px;color:rgba(var(--ink-rgb),0.6);margin-top:2px}
    .tw-rec.is-current .tw-rec-n{color:var(--ink)}
    /* Grid: covers in rows of five, number beneath. */
    .tw-recs.is-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:30px 24px}
    .tw-recs.is-grid .tw-rec{grid-template-areas:"art" "n";row-gap:12px}
    .tw-recs.is-grid .tw-rec-art{grid-area:art;aspect-ratio:1;box-shadow:0 14px 22px -18px rgba(var(--ink-rgb),0.5)}
    .tw-recs.is-grid .tw-rec-n{grid-area:n}
    .tw-recs.is-grid .tw-rec-main,.tw-recs.is-grid .tw-rec-year{display:none}
    @media (hover:hover){.tw-recs.is-grid .tw-rec:hover .tw-album-cap{opacity:1;transform:none}}
    .tw-recs.is-grid .tw-rec:focus-visible .tw-album-cap{opacity:1;transform:none}
    /* List: a diptych, tracks 1-10 down the left and the rest down the right. */
    .tw-recs.is-list{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:repeat(var(--rows),auto);grid-auto-flow:column;column-gap:56px;border-top:0.5px solid rgba(var(--ink-rgb),0.18)}
    .tw-recs.is-list .tw-rec{grid-template-columns:24px 44px minmax(0,1fr) 40px;grid-template-areas:"n art main year";align-items:center;column-gap:16px;padding:8px;border-bottom:0.5px solid rgba(var(--ink-rgb),0.12);transition:background 0.2s}
    .tw-recs.is-list .tw-rec:hover,.tw-recs.is-list .tw-rec.is-current{background:rgba(var(--ink-rgb),0.04)}
    .tw-recs.is-list .tw-rec-n{grid-area:n}
    .tw-recs.is-list .tw-rec-art{grid-area:art;width:44px;height:44px}
    .tw-recs.is-list .tw-rec-main{grid-area:main;min-width:0}
    .tw-recs.is-list .tw-rec-year{grid-area:year;text-align:right}
    .tw-recs.is-list .tw-album-cap{display:none}
    .tw-rec-album{display:none}
    .tw-recs.is-list .tw-rec-album{display:block;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.42);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tw-recs.is-list .tw-rec.is-playing{background:rgba(var(--ink-rgb),0.07)}
    /* The track number doubles as the control: it turns into a play mark on
       the row under the pointer, and a red pause mark on the playing row. */
    .tw-rec-ico{display:none;width:9px;height:10px}
    .tw-recs.is-list .tw-rec.is-playing .tw-rec-num{display:none}
    .tw-recs.is-list .tw-rec.is-playing .tw-rec-ico{display:block;background:linear-gradient(90deg,#df4931 0 3px,transparent 3px 6px,#df4931 6px 9px)}
    @media (hover:hover){
      .tw-recs.is-list .tw-rec:hover:not(.is-playing) .tw-rec-num{display:none}
      .tw-recs.is-list .tw-rec:hover:not(.is-playing) .tw-rec-ico{display:block;width:0;height:0;border-left:8px solid var(--ink);border-top:5px solid transparent;border-bottom:5px solid transparent}
    }
    .tw-recs.is-list .tw-rec:focus-visible:not(.is-playing) .tw-rec-num{display:none}
    .tw-recs.is-list .tw-rec:focus-visible:not(.is-playing) .tw-rec-ico{display:block;width:0;height:0;border-left:8px solid var(--ink);border-top:5px solid transparent;border-bottom:5px solid transparent}
    /* Touch screens can't hover, so they get one line of instruction instead. */
    .tw-recs-hint{display:none;max-width:1024px;margin:14px max(48px,calc((100% - 1024px) / 2)) 0;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.05em;color:rgba(var(--ink-rgb),0.45)}
    @media (hover:none){.tw-shelf--records:has(.tw-recs.is-list) .tw-recs-hint{display:block}}
    .tw-recs-credit{max-width:1024px;margin:18px max(48px,calc((100% - 1024px) / 2)) 0;font-family:var(--font-mono);font-size:9px;letter-spacing:0.05em;color:rgba(var(--ink-rgb),0.4)}
    .tw-recs.is-list .tw-spin{top:4px;right:4px;width:6px;height:6px}
    .tw-card-play{margin-top:14px}
    .tw-album-cap{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:2px;padding:28px 12px 10px;background:linear-gradient(to top,rgba(13,14,16,0.78),rgba(13,14,16,0));color:#FAFAF7;opacity:0;transform:translateY(4px);transition:opacity 0.22s ease-out,transform 0.22s ease-out;pointer-events:none}
    .tw-album-cap-t{font-family:var(--font-serif);font-size:13px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tw-album-cap-a{font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    /* A diptych: the first half of the set runs down the left, the second down the right. */
    .tw-list{list-style:none;max-width:1024px;margin:20px max(48px,calc((100% - 1024px) / 2)) 0}
    .tw-list-entry{display:grid;grid-template-columns:24px minmax(0,1fr) 280px;column-gap:32px;align-items:start;padding:14px 0;border-bottom:0.5px solid rgba(var(--ink-rgb),0.14)}
    .tw-list-n{font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;color:rgba(var(--ink-rgb),0.4);padding-top:7px}
    .tw-list-line{display:flex;justify-content:space-between;align-items:baseline;gap:24px;flex-wrap:wrap}
    .tw-list-name{font-family:var(--font-serif);font-weight:400;font-size:21px;line-height:1.15;letter-spacing:-0.01em;color:var(--ink)}
    .tw-list-city{font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.55);white-space:nowrap}
    .tw-list-note{max-width:620px;margin-top:12px;font-family:var(--font-serif);font-size:16px;line-height:1.6;color:rgba(var(--ink-rgb),0.8)}
    .tw-list-note.is-draft{color:rgba(var(--ink-rgb),0.5)}
    .tw-list-src{display:inline-block;margin-top:0;font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.45);text-decoration:none;transition:color 0.2s}
    .tw-list-src:hover{color:var(--accent)}
    .tw-list-src + .tw-list-src{margin-left:16px}
    .tw-list-links{margin-top:8px}
    .tw-list-credit{margin-top:4px;font-family:var(--font-mono);font-size:8.5px;letter-spacing:0.04em}
    .tw-list-credit a{color:rgba(var(--ink-rgb),0.38);text-decoration:none;transition:color 0.2s}
    .tw-list-credit a:hover{color:var(--accent)}
    .tw-list-fig{overflow:hidden}
    @media (hover:hover){.tw-list-entry:hover .tw-list-fig img{transform:scale(1.04)}}
    .tw-list-blurb{max-width:560px;margin-top:5px;font-family:var(--font-serif);font-size:14.5px;line-height:1.5;color:rgba(var(--ink-rgb),0.75)}
    .tw-list-note{max-width:560px;margin-top:8px;font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:17px;line-height:1.42;color:rgba(var(--ink-rgb),0.48)}
    /* Objects: three columns; each object sits whole on a shared
       baseline inside a capped frame, captions line up beneath. */
    /* Objects: each row is its own grid whose columns are proportional to
       the square root of each image's width/height ratio. Every image fills
       its column, so within a row all objects get the same visual area: wide
       pieces run long and low, tall ones stand up, none are cropped. Bottoms
       share a line and captions start on one line beneath. */
    .tw-objects{max-width:1024px;margin:44px max(48px,calc((100% - 1024px) / 2)) 0}
    .tw-objrow{display:grid;grid-template-rows:auto auto;column-gap:44px;margin-bottom:72px}
    .tw-objfig{margin:0;min-width:0;display:grid;grid-row:span 2;grid-template-rows:subgrid}
    .tw-objfig-frame{align-self:end;display:block}
    /* Collage: a loose salon hang. Each object sits in its own span of a
       12-column canvas, dropped some distance into its band; sizes and
       positions vary, proportions never do. */
    .tw-collage{max-width:1024px;margin:52px max(48px,calc((100% - 1024px) / 2)) 0;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:20px;row-gap:84px;align-items:start}
    .tw-collage .tw-objfig{display:block;min-width:0;margin-top:var(--drop,0px)}
    .tw-collage .tw-objfig-cap{max-width:34ch}
    /* Caption beside the image: the image takes two thirds, the caption sits
       against it at the bottom, on the side the layout asks for. */
    .tw-collage .tw-objfig.cap-right,.tw-collage .tw-objfig.cap-left{display:grid;column-gap:28px;align-items:end}
    .tw-collage .tw-objfig.cap-right{grid-template-columns:2fr 1fr;grid-template-areas:"img cap"}
    .tw-collage .tw-objfig.cap-left{grid-template-columns:1fr 2fr;grid-template-areas:"cap img"}
    .tw-objfig.cap-right .tw-objfig-frame,.tw-objfig.cap-left .tw-objfig-frame{grid-area:img}
    .tw-objfig.cap-right .tw-objfig-cap,.tw-objfig.cap-left .tw-objfig-cap{grid-area:cap;margin-top:0}
    .tw-objfig.cap-left .tw-objfig-cap{text-align:right;justify-self:end}
    .tw-objstack{min-width:0;display:grid;grid-row:span 2;grid-template-rows:subgrid}
    .tw-objstack-upper{align-self:end}
    .tw-objfig.is-stacked{display:block;margin-bottom:36px}
    .tw-objfig-img{all:unset;cursor:zoom-in;display:block;width:100%}
    .tw-objfig-img img{display:block;width:100%;height:auto;object-fit:contain;transition:transform 0.45s cubic-bezier(.22,.61,.36,1),box-shadow 0.45s ease;transform-origin:50% 100%}
    @media (hover:hover){.tw-objfig-img:hover img{transform:translateY(-6px) scale(1.015);box-shadow:0 26px 34px -26px rgba(var(--ink-rgb),0.45)}}
    .tw-objfig-img:focus-visible{outline:1px solid var(--accent);outline-offset:4px}
    .tw-objfig-ph{width:100%;aspect-ratio:4/5;max-height:360px;border:0.5px dashed rgba(var(--ink-rgb),0.3);display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding:20px}
    .tw-objfig-ph-note{font-family:var(--font-mono);font-size:10px;line-height:1.6;color:rgba(var(--ink-rgb),0.5);max-width:34ch}
    .tw-objfig-cap{margin-top:18px}
    .tw-objfig-n{display:block;font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;color:rgba(var(--ink-rgb),0.4)}
    .tw-objfig-title{font-family:var(--font-serif);font-weight:400;font-size:21px;line-height:1.2;color:var(--ink);margin-top:6px}
    .tw-objfig-by{font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.55);margin-top:6px}
    .tw-objfig-sub{text-transform:none;letter-spacing:0.04em}
    .tw-objfig-credit,.tw-objfig-credit a{font-family:var(--font-mono);font-size:9px;line-height:1.6;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.45);text-decoration:none}
    .tw-objfig-credit{margin-top:10px}
    .tw-objfig-credit a:hover{color:var(--accent)}
    .tw-list-n{grid-column:1}
    .tw-list-fig{margin:0}
    .tw-list-fig img{display:block;width:100%;aspect-ratio:16/9;transition:transform 0.5s cubic-bezier(.22,.61,.36,1);object-fit:cover;background:rgba(var(--ink-rgb),0.06)}
    .tw-list-fig figcaption{margin-top:5px;font-family:var(--font-mono);font-size:8px;line-height:1.5;letter-spacing:0.04em}
    .tw-list-fig figcaption a{color:rgba(var(--ink-rgb),0.42);text-decoration:none;transition:color 0.2s}
    .tw-list-fig figcaption a:hover{color:var(--accent)}
    .tw-set-meta{font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;color:rgba(var(--ink-rgb),0.4)}
    .tw-set-meta em{font-style:normal;color:#7a5a12}
    .tw-set-meta a{white-space:nowrap}
    .tw-setplay{padding:7px 12px}
    .tw-play:disabled{opacity:0.4;cursor:default}
    .tw-shelf-note{max-width:1024px;margin:22px max(48px,calc((100% - 1024px) / 2)) 0;font-family:var(--font-serif);font-size:17px;line-height:1.6;color:rgba(var(--ink-rgb),0.75)}
    /* The wall: posters hung in a grid, bottoms on one line like a row of frames. */
    .tw-wall{position:relative;max-width:1024px;margin:48px max(48px,calc((100% - 1024px) / 2)) 0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:44px 32px;align-items:end}
    .tw-hang{all:unset;position:relative;display:block;cursor:pointer;aspect-ratio:var(--r,2/3);background:rgba(var(--ink-rgb),0.06);box-shadow:0 1px 2px rgba(var(--ink-rgb),0.12),0 16px 26px -20px rgba(var(--ink-rgb),0.5);transition:transform 0.35s cubic-bezier(.22,.61,.36,1),opacity 0.35s ease,box-shadow 0.35s ease;-webkit-tap-highlight-color:transparent}
    /* Each book spans two rows of a subgrid: covers sit on a shared baseline,
       captions start on a shared line beneath, whatever each cover's shape. */
    .tw-wall--plates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:32px;row-gap:0;align-items:start}
    .tw-plate{margin:0;min-width:0;display:grid;grid-row:span 2;grid-template-rows:subgrid}
    .tw-plate .tw-tile{align-self:end;aspect-ratio:var(--cr);width:100%;background:none;overflow:hidden}
    .tw-plate .tw-plate-cap{margin:12px 0 48px}
    .tw-plate .tw-tile > .tw-tile-cover{width:100%;height:100%;object-fit:cover;transition:opacity 0.35s ease}
    .tw-tile-inside{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:6%;background:var(--bg);opacity:0;transition:opacity 0.35s ease;pointer-events:none}
    .tw-plate .tw-tile-inside img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
    @media (hover:hover){.tw-tile.has-inside:hover .tw-tile-inside{opacity:1}}
    .tw-tile.has-inside:focus-visible .tw-tile-inside{opacity:1}
    .tw-plate-cap{display:flex;flex-direction:column;gap:4px;margin-top:12px}
    .tw-plate-who{font-family:var(--font-serif);font-size:15px;line-height:1.3;color:var(--ink)}
    .tw-plate-what{font-family:var(--font-mono);font-size:9.5px;line-height:1.5;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.5)}
    .tw-wall--plates.has-current .tw-plate:not(:has(.is-current)) .tw-plate-cap{opacity:0.5}
    .tw-card-enlarge{all:unset;cursor:pointer;display:inline-block;margin-top:14px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);border-bottom:0.5px solid rgba(var(--ink-rgb),0.4);padding-bottom:2px}
    .tw-card-enlarge:hover{color:var(--accent);border-color:var(--accent)}
    .tw-hang img{display:block;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}
    .tw-wall.has-current .tw-hang:not(.is-current){opacity:0.5}
    .tw-hang.is-current{transform:translateY(-4px);box-shadow:0 1px 2px rgba(var(--ink-rgb),0.12),0 24px 34px -22px rgba(var(--ink-rgb),0.55)}
    .tw-hang:focus-visible{outline:1.5px solid var(--accent);outline-offset:4px}
    .tw-hang-tag{position:absolute;left:6px;bottom:6px;font-family:var(--font-mono);font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:#7a5a12;background:#f3e7c4;padding:2px 5px;border-radius:2px}
    .tw-card{position:absolute;z-index:30;width:max-content;min-width:220px;max-width:300px;background:var(--card-stock);border:0.5px solid rgba(var(--ink-rgb),0.14);box-shadow:0 26px 44px -26px rgba(var(--ink-rgb),0.55);padding:18px 18px 16px;opacity:0;transform:translateY(6px);transition:opacity 0.2s ease,transform 0.2s ease;pointer-events:none}
    .tw-card.is-open{opacity:1;transform:none;pointer-events:auto}
    .tw-card-close{all:unset;display:none;cursor:pointer;float:right;font-family:var(--font-mono);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.5)}
    .tw-card-title{font-family:var(--font-display);font-weight:400;font-size:21px;line-height:1.2;margin-top:12px}
    .tw-card-by{font-family:var(--font-serif);font-size:14px;color:rgba(var(--ink-rgb),0.7);margin-top:4px}
    .tw-card-context{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.05em;line-height:1.7;color:rgba(var(--ink-rgb),0.5);margin-top:12px}
    .tw-card-note{font-family:var(--font-serif);font-size:14.5px;line-height:1.55;color:rgba(var(--ink-rgb),0.85);margin-top:14px}
    .tw-card-stills{margin-top:14px;max-width:none}
    .tw-card-credit{font-family:var(--font-mono);font-size:9px;letter-spacing:0.05em;line-height:1.7;color:rgba(var(--ink-rgb),0.4);margin-top:12px}
    .tw-card-dev{font-size:9.5px;margin-top:12px}
    .tw-spin{position:absolute;top:12px;right:12px;width:7px;height:7px;border-radius:50%;background:#df4931;opacity:0;transition:opacity 0.3s}


    .tw-stills{display:flex;gap:8px;margin-top:20px;max-width:440px}
    .tw-still{all:unset;cursor:zoom-in;display:block;flex:1 1 0;min-width:0;aspect-ratio:var(--r,16/9);background:rgba(var(--ink-rgb),0.06);transition:opacity 0.2s}
    .tw-still img{display:block;width:100%;height:100%;object-fit:cover}
    .tw-still:hover{opacity:0.85}
    .tw-play{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);border:0.5px solid rgba(var(--ink-rgb),0.35);padding:9px 14px;border-radius:2px;transition:border-color 0.2s}
    .tw-play:hover{border-color:var(--ink)}
    .tw-play-icon{width:0;height:0;border-left:7px solid #1f7a54;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent}
    .tw-play.is-on .tw-play-icon{width:7px;height:9px;border:none;background:linear-gradient(90deg,#df4931 0 2.5px,transparent 2.5px 4.5px,#df4931 4.5px)}
    .tw-devnote{font-family:var(--font-mono);font-size:10px;line-height:1.7;color:#7a5a12;margin-top:18px;max-width:62ch}


    .tw-exit{max-width:1120px;margin:80px auto 0;padding:0 48px 40px}

    .tw-gallery{position:fixed;inset:0;z-index:180;background:var(--bg);display:flex;flex-direction:column;overflow:auto;padding:24px max(32px,4vw) 40px}
    .tw-gallery[hidden]{display:none}
    .tw-gallery-head{display:flex;justify-content:space-between;align-items:center;gap:24px;padding-bottom:18px;border-bottom:0.5px solid rgba(var(--ink-rgb),0.18)}
    .tw-gallery-book{display:flex;align-items:center;gap:16px;min-width:0}
    .tw-gallery-cover{height:56px;width:auto;box-shadow:0 1px 2px rgba(var(--ink-rgb),0.18),0 8px 14px -8px rgba(var(--ink-rgb),0.45)}
    .tw-gallery-title{font-family:var(--font-serif);font-size:20px;line-height:1.2;color:var(--ink)}
    .tw-gallery-by{font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.5);margin-top:4px}
    .tw-gallery-pub{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.45);margin-top:3px}
    .tw-gallery-close{all:unset;cursor:pointer;font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-rgb),0.6);padding:6px 0}
    .tw-gallery-close:hover{color:var(--ink)}
    /* One shared height, sized so the row fits the window: --sum is the total
       of the photographs' width/height ratios. */
    .tw-gallery-row{flex:none;display:flex;align-items:flex-start;justify-content:center;gap:28px;margin:auto;padding:32px 0 8px;width:100%;max-width:min(1400px, calc((100vh - 260px) * var(--sum) + (var(--n) - 1) * 28px))}
    .tw-gallery-fig{margin:0;min-width:0;flex:var(--r) 1 0}
    .tw-gallery-img{all:unset;cursor:zoom-in;display:block;width:100%}
    .tw-gallery-img img{display:block;width:100%;aspect-ratio:var(--r);object-fit:cover;box-shadow:0 1px 2px rgba(var(--ink-rgb),0.14),0 18px 28px -22px rgba(var(--ink-rgb),0.5)}
    .tw-gallery-fig figcaption{display:flex;flex-direction:column;gap:4px;margin-top:12px}
    .tw-gallery-cap{font-family:var(--font-serif);font-size:13.5px;line-height:1.4;color:var(--ink)}
    .tw-gallery-credit,.tw-gallery-credit a{font-family:var(--font-mono);font-size:9px;letter-spacing:0.04em;color:rgba(var(--ink-rgb),0.45);text-decoration:none}
    .tw-gallery-credit a:hover{color:var(--accent)}
    .tw-lightbox{position:fixed;inset:0;z-index:200;background:rgba(13,14,16,0.95);display:flex;align-items:center;justify-content:center;padding:64px 24px 40px}
    .tw-lightbox[hidden]{display:none}
    .tw-lightbox-fig{display:flex;flex-direction:column;align-items:center;gap:16px;max-width:100%;max-height:100%}
    .tw-lightbox-fig img{max-width:92vw;max-height:calc(100vh - 150px);object-fit:contain}
    .tw-lightbox-fig figcaption{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:rgba(var(--ink-light-rgb),0.55);text-align:center}
    .tw-lightbox-close{all:unset;cursor:pointer;position:absolute;top:22px;right:26px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(var(--ink-light-rgb),0.6)}
    .tw-lightbox-close:hover{color:rgba(var(--ink-light-rgb),0.95)}

    @media (max-width:760px){
      .tw{--shelf-h:min(300px,62vw);--record:min(260px,56vw);--gap:30px}
      .tw-head{padding:118px 20px 0}
      .tw-intro{font-size:17px}
      .tw-shelf{margin-top:88px}
      .tw-shelf:first-of-type{margin-top:72px}
      .tw-shelf-head,.tw-shelf-note{margin-left:20px;margin-right:20px}
      .tw-shelf-head{flex-wrap:wrap;gap:12px}
      .tw-set{justify-content:flex-start}
      .tw-wall{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 20px;margin:32px 20px 0}
      .tw-wall--plates{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px}
      .tw-gallery{padding:16px 20px 32px}
      .tw-gallery-row{flex-direction:column;max-width:none;gap:32px;padding-top:24px}
      .tw-gallery-fig{flex:none;width:100%}
      .tw-plate .tw-plate-cap{margin-bottom:30px}
      .tw-plate-who{font-size:13.5px}
      .tw-list{margin:20px 20px 0}
      .tw-recbar{margin:20px 20px 0}
      .tw-recs{margin:22px 20px 0}
      .tw-recs-credit{margin:14px 20px 0}
      .tw-recs-hint{margin:12px 20px 0}
      .tw-recs.is-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 14px}
      .tw-recs.is-grid .tw-spin{top:6px;right:6px}
      .tw-recs.is-list{grid-template-columns:minmax(0,1fr);grid-template-rows:none;grid-auto-flow:row;column-gap:0}
      .tw-recs.is-list .tw-rec{grid-template-columns:22px 44px minmax(0,1fr) 34px;column-gap:12px;padding:8px 4px}
      .tw-recs.is-list .tw-rec-title{white-space:normal;line-height:1.25}
      .tw-objects{margin:28px 20px 0}
      /* Phone collage: one column, but the tall pieces alternate sides at
         three-quarter width and the wide ones run full width. */
      .tw-collage{display:block;margin:32px 20px 0}
      .tw-collage .tw-objfig{margin:0 0 52px;width:100%}
      .tw-collage .tw-objfig.cap-right,.tw-collage .tw-objfig.cap-left{display:block}
      .tw-objfig.cap-left .tw-objfig-cap{text-align:left}
      .tw-objfig.cap-right .tw-objfig-cap,.tw-objfig.cap-left .tw-objfig-cap{margin-top:18px}
      .tw-collage .tw-objfig.is-tall-shape{width:74%}
      .tw-collage .tw-objfig.is-tall-shape:nth-child(even){margin-left:auto}
      .tw-objrow{display:block;margin-bottom:0}
      .tw-objfig{display:block;margin-bottom:48px}
      .tw-objstack{display:block;margin-bottom:48px}
      .tw-objfig.is-stacked{margin-bottom:48px}
      .tw-objfig-title{font-size:21px}
      .tw-list-entry{grid-template-columns:22px minmax(0,1fr) 112px;column-gap:14px;padding:14px 0;align-items:start}
      .tw-list-fig figcaption{display:none}
      .tw-list-n{padding-top:5px}
      .tw-list-name{font-size:18px}
      .tw-list-line{flex-direction:column;gap:6px}
      .tw-card{position:fixed;left:12px;right:12px;bottom:12px;top:auto!important;left:12px!important;width:auto;min-width:0;max-width:none;max-height:72vh;overflow:auto;padding:18px 18px 20px}
      .tw-card-close{display:block}
      .tw-head-grid{grid-template-columns:minmax(0,1fr);row-gap:36px}
      .tw-exit{padding:0 20px 32px}
      .tw-draftbar{font-size:8px;line-height:1.6}
    }
    .tw-pre{opacity:0}
    @media (prefers-reduced-motion:reduce){
    }
  `;
  document.head.appendChild(style);
}
