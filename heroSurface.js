import { mountCrayonTrails } from './crayonTrails.js';

// Off for now (wood desk-reveal parked, crayon trails stay) — flip this
// back to true to bring the wood layer and the paper's corner cuts back;
// everything below is still fully wired up, just skipped while this is
// false. Paper simply covers the whole backdrop with no cuts, and
// isPaperPoint has nothing to exclude, when this is off.
const WOOD_ENABLED = false;

const OAK_WIDTH_FRAC = 0.1, OAK_HEIGHT_FRAC = 0.12;
const WOOD_TILE_PX = 384;

function injectStyles() {
  if (document.getElementById('hero-surface-styles')) return;
  const style = document.createElement('style');
  style.id = 'hero-surface-styles';
  style.textContent = `
    /* Deliberately z-index:auto and NOT a stacking context of its own —
       card.js treats .hero itself as its "interactionRoot", dynamically
       bumping .hero's z-index to 150 (above nav) while the card is
       dragged/extended (see updateElevation()). If this backdrop lived
       inside .hero, or had its own explicit z-index, its opaque layers
       would ride along with that bump and paint over nav. Left auto, it
       always resolves below .hero's own explicit z-index — see
       .trails-toggle below for the one deliberate exception.
       No CSS transition on height: .hero's own height is ALREADY being
       smoothly animated frame-by-frame by card.js's résumé tween (see
       updateHeroPadding() in card.js) — this is just a live 1:1 mirror of
       that already-smooth value, not a second animation layered on it. */
    .hero-materials{position:absolute;top:0;left:0;width:100%;height:100vh;overflow:hidden;pointer-events:none}
    /* ONE wood layer, full-bleed behind everything, for the life of the
       page — it never resizes, repositions, or gets a new background.
       top-left anchoring (not center) is what makes that true visually
       too: center recomputes the tile's alignment against whatever the
       CURRENT box size happens to be, so two differently-sized boxes (or
       one box that resizes over time) never agree on where the grain
       sits. Anchored to a corner that never moves, the tile can't drift.
       "Revealing" it is entirely the paper's job below — its clip-path
       covers more or less of this one unchanging layer, never the other
       way around. */
    .hero-materials .hero-wood{position:absolute;inset:0;background:#d9c6a8 url('assets/pale-oak.jpg') top left/${WOOD_TILE_PX}px ${WOOD_TILE_PX}px repeat}
    /* filter lives on this unclipped wrapper, not on .hero-paper itself —
       clip-path and filter on the SAME element would clip the shadow off
       right at the cut edge, since clip-path restricts the whole element's
       paint (post-filter) to its shape. Left on a plain ancestor, the
       shadow can spill a couple px past the cut onto the wood beneath,
       reading as the paper sitting physically on top of it. */
    .hero-materials .hero-paper-shadow{position:absolute;inset:0;filter:drop-shadow(0 1px 2px rgba(40,28,16,0.28))}
    /* clip-path is set entirely in JS (see syncHeight) — it's one hexagon:
       a fixed cut near the top-left (unaffected by anything below), and a
       diagonal on the bottom-right that starts exactly where that corner
       was originally cut and keeps running at the same slope for however
       much taller .hero gets. The wood already extends infinitely behind
       it in every direction; this is just how much of it stays covered. */
    .hero-materials .hero-paper{position:absolute;inset:0;background:var(--card-stock)}
    .hero-materials .hero-paper::after{content:'';position:absolute;inset:0;opacity:.045;background:url('assets/paper-grain.svg') repeat;background-size:140px}
    /* height NOT 100% — crayonTrails.js sets it explicitly via JS, to a
       high-water mark that only ever grows (see its resize()), so the
       canvas's own backing store doesn't get reallocated on every frame
       of the résumé's open/close animation. .hero-materials's own
       overflow:hidden (this rule) is what actually crops the — often
       taller-than-currently-needed — canvas down to whatever's visible
       right now; .hero-materials's own height already animates smoothly
       on its own, independent of any of this. */
    .hero-materials .crayon-trails{position:absolute;top:0;left:0;width:100%;pointer-events:none}
    /* z-index:200 is the one layer here that DOES need to escape .hero's
       elevation — a real button has to stay clickable even if .hero is
       currently sitting at z-index:150. pointer-events re-enabled locally
       since the .hero-materials root above is pointer-events:none. Sits
       in the bottom-right wood corner, as a minimal dot rather than a
       labeled pill — see updateToggle() in crayonTrails.js, which sets an
       aria-label instead of visible text so the dot stays accessible
       without needing any text on the page. */
    .hero-materials .trails-toggle{position:absolute;z-index:200;pointer-events:auto;bottom:16px;right:18px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;padding:0;background:transparent;border-radius:50%;cursor:pointer}
    .hero-materials .trails-toggle::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--crayon-color,var(--accent));transition:background 0.2s,opacity 0.2s}
    .hero-materials .trails-toggle[aria-pressed='false']::before{background:rgba(var(--ink-rgb),0.3)}
    .hero-materials .trails-toggle:hover::before{opacity:0.8}
    .hero-materials .trails-toggle:focus-visible{outline:2px solid rgba(var(--ink-rgb),0.55);outline-offset:3px}
  `;
  document.head.appendChild(style);
}

/** Host supplies the card's busy state — see card.js's isCardSettled(). Marks
    are deliberately NOT blocked from the card's own screen position (see the
    mountCrayonTrails call below) — the crayon canvas sits behind the card in
    z-order, so a mark recorded there just stays hidden until the card moves
    off it, rather than leaving a permanent gap shaped like the card. */
export function initHeroSurface({ hero, cardIsBusy, navElement, getCardScreenRect = () => null }) {
  if (typeof cardIsBusy !== 'function') {
    throw new TypeError('initHeroSurface needs a cardIsBusy callback.');
  }
  injectStyles();

  // A sibling of .hero, not a child — see the CSS comment above.
  const materials = document.createElement('div');
  materials.className = 'hero-materials';
  materials.setAttribute('aria-hidden', 'true');

  const paperShadow = document.createElement('div');
  paperShadow.className = 'hero-paper-shadow';
  const paper = document.createElement('div');
  paper.className = 'hero-paper';
  paperShadow.append(paper);

  if (WOOD_ENABLED) {
    const wood = document.createElement('div');
    wood.className = 'hero-wood';
    materials.append(wood);
  }
  materials.append(paperShadow);
  hero.before(materials);

  // restingHeight/ow/oh/cutTopX/cutSlope are all fixed the moment .hero
  // first settles (or re-settles, on a genuine at-rest resize) and never
  // touched again outside that — see syncHeight(). That's what keeps the
  // top-left corner, and the START of the bottom-right diagonal, from
  // ever moving once established.
  let restingHeight = null;
  let ow = 0, oh = 0, cutTopX = 0, cutSlope = 0;

  function isPaperPoint(absX, absY) {
    if (!WOOD_ENABLED || restingHeight === null) return true;
    if (absX < ow && absY < oh && (absX / ow + absY / oh) < 1) return false;
    const xBoundary = cutTopX - cutSlope * (absY - restingHeight);
    if (absY > restingHeight - oh && absX > xBoundary) return false;
    return true;
  }

  function syncHeight() {
    const h = hero.getBoundingClientRect().height;
    materials.style.height = h + 'px';
    if (!WOOD_ENABLED) return;
    const width = materials.clientWidth || hero.clientWidth || 1;
    // .hero never goes below its own resting height on its own — the only
    // way h can be <= the last-known resting height is if we haven't
    // measured yet, or the résumé is genuinely closed (including a window
    // resize that happens while it's closed). Re-baselining only in that
    // case is what keeps the corner geometry frozen through an actual
    // open/close cycle while still tracking legitimate viewport changes
    // at rest.
    if (restingHeight === null || h <= restingHeight) {
      restingHeight = h;
      ow = OAK_WIDTH_FRAC * width;
      oh = OAK_HEIGHT_FRAC * restingHeight;
      cutTopX = width - ow;
      cutSlope = oh > 0 ? ow / oh : 0;
    }
    const cutBottomX = Math.max(0, cutTopX - cutSlope * (h - restingHeight));
    paper.style.clipPath = `polygon(${ow}px 0,${width}px 0,${width}px ${restingHeight - oh}px,${cutBottomX}px ${h}px,0 ${h}px,0 ${oh}px)`;
  }
  syncHeight();
  // Observing .hero itself (not window resize) is what catches the
  // résumé's own open/close growth, not just viewport changes — but ONLY
  // with box:'border-box'. The résumé extension grows .hero's own
  // padding-bottom, not its content box (the flex content area stays
  // exactly the card's own fixed size either way), and ResizeObserver's
  // default content-box mode never fires on a padding-only change.
  const heroResize = new ResizeObserver(syncHeight);
  heroResize.observe(hero, { box: 'border-box' });

  const toggle = document.createElement('button');
  toggle.className = 'trails-toggle';
  toggle.type = 'button';

  const trails = mountCrayonTrails(hero, {
    surface: materials,
    toggle,
    isBusy: cardIsBusy,
    // Used only by the touch ghost; interactive desktop strokes retain
    // their existing behavior behind the card.
    getCardScreenRect,
    // Trying marks under nav too, per request — nav sits above the crayon
    // canvas in z-order (z-index:100 vs the backdrop's auto) with its own
    // frosted-glass blur, so marks there show through blurred/desaturated
    // rather than fully hidden like they are behind the opaque card.
    // navElement is still passed in and available — revert by restoring
    // `navElement ? [navElement.getBoundingClientRect()] : []` here if this
    // doesn't work out.
    getExclusionRects: () => [],
    isPaperPoint
  });
  materials.append(toggle);

  const disposeTrails = trails.destroy;
  return Object.assign(trails, {
    destroy() {
      heroResize.disconnect();
      disposeTrails();
      materials.remove();
    }
  });
}
