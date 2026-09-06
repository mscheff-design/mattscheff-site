import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initContactForm } from './contact.js';
import { JOBS } from './jobs.js';
import { getPalette, onThemeChange } from './theme.js';

/**
 * initCard(container) builds and runs the entire 3D business-card hero.
 * Self-contained: owns the Three.js scene, all textures/materials, its own
 * injected stylesheet, and every DOM overlay. The caller only provides an
 * empty container element. Communicates outward only via a CustomEvent
 * ('resume-job-click') dispatched on the container — it never calls into
 * the host page's own code directly.
 *
 * The dropdown (résumé) is a FRONT-ONLY affordance now — the back is a
 * plain, fixed-size, never-extending face (contact info, social links, a
 * compact note form). The two states are mutually exclusive by design:
 * extending hides the flip-to-back option, and flipping to the back hides
 * the extend option. That isn't just a UX choice — it's what keeps the
 * back face a PLAIN mesh with no shader/tab machinery of its own (see the
 * Geometry strategy note below), which is what makes it immune to the
 * whole class of tab-offset/mirroring bugs the front's own tab had to work
 * through.
 *
 * Interactions:
 *   - hover, cursor position         -> small X/Y-axis tilt
 *   - idle (no cursor, no drag)      -> slow ambient Y-axis sway
 *   - click directly on the card (no drag), front face, not extended ->
 *                             flip 180° to the back
 *   - click directly on the card (no drag), back face, any time -> flip
 *                             180° back to the front
 *   - click-hold-drag anywhere in the hero -> picks the card up and moves
 *                             it freely. Dragging is always a temporary
 *                             displacement, never a new resting spot — on
 *                             release it eases back to its one home
 *                             position (0,0). Past 65% of the way to a
 *                             screen edge, that side glows; release there
 *                             to throw the card off, after which it flies
 *                             back home too. What a throw *does* depends on
 *                             whether the résumé is extended: closed, it's
 *                             vCard-save on the right / mailto on the left;
 *                             extended, both sides download the résumé PDF
 *                             (see throwCard)
 *   - drag UPWARD past a threshold and release, front face, not already
 *                             extended -> extends the résumé and parks the
 *                             card near the top — that "staying open" is a
 *                             separate, persistent effect (cardLift)
 *                             layered on top of the drag's own return-home,
 *                             so the card ends up back at X=0 but still
 *                             lifted for as long as it stays extended.
 *                             Dragging up again while already extended (or
 *                             at all while viewing the back) does nothing.
 *   - drag DOWNWARD past a threshold and release -> un-extends the résumé
 *   - click the toggle row ("RÉSUMÉ") -> same extend/un-extend toggle
 *                             (front only; the back has no toggle row)
 *   - click a job row on the extended résumé -> dispatches a
 *                             'resume-job-click' CustomEvent (detail:
 *                             { jobId }) on the container; the page
 *                             decides what that means (this module never
 *                             navigates or opens anything itself for it)
 *   - click "DOWNLOAD RÉSUMÉ (PDF)" (on the extended résumé) -> downloads
 *                             the static résumé PDF
 *   - click a social link on the back face -> opens it (new tab for
 *                             Instagram/LinkedIn, mailto for Email)
 *
 * Geometry strategy: the card's own front cap and its résumé tab's cap are
 * ONE continuous mesh — one shape, one shared texture, built ONCE at a
 * fixed size and never rebuilt or rescaled (see buildUnifiedCap).
 * Extending/un-extending moves only the tab-tagged half of that mesh's
 * vertices, via a small per-frame shader uniform (see
 * addTabOffsetShader/setDropdownVisual) — it never touches geometry or
 * textures, so nothing can ever resample, stretch, or drift out of sync
 * the way two independently positioned objects could. The BACK cap is
 * deliberately NOT built this way — it's a plain ShapeGeometry with a
 * plain material, because it never needs to move anything.
 */

// Module-scope, not per-initCard() — there is only ever one card on the
// page, and the device it's running on doesn't change mid-session, so this
// is decided once, before any of the geometry/texture math below (all of
// which is itself only ever computed once, at module load — see the
// Geometry strategy note above) rather than threaded through as a
// parameter. Also gates the mobile-specific interaction changes further
// down this file (touch-and-tilt instead of gyroscope, no drag-to-extend-
// résumé, no drag-throw-to-download-résumé — see each one's own comment).
const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// Portrait on touch devices. NOT the landscape numbers swapped — an
// earlier version tried that (a literal 90° rotation, same 1.59:1 ratio
// either way), but on-screen HEIGHT is fixed regardless of orientation
// (REFERENCE_CARD_PX_HEIGHT, below — BASE_CARD_HEIGHT world units always
// maps to that same 366px), so a straight swap only ever changes on-screen
// WIDTH, and 1.59:1 at a fixed height reads as noticeably narrower turned
// on its side than it does wide — a real ~1.59:1 object (a credit card)
// looks proportioned lying flat and skinny stood on end. This ratio
// (~1.3:1) is deliberately less extreme, closer to a vertical ID card than
// a rotated credit card. Everything below this — geometry, texture
// resolution, every layout fraction in drawFront/drawBack — derives from
// these two numbers, so this one branch is what makes the entire rest of
// the file portrait-aware without touching the geometry-building code at
// all (see fitText for the one class of thing that DOES still need its
// own portrait-awareness: text sized as a fraction of card height renders
// at the same on-screen px size regardless of aspect ratio, but a portrait
// card gives it less on-screen WIDTH to fit that same size into).
const CARD_WIDTH = isTouchDevice ? 2.6 : 3.4;
const BASE_CARD_HEIGHT = isTouchDevice ? 3.4 : 2.14;
// thin, real-cardstock feel — paper texture/detailing gets layered on top
// of this later, so the object itself has to read as thin first.
const CARD_THICKNESS = 0.026;
const CARD_RADIUS = 0.12;
const CARD_PAD_FRACTION = 0.09;
// Canvas fillStyle/strokeStyle calls can't reach CSS custom properties, so
// the card's palette is mirrored here from theme.js and kept live via
// onThemeChange() below (registered once initCard() runs) — everything in
// this file reads these `let` bindings (or the ink()/accent() helpers, for
// the many opacity variants) rather than literal color strings, so a theme
// switch just means reassigning these and redrawing.
let PALETTE = getPalette();
// single source of truth for the stock color — used for the card's own
// front/back faces AND both dropdown tabs, so nothing can drift apart.
let CARD_STOCK_COLOR = PALETTE.cardStock;
let INK_COLOR = PALETTE.ink;
// The card's extruded edge (the thin "paper thickness" strip visible along
// its side at a tilt) — optional per theme; falls back to the original
// fixed warm paper-edge tone so every theme that doesn't set it renders
// exactly as before.
let CARD_EDGE_COLOR = PALETTE.cardEdge || '#e6dcc4';
// Mobile-only accent for the back face's tappable text (the header's
// save-contact arrow, the email line) — the exact color the
// "contact saved" confirmation toast already uses (.card3d-confirm's own
// CSS, below), so the thread from "this is tappable" to "this is what
// just happened" reads as the same color rather than two unrelated ones.
let LINK_COLOR = PALETTE.accent;
// Card canvas text only ever uses the mono (labels) and display (name)
// roles — never serif, that's DOM-only (EB Garamond in the homepage
// row list, case-study body text, etc.), so no FONT_SERIF binding here.
let FONT_MONO = PALETTE.fontMono;
let FONT_DISPLAY = PALETTE.fontDisplay;
// Optional per-theme paper-grain intensity — every theme gets a bit of
// grain regardless (see applyGrain's call sites), this just lets a theme
// that wants to read as visibly textured stock (e.g. "neo-stijl"'s cream
// paper) turn it up beyond the default subtle amount. Lowered from this
// file's original 0.055 default now that a real paper photo (below) also
// contributes fiber detail of its own — unchanged, the two would stack
// into visibly excessive noise rather than reading as one material.
// Themes with their own explicit grainOpacity (neo-stijl's 0.11, tuned
// before the real paper texture existed) aren't touched by this change and
// may be worth revisiting now that they're layered on top of it too.
let GRAIN_ALPHA = PALETTE.grainOpacity || 0.035;

// ---- paper texture + letterpress ----
//
// A real uncoated-paper scan, used two ways: tinted into the stock color at
// low strength (PAPER_VISIBILITY) so the printed faces read as genuine
// fiber rather than a flat color, and — independently — its own fine
// tonal variation feeds a per-pixel height map (PAPER_RELIEF_AMOUNT) so
// that texture becomes actual surface relief under the existing lights as
// the card tilts, not just a static image. Both numbers are deliberately
// small; this is meant to be felt more than seen. LETTERPRESS_DEPTH is the
// separate, more pronounced dip pressed into the surface under Matthew's
// printed name specifically (see buildFrontBumpMap) — noticeably deeper
// than the ambient paper relief on purpose, so it still reads as a
// deliberate impression rather than more of the same grain.
const PAPER_TEXTURE_PATH = 'assets/card-paper-texture.jpg';
const PAPER_VISIBILITY = 0.5; // 0..1 — diffuse-layer strength of the paper fiber tint
const PAPER_RELIEF_AMOUNT = 16; // 0..255 gray-units of height-map variation from the paper's own fibers
const LETTERPRESS_DEPTH = 90; // 0..255 gray-units the name's impression subtracts from the height map
const LETTERPRESS_BLUR_PX = 3; // softens the letterpress mask's edges only — the printed ink stays sharp
const PAPER_TILE_PX = 460; // texture-space px per repeat of the paper detail tile
// heightToNormalMap()'s per-pixel slope multiplier — this is what actually
// controls how strongly the relief reads under light, since normalScale
// below is left at a neutral 1. Tuned up from an initial guess after the
// bumpMap approach (see the height-canvas comment further down) turned out
// unable to render this relief at all regardless of scale.
const NORMAL_STRENGTH = 10;
const NORMAL_MAP_SCALE = 1; // material.normalScale — secondary control, keep at 1 and tune NORMAL_STRENGTH instead

function ink(alpha) {
  return `rgba(${PALETTE.inkRgb},${alpha})`;
}
function accent(alpha) {
  return `rgba(${PALETTE.accentRgb},${alpha})`;
}

function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// A tab shape whose top-left/top-right corners are not independently
// rounded, but are the *exact same* quadratic curve the card's own
// bottom-left/bottom-right corners use (same three control points — see
// roundedRectShape's bottom corners above). Two independently-rounded
// corners meeting at the seam are only tangent at a single point and then
// curve away from each other on both sides of it, leaving a lens-shaped
// gap — same radius or not, that gap is unavoidable between two separate
// curves. Reusing the identical curve isn't "close enough to match", it's
// the same curve, so there's nothing between them to gap.
function tabRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  const top = y + h;
  shape.moveTo(x + r, top);
  shape.quadraticCurveTo(x, top, x, top + r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, top + r);
  shape.quadraticCurveTo(x + w, top, x + w - r, top);
  shape.lineTo(x + r, top);
  return shape;
}

// The tab's matching half: everything except its own TOP edge and both
// top corners (the side that meets the card's bottom — see
// tabRoundedRectShape's own comment for why those corners are already the
// exact same curve as the card's bottom corners).
function tabRoundedRectPathOpenTop(w, h, r) {
  const path = new THREE.Path();
  const x = -w / 2, y = -h / 2;
  const top = y + h;
  path.moveTo(x, top + r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, top + r);
  return path;
}

// Just the side-wall — no caps, since the front/back faces are already
// covered by frontCap/backCap (or the tab's own cap) — as a ribbon of
// quads between zTop and zBottom following an open (non-closed) boundary
// path.
function buildEdgeStrip(path, zTop, zBottom, segments) {
  const pts = path.getPoints(segments);
  const positions = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    positions.push(
      a.x, a.y, zTop, b.x, b.y, zTop, b.x, b.y, zBottom,
      a.x, a.y, zTop, b.x, b.y, zBottom, a.x, a.y, zBottom
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

const CONTACT = {
  name: 'Matthew Scheffler',
  first: 'Matthew',
  last: 'Scheffler',
  title: 'Digital Strategy · E-Commerce · Content & Visual Direction',
  email: 'hello@mattscheff.com',
  url: 'mattscheff.com'
};

// icon + handle, not a labeled link — email isn't repeated here since the
// address is already shown above and the edge-drag swipe already sends one
const SOCIAL_LINKS = [
  { icon: 'instagram', handle: '@matt_scheff', href: 'https://instagram.com/matt_scheff' },
  { icon: 'linkedin', handle: 'mattscheffler', href: 'https://linkedin.com/mattscheffler' }
];

const RESUME_PDF_PATH = 'assets/matthew-scheffler-resume.pdf';

// Front face's own name/title/year rhythm — independent of the résumé/tab
// block below (nothing here cascades into TOGGLE_BAND_TOP_F or anything
// downstream of it, unlike that block's own landmarks, so these are safe
// to branch per orientation on their own). On-screen card HEIGHT is fixed
// regardless of orientation (BASE_CARD_HEIGHT always maps to
// REFERENCE_CARD_PX_HEIGHT — see its own comment), so these fractions
// land at the same on-screen Y either way; what changes is that a
// landscape business card reads fine dense, but the same spacing on a
// narrower portrait one reads as leftover landscape rhythm rather than
// something composed for it — YEAR_Y_F stays put either way since it's
// pinned close to TOGGLE_BAND_TOP_F, but the block above it gets more
// deliberate breathing room on portrait instead.
const NAME_FIRST_Y_F = isTouchDevice ? 0.40 : 0.42;
const NAME_LAST_Y_F = isTouchDevice ? 0.57 : 0.6;
const TITLE_LINE1_Y_F = isTouchDevice ? 0.74 : 0.75;
const TITLE_LINE2_Y_F = isTouchDevice ? 0.81 : 0.82;
const YEAR_Y_F = 0.93;

// Résumé/tab layout, expressed as fractions of BASE_CARD_HEIGHT measured
// down from the card's TOP edge. Landmarks derive from each other so
// there's one place to retune spacing. Everything through
// TOGGLE_BAND_BOTTOM_F draws in the card's own region of the unified cap
// (see buildUnifiedCap); everything from ROWS_TOP_F on draws in the tab's
// region — both on the same canvas now, so these fractions are used
// directly with no rebasing between the two.
const TOGGLE_BAND_TOP_F = 0.99;
const TOGGLE_LABEL_F = 1.075;
const TOGGLE_BAND_BOTTOM_F = 1.16;
const CARD_HEIGHT = BASE_CARD_HEIGHT * TOGGLE_BAND_BOTTOM_F;

// Back-face layout, same fraction-of-BASE_CARD_HEIGHT-from-top convention
// as the front's own *_F constants above, but capped at
// TOGGLE_BAND_BOTTOM_F (the card's own physical bottom edge) instead of
// running on into a tab — the back never extends, so everything it needs
// (contact lines, social row, the note form) has to fit inside the same
// single CARD_HEIGHT the front's closed face uses.
const BACK_HEADER_F = 0.075;
// Mobile-only: the plain text header doubles as a tap target there, but a
// few tracked characters' worth of hit region turned out too small and
// too easy to miss (see drawBack's own comment on the filled bar this
// drives) — this is that bar's own top/bottom instead, sized as a real
// button rather than wrapped tight around the label.
const BACK_HEADER_BAR_TOP_F = 0.035;
const BACK_HEADER_BAR_BOTTOM_F = 0.135;
// Four stacked rows now: email, url, then the Instagram and LinkedIn
// icon+handle rows (folded into this same list instead of a separate
// "social row" below it — see the SOCIAL_LINKS loop in drawBack). Same
// top/gap this back face has used for a 4-row stack before.
const BACK_LINES_TOP_F = 0.245;
const BACK_LINE_GAP_F = 0.095;
// The divider/form's own anchor — pinned to a fixed absolute position
// rather than expressed as an offset from where the info rows end, so
// they stay exactly where they are regardless of how many rows the list
// above ends up with. That coupling (divider drifting whenever the row
// count/spacing above it changed) is what caused problems before.
const BACK_DIVIDER_ANCHOR_F = 0.555;
const BACK_DIVIDER_F = BACK_DIVIDER_ANCHOR_F + 0.04;
const BACK_FORM_TOP_F = BACK_DIVIDER_F + 0.025;
const BACK_CONTENT_BOTTOM_F = TOGGLE_BAND_BOTTOM_F;
const BACK_FORM_CENTER_F = (BACK_FORM_TOP_F + BACK_CONTENT_BOTTOM_F) / 2;
const BACK_FORM_HEIGHT = (BACK_CONTENT_BOTTOM_F - BACK_FORM_TOP_F) * BASE_CARD_HEIGHT;
// local Y (card-space) of the form region's own center — CARD_HEIGHT/2 is
// the card's native top edge, same reference the *_F fractions measure
// down from everywhere else in this file.
const BACK_FORM_LOCAL_Y = CARD_HEIGHT / 2 - BACK_FORM_CENTER_F * BASE_CARD_HEIGHT;

const ROWS_TOP_F = TOGGLE_BAND_BOTTOM_F;
const ROW_HEIGHT_F = 0.155;
const ROWS_BOTTOM_F = ROWS_TOP_F + JOBS.length * ROW_HEIGHT_F;
const TAGCLOUD_TOP_F = ROWS_BOTTOM_F + 0.05;
const TAGCLOUD_LINE_GAP_F = 0.034;
const TAGCLOUD_BOTTOM_F = TAGCLOUD_TOP_F + TAGCLOUD_LINE_GAP_F;
const DOWNLOAD_BAND_TOP_F = TAGCLOUD_BOTTOM_F + 0.05;
const DOWNLOAD_LABEL_F = DOWNLOAD_BAND_TOP_F + 0.055;
const DOWNLOAD_BAND_BOTTOM_F = DOWNLOAD_BAND_TOP_F + 0.11;
const TAB_CONTENT_BOTTOM_F = DOWNLOAD_BAND_BOTTOM_F + 0.05;

// TAB_F_OFFSET (= TOGGLE_BAND_BOTTOM_F) converts a card-relative fraction
// into a position on the tab's own separate hitbox (still tab-local, for
// raycasting only — see tabHitFractionFromTop). The tab's *drawn* content
// no longer has a separate coordinate space of its own (see
// UNIFIED_TEX_H below) — only the hit-testing geometry still does.
const TAB_F_OFFSET = TOGGLE_BAND_BOTTOM_F;
const TAB_HEIGHT = BASE_CARD_HEIGHT * (TAB_CONTENT_BOTTOM_F - TAB_F_OFFSET);
// The full open silhouette's height (card + tab). The card's own front/
// back cap and the tab's own cap are one continuous mesh baked at this
// combined size — see buildUnifiedCap() — so this is also the one texture
// canvas both regions share.
const TOTAL_HEIGHT = BASE_CARD_HEIGHT * TAB_CONTENT_BOTTOM_F;

// How far the card itself rises toward the top of the page when the
// dropdown opens (world units) — the rest of the tab's height is made up
// by the page growing (see PAGE_GROWTH_WORLD / updateHeroPadding).
const PARKED_LIFT = TAB_HEIGHT * 0.6;
const PAGE_GROWTH_WORLD = TAB_HEIGHT - PARKED_LIFT;

// Where things rest, in local Y (card-space) — all fixed constants, none
// of them ever recomputed from a "current" size.
const CARD_BOTTOM_LOCAL_Y = -CARD_HEIGHT / 2;
const TAB_CLOSED_LOCAL_Y = CARD_BOTTOM_LOCAL_Y + TAB_HEIGHT / 2;
const TAB_OPEN_LOCAL_Y = CARD_BOTTOM_LOCAL_Y - TAB_HEIGHT / 2;

// Fixed texture resolution. TEX_BASE_PX is the pixel height of one
// BASE_CARD_HEIGHT — the unit both the front's and back's own *_F layout
// fractions are multiplied by when drawing. UNIFIED_TEX_H is the front
// canvas's height (card + résumé tab, drawn together — see drawFront).
// BACK_TEX_H is the back canvas's own, much shorter height, since the
// back never extends past CARD_HEIGHT.
const TEX_W = 1024;
const TEX_BASE_PX = TEX_W * (BASE_CARD_HEIGHT / CARD_WIDTH);
const UNIFIED_TEX_H = Math.round(TEX_W * (TOTAL_HEIGHT / CARD_WIDTH));
const BACK_TEX_H = Math.round(TEX_W * (CARD_HEIGHT / CARD_WIDTH));

const FOV_DEG = 32;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(FOV_DEG) / 2);
// The card's on-screen size is held fixed at this height regardless of
// viewport — so the page growing to reveal the résumé dropdown never
// itself changes how big anything already on screen appears — with one
// exception: a viewport narrower than the card's own natural width at
// this height would just overflow it off both edges rather than "not
// resizing" (see handleResize(), which is the only place PIXELS_PER_WORLD_UNIT
// ever gets a smaller value than this implies). Every viewport wide enough
// to fit the card at this size renders identically to before.
const REFERENCE_CARD_PX_HEIGHT = 366;
const NATURAL_CARD_WIDTH_PX = CARD_WIDTH * (REFERENCE_CARD_PX_HEIGHT / BASE_CARD_HEIGHT);
// Minimum breathing room left on each side when the width cap above
// kicks in, so a narrow phone screen doesn't run the card edge-to-edge —
// the canvas itself ignores the hero section's own CSS padding (it's
// inset:0 on the hero, which the hero's padding doesn't constrain), so
// nothing else already provides this margin.
const CARD_VIEWPORT_MARGIN_PX = 24;
let PIXELS_PER_WORLD_UNIT = REFERENCE_CARD_PX_HEIGHT / BASE_CARD_HEIGHT;

// Card half-extents in screen px, used only to place/fade the hover
// guides (see the "DOM overlays" section's guide block) — derived from
// the same on-screen scale as everything else above, so they track the
// card's real edges at any viewport size with no separate tuning of
// their own. Recomputed by handleResize() alongside
// PIXELS_PER_WORLD_UNIT itself whenever that changes — see
// updateGuideConstants().
let GUIDE_HALF_W_PX = (CARD_WIDTH / 2) * PIXELS_PER_WORLD_UNIT;
let GUIDE_HALF_H_PX = (CARD_HEIGHT / 2) * PIXELS_PER_WORLD_UNIT;
// Fixed regardless of scale.
const GUIDE_MARGIN_PX = 22;
let GUIDE_TAB_H_PX = TAB_HEIGHT * PIXELS_PER_WORLD_UNIT;
function updateGuideConstants() {
  GUIDE_HALF_W_PX = (CARD_WIDTH / 2) * PIXELS_PER_WORLD_UNIT;
  GUIDE_HALF_H_PX = (CARD_HEIGHT / 2) * PIXELS_PER_WORLD_UNIT;
  GUIDE_TAB_H_PX = TAB_HEIGHT * PIXELS_PER_WORLD_UNIT;
}

// how far a drag-release must TRAVEL (relative to where that drag started,
// as a fraction of viewport height) before it opens/closes the dropdown.
const DRAG_UP_THRESHOLD_FRACTION = 0.16;
const DRAG_DOWN_THRESHOLD_FRACTION = 0.12;

// keeps a dropped card reachable — it can be parked anywhere, but never
// entirely off-screen where it couldn't be picked up again.
const MAX_POS_X_FRACTION = 0.45;
const MAX_POS_Y_FRACTION = 0.40;

const EASE = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  // slight slowdown at t=0.5 (the flip's edge-on apex), faster at both ends
  flipApex: t => t + 0.12 * Math.sin(2 * Math.PI * t)
};

function tween(duration, ease, onUpdate, onDone) {
  const start = performance.now();
  let raf;
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    onUpdate(ease(t), t);
    if (t < 1) raf = requestAnimationFrame(step);
    else if (onDone) onDone();
  }
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// Grain is a small tiled noise pattern composited at low alpha, rather
// than a per-pixel pass over the full texture.
let grainPatternCanvas = null;
function getGrainCanvas() {
  if (grainPatternCanvas) return grainPatternCanvas;
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 190;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainPatternCanvas = c;
  return c;
}

function applyGrain(ctx, w, h, alpha) {
  const pattern = ctx.createPattern(getGrainCanvas(), 'repeat');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Loaded once, at module scope, independent of any given card instance's
// theme/font state — a flattened, tileable slice of PAPER_TEXTURE_PATH,
// built the first time it's actually needed. paperDetailTile stays null
// until then (and forever, if the image fails to load or this browser
// lacks canvas filter support) — every call site below already treats a
// null tile as "no paper contribution yet", so nothing downstream needs
// its own separate fallback branch: a card drawn before the image loads,
// or one where it never does, just renders exactly as this file did
// before paper texture existed.
let paperDetailTile = null;
let paperLoadStarted = false;

// Turns the raw scan into something safe to tile: a small square crop
// (its center, away from the corners a scan is most likely to vignette),
// converted to grayscale, then flattened by subtracting a heavily-blurred
// copy of itself. That last step is the important one — the supplied
// photo visibly darkens toward its edges (real bounce-light falloff from
// how it was shot), and tiling that gradient as-is would print a faint
// fake shadow onto every repeat across the card. Subtracting the blurred
// version cancels any such low-frequency shading and keeps only the fine
// fiber detail, which is the part that's actually supposed to repeat.
function buildPaperDetailTile(img) {
  const s = PAPER_TILE_PX;
  const cropSize = Math.min(img.naturalWidth, img.naturalHeight) * 0.55;
  const cropX = (img.naturalWidth - cropSize) / 2;
  const cropY = (img.naturalHeight - cropSize) / 2;

  const tile = document.createElement('canvas');
  tile.width = tile.height = s;
  const tileCtx = tile.getContext('2d');
  tileCtx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, s, s);

  const blurred = document.createElement('canvas');
  blurred.width = blurred.height = s;
  const blurredCtx = blurred.getContext('2d');
  blurredCtx.filter = `blur(${Math.round(s * 0.12)}px)`;
  blurredCtx.drawImage(tile, 0, 0);

  const sharpData = tileCtx.getImageData(0, 0, s, s);
  const blurData = blurredCtx.getImageData(0, 0, s, s);
  const out = tileCtx.createImageData(s, s);
  for (let i = 0; i < sharpData.data.length; i += 4) {
    const sharpLum = sharpData.data[i] * 0.299 + sharpData.data[i + 1] * 0.587 + sharpData.data[i + 2] * 0.114;
    const blurLum = blurData.data[i] * 0.299 + blurData.data[i + 1] * 0.587 + blurData.data[i + 2] * 0.114;
    // Recentered at neutral gray with a mild contrast lift — the raw
    // difference is naturally very low-contrast (it's just fiber noise),
    // and boosting it here means PAPER_VISIBILITY/PAPER_RELIEF_AMOUNT can
    // stay small, restrained numbers instead of having to compensate.
    const v = Math.max(0, Math.min(255, 128 + (sharpLum - blurLum) * 1.6));
    out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  tileCtx.putImageData(out, 0, 0);
  return tile;
}

// Blends the tiled paper detail into whatever's already on ctx at low
// strength — same shape as applyGrain just above (globalAlpha + 'overlay'
// + a repeating pattern), deliberately, since it's doing the same kind of
// job: modulating an existing color with fine texture without shifting
// its actual hue/lightness. A no-op until paperDetailTile exists.
function applyPaperTexture(ctx, w, h, alpha) {
  if (!paperDetailTile) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(paperDetailTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawTracked(ctx, text, x, y, size, color, spacing, font) {
  ctx.font = `${font || '400'} ${size}px ${FONT_MONO}`;
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx;
}

// Same layout math as drawTracked, minus the actual fillText calls — for
// centering a tracked string (e.g. inside a filled button bar) where the
// draw position depends on knowing the total width *before* drawing.
function trackedTextWidth(ctx, text, size, spacing, font) {
  ctx.font = `${font || '400'} ${size}px ${FONT_MONO}`;
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width + spacing;
  return width - spacing;
}

// fitTextSize's own logic (see its comment below), but for drawTracked's
// per-character-plus-spacing layout instead of a single ctx.measureText()
// call — tracking (spacing) itself stays fixed rather than shrinking too,
// same as line-height on the regular fitTextSize text: a little tighter
// tracking at a smaller size reads as normal, not as a second, independent
// shrink stacking on top of the font-size one.
function fitTrackedSize(ctx, texts, maxWidthPx, basePx, spacing, font) {
  let px = basePx;
  for (const t of texts) {
    ctx.font = `${font || '400'} ${px}px ${FONT_MONO}`;
    let width = -spacing;
    for (const ch of t) width += ctx.measureText(ch).width + spacing;
    if (width > maxWidthPx) px = Math.min(px, Math.floor(px * (maxWidthPx / width)));
  }
  return px;
}

// Font sizes throughout drawFront/drawBack are fractions of card HEIGHT in
// texture-pixel space — which, because the texture's own width is fixed
// (TEX_W) regardless of aspect ratio, happens to render at the same
// on-screen pixel size no matter what CARD_WIDTH/BASE_CARD_HEIGHT are (the
// aspect-ratio term cancels out between the texture math and the fixed
// on-screen card height — see REFERENCE_CARD_PX_HEIGHT). That's fine on
// the landscape card, wide enough that text sized this way was never at
// risk of not fitting, but the portrait card gives the same-size text much
// less on-screen WIDTH to fit into. fontBuilder(px) => a full ctx.font
// string for that size (so callers can bake in weight/style/family);
// shrinks (never grows) basePx just enough that every string in `texts`
// fits within maxWidthPx, all at the SAME final size — a name's two lines,
// for instance, shrinking independently would read as an accidental
// mismatch rather than one design choice.
function fitTextSize(ctx, texts, maxWidthPx, basePx, fontBuilder) {
  let px = basePx;
  for (const t of texts) {
    ctx.font = fontBuilder(px);
    const textWidth = ctx.measureText(t).width;
    if (textWidth > maxWidthPx) px = Math.min(px, Math.floor(px * (maxWidthPx / textWidth)));
  }
  ctx.font = fontBuilder(px);
  return px;
}

// Minimal line-icon glyphs for the back face's social row (see SOCIAL_LINKS).
// `y` is the text baseline the icon sits beside — sized/positioned off it
// rather than an independent box so it lines up with the handle next to it
// regardless of what socialSize the caller is using.
function drawInstagramGlyph(ctx, x, y, size, color) {
  const top = y - size * 0.82;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.09);
  ctx.beginPath();
  ctx.roundRect(x, top, size, size, size * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size / 2, top + size / 2, size * 0.26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.78, top + size * 0.22, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  return x + size;
}

function drawLinkedinGlyph(ctx, x, y, size, color) {
  const top = y - size * 0.82;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.09);
  ctx.beginPath();
  ctx.roundRect(x, top, size, size, size * 0.18);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(size * 0.6)}px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('in', x + size / 2, top + size / 2 + size * 0.03);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  return x + size;
}

const SOCIAL_GLYPHS = { instagram: drawInstagramGlyph, linkedin: drawLinkedinGlyph };

export function initCard(container) {
  injectStyles();

  const interactionRoot = container.closest('section') || container;
  for (let el = container; el; el = el.parentElement) {
    el.style.overflow = 'visible';
  }

  /* ---------- renderer / scene / camera ---------- */

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'card3d-canvas';
  interactionRoot.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x2e2213, 1.15));
  const key = new THREE.DirectionalLight(0xfff2df, 1.7);
  key.position.set(2.6, 3.2, 4.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-3, -1.2, 2.4);
  scene.add(fill);

  /* ---------- textures: fixed resolution, drawn once, never rebuilt.
     The front canvas spans the card's own content AND the résumé tab's
     together — see buildUnifiedCap() below for why this is what lets the
     two regions be one continuous mesh instead of two independently-
     positioned ones. The back canvas is its own, much shorter size — the
     back never extends, so it only ever needs one CARD_HEIGHT's worth. --- */

  const frontCanvas = document.createElement('canvas');
  const backCanvas = document.createElement('canvas');
  frontCanvas.width = backCanvas.width = TEX_W;
  frontCanvas.height = UNIFIED_TEX_H;
  backCanvas.height = BACK_TEX_H;

  const frontTex = new THREE.CanvasTexture(frontCanvas);
  const backTex = new THREE.CanvasTexture(backCanvas);
  [frontTex, backTex].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  [frontTex, backTex].forEach(t => { t.anisotropy = maxAniso; });

  // Cached, text-free "background" layers (stock color + paper tint +
  // vignette) — filled in by buildFrontBackground()/buildBackBackground()
  // inside drawFront()/drawBack(). redrawToggleChevron() below copies its
  // small patch straight from frontBgCanvas rather than re-deriving the
  // fill/vignette/paper-pattern math by hand, which is what guarantees the
  // paper pattern's tiling phase can never drift between a full redraw and
  // a chevron-only one — it's literally the same pixels, not a second
  // attempt at matching them.
  const frontBgCanvas = document.createElement('canvas');
  const backBgCanvas = document.createElement('canvas');
  frontBgCanvas.width = backBgCanvas.width = TEX_W;
  frontBgCanvas.height = UNIFIED_TEX_H;
  backBgCanvas.height = BACK_TEX_H;

  // Height canvases: one full-face canvas per side, in the SAME coordinate
  // space and 1:1 UV mapping as frontTex/backTex themselves (no repeat/
  // tiling at the texture level — see buildFrontBumpMap's own comment on why
  // that matters for the letterpress specifically). These are CPU-side only
  // — never uploaded to the GPU directly — they're grayscale height data
  // that heightToNormalMap() reads to derive an actual normal map, because
  // THREE's bumpMap (a live screen-space dFdx/dFdy slope estimate) turned
  // out unable to render a visible dip for a large flat-topped feature like
  // the letterpress impression: that technique only picks up local gradients,
  // so a wide plateau with all its actual "depth" in a thin blurred rim
  // produced zero visible shading no matter how extreme bumpScale got — this
  // was confirmed empirically (bumpScale up to 0.05, 10x+ the normal range,
  // still invisible on both faces) before switching to a precomputed normal
  // map, which encodes the same height differences as a real per-pixel
  // surface direction instead of relying on the renderer to notice a slope.
  const frontBumpCanvas = document.createElement('canvas');
  const backBumpCanvas = document.createElement('canvas');
  frontBumpCanvas.width = backBumpCanvas.width = TEX_W;
  frontBumpCanvas.height = UNIFIED_TEX_H;
  backBumpCanvas.height = BACK_TEX_H;

  // The actual GPU-facing normal maps, derived from the height canvases
  // above by heightToNormalMap(). Same dimensions/1:1 UV mapping.
  const frontNormalCanvas = document.createElement('canvas');
  const backNormalCanvas = document.createElement('canvas');
  frontNormalCanvas.width = backNormalCanvas.width = TEX_W;
  frontNormalCanvas.height = UNIFIED_TEX_H;
  backNormalCanvas.height = BACK_TEX_H;
  const frontNormalTex = new THREE.CanvasTexture(frontNormalCanvas);
  const backNormalTex = new THREE.CanvasTexture(backNormalCanvas);
  // Normal maps encode surface direction, not color — sampling them through
  // an sRGB decode would distort every vector. NoColorSpace keeps the raw
  // 0..255 values linear.
  frontNormalTex.colorSpace = THREE.NoColorSpace;
  backNormalTex.colorSpace = THREE.NoColorSpace;

  // Kicked off once, here, independent of theme/font state — paperDetailTile
  // is module-scope (shared across every card instance there'll ever be,
  // though in practice there's only one), so a second initCard() call in
  // the same page load would skip straight to using it.
  if (!paperLoadStarted) {
    paperLoadStarted = true;
    const paperImage = new Image();
    paperImage.onload = () => {
      paperDetailTile = buildPaperDetailTile(paperImage);
      // The asset can finish loading well after the card's first paint —
      // redraw both faces once it's actually usable rather than leaving
      // them on the pre-paper look until some unrelated redraw happens by
      // coincidence (a theme switch, a font finishing its own load).
      drawFront();
      drawBack();
    };
    // No .onerror handling beyond this — paperDetailTile simply never gets
    // set, and every call site above already treats that as "render
    // exactly as before paper texture existed" (see paperDetailTile's own
    // comment). Nothing else needs to know the load failed.
    paperImage.src = PAPER_TEXTURE_PATH;
  }

  // toggle-row drawing for the card's own front face (résumé only — the
  // back has no toggle row any more, since it never extends).
  function drawToggleRow(ctx, w, bh, pad, label) {
    ctx.save();
    ctx.setLineDash([bh * 0.012, bh * 0.012]);
    ctx.strokeStyle = ink(0.25);
    ctx.lineWidth = Math.max(1, bh * 0.003);
    ctx.beginPath();
    ctx.moveTo(pad, bh * TOGGLE_BAND_TOP_F);
    ctx.lineTo(w - pad, bh * TOGGLE_BAND_TOP_F);
    ctx.stroke();
    ctx.restore();

    drawTracked(ctx, label, pad, bh * TOGGLE_LABEL_F, Math.round(bh * 0.034), ink(0.55), 1.3);
    ctx.save();
    ctx.font = `400 ${Math.round(bh * 0.04)}px ${FONT_MONO}`;
    ctx.fillStyle = ink(0.55);
    ctx.textAlign = 'center';
    ctx.translate(w - pad - bh * 0.02, bh * (TOGGLE_LABEL_F - 0.01));
    ctx.rotate(dropdownOpen ? Math.PI : 0);
    ctx.fillText('⌄', 0, 0);
    ctx.restore();
  }

  // Fills frontBgCanvas/backBgCanvas with everything BEHIND the text: stock
  // color, the real paper tint, then the vignette — no grain (grain is
  // cheap and stays per-draw-call, applied after this) and no letters.
  // Both drawFront()/drawBack() and redrawToggleChevron() paint from this
  // instead of re-deriving the same fill/vignette by hand, so the paper
  // pattern's tiling phase is guaranteed identical everywhere on the card:
  // it's the same source pixels, not two independent attempts at the same
  // math landing on the same result.
  function buildFrontBackground() {
    const ctx = frontBgCanvas.getContext('2d');
    const w = TEX_W, h = UNIFIED_TEX_H, bh = TEX_BASE_PX;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CARD_STOCK_COLOR;
    ctx.fillRect(0, 0, w, h);
    applyPaperTexture(ctx, w, h, PAPER_VISIBILITY);
    // filled across the *full* canvas height, not just bh — a gradient's
    // last color stop holds constant beyond its own radius, so painting
    // the whole canvas lets it fade smoothly into that constant tone.
    const vg = ctx.createRadialGradient(w / 2, bh / 2, bh * 0.15, w / 2, bh / 2, w * 0.65);
    vg.addColorStop(0, ink(0));
    vg.addColorStop(1, ink(0.06));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function buildBackBackground() {
    const ctx = backBgCanvas.getContext('2d');
    const w = TEX_W, h = BACK_TEX_H, bh = TEX_BASE_PX;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CARD_STOCK_COLOR;
    ctx.fillRect(0, 0, w, h);
    applyPaperTexture(ctx, w, h, PAPER_VISIBILITY);
    // 0.08, not the front's 0.06 — matches drawBack()'s own original
    // (slightly stronger) vignette, unchanged from before this function existed.
    const vg = ctx.createRadialGradient(w / 2, bh / 2, bh * 0.15, w / 2, bh / 2, w * 0.65);
    vg.addColorStop(0, ink(0));
    vg.addColorStop(1, ink(0.08));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // Height-map source shared by front/back: neutral mid-gray, plus the
  // same fine noise pattern applyGrain uses for the 2D ink overlay, reused
  // here at a low, fixed baseline alpha as an always-present bump — this
  // is what the surface still looks like before the real paper photo has
  // loaded, or if it never does, matching the plain procedural relief this
  // file always had. The real paper's own detail (once available) layers
  // on top, additively, via PAPER_RELIEF_AMOUNT.
  function paintReliefBase(ctx, w, h) {
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = ctx.createPattern(getGrainCanvas(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    if (paperDetailTile) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, PAPER_RELIEF_AMOUNT / 40);
      ctx.fillStyle = ctx.createPattern(paperDetailTile, 'repeat');
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // Mirrors drawFront()'s own name-sizing math exactly (same inputs, same
  // fitTextSize call) — kept as its own function specifically so the
  // letterpress mask below and the actual printed name can never drift out
  // of sync with each other; if the printed name's layout ever changes,
  // this changes with it for free rather than needing a second hand-edit.
  function fitNameSize(ctx, w, bh, pad) {
    const nameMaxWidthPx = w - pad * 2;
    return fitTextSize(
      ctx, [CONTACT.first, CONTACT.last], nameMaxWidthPx, Math.round(bh * 0.155),
      (px) => `700 ${px}px ${FONT_DISPLAY}`
    );
  }

  // Converts a grayscale height canvas (0..255 luminance = surface height)
  // into a tangent-space normal map on dstCanvas, via a simple central-
  // difference (Sobel-lite) slope estimate at every pixel. This replaced a
  // live bumpMap (see the height-canvas comment above for why): computing
  // the normal once, per-pixel, up front is more work here but is what
  // actually lets THREE's lighting see the paper relief and letterpress dip
  // as real surface direction instead of a slope the shader has to notice
  // fragment-by-fragment. strength controls how many degrees of tilt one
  // step of height difference produces — independent of, and multiplied
  // together with, the material's own normalScale.
  function heightToNormalMap(srcCanvas, dstCanvas, strength) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const src = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    const dstCtx = dstCanvas.getContext('2d');
    const dst = dstCtx.createImageData(w, h);
    const heightAt = (x, y) => {
      if (x < 0) x = 0; else if (x >= w) x = w - 1;
      if (y < 0) y = 0; else if (y >= h) y = h - 1;
      return src[(y * w + x) * 4] / 255;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * strength;
        const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * strength;
        let nx = -dx, ny = -dy, nz = 1;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx *= inv; ny *= inv; nz *= inv;
        const i = (y * w + x) * 4;
        dst.data[i] = (nx * 0.5 + 0.5) * 255;
        dst.data[i + 1] = (ny * 0.5 + 0.5) * 255;
        dst.data[i + 2] = (nz * 0.5 + 0.5) * 255;
        dst.data[i + 3] = 255;
      }
    }
    dstCtx.putImageData(dst, 0, 0);
  }

  // The front's bump map: paper relief (see paintReliefBase) plus a
  // separate, deliberately deeper impression under the printed name. The
  // dip is built as its own throwaway canvas — filled with a mid-gray
  // (not black/white) so a plain 'multiply' blend darkens the relief by a
  // controlled amount rather than an all-or-nothing cutout, then blurred
  // (LETTERPRESS_BLUR_PX) so the *height transition* at each letter's edge
  // reads as compressed paper instead of a hard-edged stamp. The printed
  // ink itself is a completely separate layer, drawn later in drawFront()
  // with the real INK_COLOR at full sharpness — nothing here ever touches
  // that, only the bump map. This canvas is built at frontCanvas's own
  // full size with no repeat/tiling (see its creation, above) specifically
  // so this dip can be positioned once, in the same coordinate space as
  // the printed name, and never accidentally repeat elsewhere on the card.
  function buildFrontBumpMap() {
    const w = TEX_W, h = UNIFIED_TEX_H, bh = TEX_BASE_PX;
    const pad = w * CARD_PAD_FRACTION;
    const ctx = frontBumpCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    paintReliefBase(ctx, w, h);

    const mask = document.createElement('canvas');
    mask.width = w; mask.height = h;
    const maskCtx = mask.getContext('2d');
    maskCtx.fillStyle = '#fff';
    maskCtx.fillRect(0, 0, w, h);
    const darken = Math.max(0, 255 - LETTERPRESS_DEPTH);
    maskCtx.fillStyle = `rgb(${darken},${darken},${darken})`;
    maskCtx.textBaseline = 'alphabetic';
    maskCtx.textAlign = 'left';
    const namePx = fitNameSize(maskCtx, w, bh, pad);
    maskCtx.font = `700 ${namePx}px ${FONT_DISPLAY}`;
    maskCtx.fillText(CONTACT.first, pad, bh * NAME_FIRST_Y_F);
    maskCtx.font = `italic 700 ${namePx}px ${FONT_DISPLAY}`;
    maskCtx.fillText(CONTACT.last, pad, bh * NAME_LAST_Y_F);

    ctx.save();
    ctx.filter = `blur(${LETTERPRESS_BLUR_PX}px)`;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(mask, 0, 0);
    ctx.restore();

    heightToNormalMap(frontBumpCanvas, frontNormalCanvas, NORMAL_STRENGTH);
    frontNormalTex.needsUpdate = true;
  }

  // Back's bump map: paper relief only — no letterpress, the name is never
  // printed on the back — kept as a fully separate canvas/texture from the
  // front's for exactly that reason (see this function's own creation,
  // above, and the front's docblock above for why the two can't share one).
  function buildBackBumpMap() {
    const w = TEX_W, h = BACK_TEX_H;
    const ctx = backBumpCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    paintReliefBase(ctx, w, h);
    heightToNormalMap(backBumpCanvas, backNormalCanvas, NORMAL_STRENGTH);
    backNormalTex.needsUpdate = true;
  }

  // Redraws ONLY the toggle chevron, not the whole front canvas — dropdownOpen
  // (which flips its rotation) is the ONLY thing about drawFront()'s output
  // that ever changes after the initial draw, so openDropdown()/closeDropdown()
  // used to call the full drawFront() just to flip one glyph: a complete
  // redraw of every job row, the tag cloud, the download link, the vignette,
  // and the grain composite, for a change that only ever touches a few dozen
  // px around one character. drawFront() alone runs dozens of fillText/
  // measureText calls (drawTracked draws letter-spaced text one character at
  // a time — see its own comment) plus gradient/grain compositing, easily
  // several ms of synchronous main-thread work landing at the exact instant
  // a drag-release opens or closes the résumé — a very plausible source of
  // the flicker reported on exactly that gesture and no other (nothing else
  // in this file calls drawFront() after initial load). This clips to a
  // small fixed box around the chevron's own known position, repaints just
  // that box's stock color + the (cheap, since it's clip-bounded regardless
  // of the gradient's own extent) vignette and grain, then redraws the
  // glyph — everything else on the canvas is left untouched. The GPU-side
  // texture reupload (frontTex.needsUpdate) still re-sends the whole canvas
  // either way — CanvasTexture has no partial-update path — but that upload
  // is comparatively cheap; the CPU-side drawing work is what dominated.
  function redrawToggleChevron() {
    const ctx = frontCanvas.getContext('2d');
    const w = TEX_W, h = UNIFIED_TEX_H, bh = TEX_BASE_PX;
    const pad = w * CARD_PAD_FRACTION;
    const cx = w - pad - bh * 0.02;
    const cy = bh * (TOGGLE_LABEL_F - 0.01);
    const half = bh * 0.045; // comfortably covers the glyph's ink at either rotation

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - half, cy - half, half * 2, half * 2);
    ctx.clip();

    ctx.clearRect(cx - half, cy - half, half * 2, half * 2);
    // Copied straight from the cached background (stock + paper tint +
    // vignette, no text) rather than re-derived by hand — see
    // buildFrontBackground's own comment for why that's what guarantees
    // the paper pattern lines up with the rest of the canvas exactly.
    ctx.drawImage(
      frontBgCanvas, cx - half, cy - half, half * 2, half * 2,
      cx - half, cy - half, half * 2, half * 2
    );

    applyGrain(ctx, w, h, GRAIN_ALPHA); // also clip-bounded to the small box

    ctx.font = `400 ${Math.round(bh * 0.04)}px ${FONT_MONO}`;
    ctx.fillStyle = ink(0.55);
    ctx.textAlign = 'center';
    ctx.translate(cx, cy);
    ctx.rotate(dropdownOpen ? Math.PI : 0);
    ctx.fillText('⌄', 0, 0);
    ctx.restore();

    frontTex.needsUpdate = true;
  }

  // Card content (name/title/toggle row) AND the résumé tab's content
  // (job rows, tag cloud, download link) are drawn into ONE canvas, in
  // one pass — one fill, one vignette, one grain application — so nothing
  // about the fine grain pattern's tiling phase, the vignette's falloff,
  // or the base color can ever drift between the two regions: they're
  // literally the same pixels, not two canvases kept visually matched by
  // hand. The *_F constants are already authored as fractions of the
  // FULL open-silhouette height (see their own comment above), so both
  // regions draw straight from them with no rebasing.
  function drawFront() {
    const ctx = frontCanvas.getContext('2d');
    const w = TEX_W, h = UNIFIED_TEX_H, bh = TEX_BASE_PX;
    const pad = w * CARD_PAD_FRACTION;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // Stock color + real paper tint + vignette — see buildFrontBackground's
    // own comment; drawn there (not here) specifically so
    // redrawToggleChevron() can copy the identical pixels for its own small
    // patch instead of a second, potentially-drifting attempt at this fill.
    buildFrontBackground();
    ctx.drawImage(frontBgCanvas, 0, 0);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // Shrunk together (see fitTextSize's own comment) to fit the card's
    // actual on-screen width — a no-op on the landscape card, which
    // always had room to spare, but load-bearing on the narrower portrait
    // one, where "Scheffler" at the un-fit size would run past the edge.
    // Routed through the shared fitNameSize() helper (not this math
    // inline) so the letterpress mask in buildFrontBumpMap() is
    // structurally unable to drift from whatever's actually printed here,
    // even if this layout changes later.
    const namePx = fitNameSize(ctx, w, bh, pad);
    ctx.fillStyle = INK_COLOR;
    ctx.font = `700 ${namePx}px ${FONT_DISPLAY}`;
    ctx.fillText(CONTACT.first, pad, bh * NAME_FIRST_Y_F);
    ctx.fillStyle = ink(0.55);
    ctx.font = `italic 700 ${namePx}px ${FONT_DISPLAY}`;
    ctx.fillText(CONTACT.last, pad, bh * NAME_LAST_Y_F);

    const titleMaxWidthPx = w - pad * 2;
    const titlePx = fitTrackedSize(
      ctx, ['DIGITAL STRATEGY · E-COMMERCE', 'CONTENT & VISUAL DIRECTION'],
      titleMaxWidthPx, Math.round(bh * 0.04), 1.4
    );
    drawTracked(ctx, 'DIGITAL STRATEGY · E-COMMERCE', pad, bh * TITLE_LINE1_Y_F, titlePx, ink(0.5), 1.4);
    drawTracked(ctx, 'CONTENT & VISUAL DIRECTION', pad, bh * TITLE_LINE2_Y_F, titlePx, ink(0.5), 1.4);
    drawTracked(ctx, '2026', pad, bh * YEAR_Y_F, Math.round(bh * 0.036), ink(0.32), 1.4);

    drawToggleRow(ctx, w, bh, pad, 'RÉSUMÉ');

    JOBS.forEach((job, i) => {
      const rowTopF = ROWS_TOP_F + i * ROW_HEIGHT_F;

      // Dates measured first (fixed size, right-aligned) so the name's own
      // fit below reserves the actual room they take instead of the two
      // just overlapping on a narrow portrait row.
      ctx.font = `400 ${Math.round(bh * 0.027)}px ${FONT_MONO}`;
      const datesWidthPx = ctx.measureText(job.dates).width;
      const nameMaxWidthPx = w - pad * 2 - datesWidthPx - bh * 0.02;
      const namePx = fitTextSize(
        ctx, [job.name], nameMaxWidthPx, Math.round(bh * 0.052),
        (px) => `500 ${px}px ${FONT_DISPLAY}`
      );
      ctx.fillStyle = ink(0.88);
      ctx.textAlign = 'left';
      ctx.fillText(job.name, pad, bh * (rowTopF + 0.075));

      ctx.save();
      ctx.font = `400 ${Math.round(bh * 0.027)}px ${FONT_MONO}`;
      ctx.fillStyle = ink(0.35);
      ctx.textAlign = 'right';
      ctx.fillText(job.dates, w - pad, bh * (rowTopF + 0.07));
      ctx.restore();

      const tagsText = job.tags.join(' · ');
      const tagsPx = fitTrackedSize(ctx, [tagsText], w - pad * 2, Math.round(bh * 0.023), 1.1);
      drawTracked(ctx, tagsText, pad, bh * (rowTopF + 0.11), tagsPx, ink(0.35), 1.1);

      ctx.save();
      ctx.strokeStyle = ink(0.1);
      ctx.lineWidth = Math.max(1, bh * 0.0015);
      ctx.beginPath();
      ctx.moveTo(pad, bh * (rowTopF + ROW_HEIGHT_F - 0.02));
      ctx.lineTo(w - pad, bh * (rowTopF + ROW_HEIGHT_F - 0.02));
      ctx.stroke();
      ctx.restore();
    });

    const allTags = Array.from(new Set(JOBS.flatMap(j => j.tags)));
    const half = Math.ceil(allTags.length / 2);
    const line1 = allTags.slice(0, half).join(' · ');
    const line2 = allTags.slice(half).join(' · ');
    // Still 2 lines on portrait, same as landscape — reflowing into more,
    // shorter lines would read better there, but that shifts
    // TAGCLOUD_BOTTOM_F and cascades into every fraction below it
    // (DOWNLOAD_BAND_TOP_F, TAB_CONTENT_BOTTOM_F, TAB_HEIGHT itself) for
    // this pass, fitting the existing 2 lines to width is the safer,
    // lower-risk fix; a real reflow is exactly the kind of thing worth
    // doing once this is visible and can be tuned by eye.
    const tagCloudPx = fitTrackedSize(ctx, [line1, line2], w - pad * 2, Math.round(bh * 0.021), 1);
    drawTracked(ctx, line1, pad, bh * TAGCLOUD_TOP_F, tagCloudPx, ink(0.3), 1);
    drawTracked(ctx, line2, pad, bh * TAGCLOUD_BOTTOM_F, tagCloudPx, ink(0.3), 1);

    const downloadText = 'DOWNLOAD RÉSUMÉ (PDF) →';
    const downloadSize = fitTextSize(
      ctx, [downloadText], w - pad * 2, Math.round(bh * 0.027),
      (px) => `400 ${px}px ${FONT_MONO}`
    );
    ctx.font = `400 ${downloadSize}px ${FONT_MONO}`;
    ctx.fillStyle = INK_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(downloadText, pad, bh * DOWNLOAD_LABEL_F);
    const underlineY = bh * DOWNLOAD_LABEL_F + downloadSize * 0.22;
    ctx.save();
    ctx.strokeStyle = ink(0.3);
    ctx.lineWidth = Math.max(1, bh * 0.0015);
    ctx.beginPath();
    ctx.moveTo(pad, underlineY);
    ctx.lineTo(pad + ctx.measureText(downloadText).width, underlineY);
    ctx.stroke();
    ctx.restore();

    applyGrain(ctx, w, h, GRAIN_ALPHA);
    frontTex.needsUpdate = true;
    // Rebuilds the paper-relief + letterpress bump map alongside the color
    // canvas above — cheap enough at drawFront()'s own call sites (init,
    // theme change, fonts finishing load), which is exactly the "asset,
    // fonts, theme, or text layout changes" list this should react to and
    // nothing more; tilt/drag/résumé-toggle never call drawFront() at all,
    // so this never runs on any of those.
    buildFrontBumpMap();
  }

  // Populated by drawBack() below — each social link's horizontal extent
  // in UV-u terms (0..1 across the canvas width), for hit-testing clicks
  // against hitMesh's own uv.x (see handleCardClick's back-face branch).
  const socialLinkBounds = [];

  // The back face's own fixed content: contact header/lines and a
  // clickable social row live in the TOP portion; a compact note form
  // (a real DOM overlay from contact.js) sits in the bottom portion,
  // below the dashed divider — this canvas only draws the divider itself,
  // the form's own fields are never canvas-drawn (see drawFront's own
  // matching comment on the résumé tab for why: real inputs need to be
  // real DOM nodes).
  function drawBack() {
    const ctx = backCanvas.getContext('2d');
    const w = TEX_W, h = BACK_TEX_H, bh = TEX_BASE_PX;
    const pad = w * CARD_PAD_FRACTION;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    buildBackBackground();
    ctx.drawImage(backBgCanvas, 0, 0);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // Desktop keeps the plain dim label it's always had — this only
    // branches on mobile. On mobile the header doubles as the
    // save-contact tap target, and started out as just that same label
    // plus a colored arrow appended (see git history) — small enough,
    // and with a hit region tight enough around the tracked text, that it
    // was easy to miss and land a plain flip instead. This is that fixed:
    // a real filled bar (LINK_COLOR, the same accent the "contact saved"
    // toast itself uses) spanning the same left/right margin every other
    // row on this face uses, tall enough to be an actual button rather
    // than text with some padding, with the label centered on it in the
    // card stock's own color so it reads on top of the fill. The hit
    // region below (in socialLinkBounds) matches this bar's bounds
    // exactly, not just the label's own tracked width.
    const headerSize = Math.round(bh * 0.038);
    if (isTouchDevice) {
      const barLeft = pad;
      const barTop = bh * BACK_HEADER_BAR_TOP_F;
      const barWidth = w - pad * 2;
      const barHeight = bh * (BACK_HEADER_BAR_BOTTOM_F - BACK_HEADER_BAR_TOP_F);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barLeft, barTop, barWidth, barHeight, barHeight * 0.28);
      ctx.fillStyle = LINK_COLOR;
      ctx.fill();
      ctx.restore();

      const headerLabel = 'SAVE CONTACT →';
      const labelWidth = trackedTextWidth(ctx, headerLabel, headerSize, 3);
      const labelX = barLeft + (barWidth - labelWidth) / 2;
      // Baseline, not top: the bar's own vertical center plus ~0.35× the
      // font size is the usual rough correction for a baseline sitting
      // below a font's true visual middle — good enough for a short,
      // all-caps, no-descender label like this one.
      const labelY = barTop + barHeight / 2 + headerSize * 0.35;
      drawTracked(ctx, headerLabel, labelX, labelY, headerSize, CARD_STOCK_COLOR, 3);
    } else {
      drawTracked(ctx, 'CONTACT', pad, bh * BACK_HEADER_F, headerSize, ink(0.4), 3);
    }

    // Space Grotesk, plain fillText, normal case — matching the front
    // face's own job-title treatment (see JOBS.forEach in drawFront)
    // rather than the tracked-mono-uppercase style every *label* on the
    // card uses. The two social rows share this exact size/weight/color
    // too (icon substituting for nothing, handle set the same as email/
    // url) so the whole thing reads as one stacked contact-info list —
    // icon rows included — rather than a separate link row floating
    // below it.
    // Fit against every row this size is shared with (see fitTextSize's
    // own comment) — email/url plus both handle rows below, even though
    // the handles' own icon+gap prefix isn't accounted for here (using
    // the base, pre-fit size for that allowance rather than solving it
    // circularly) — close enough in practice since the email address is
    // almost always the longest of the four anyway.
    const baseInfoSize = Math.round(bh * 0.052);
    const iconAllowancePx = baseInfoSize * 1.05 + baseInfoSize * 0.35;
    const infoSize = fitTextSize(
      ctx,
      [CONTACT.email, CONTACT.url, ...SOCIAL_LINKS.map((l) => l.handle)],
      w - pad * 2 - iconAllowancePx, baseInfoSize,
      (px) => `400 ${px}px ${FONT_DISPLAY}`
    );
    // Email gets its own fillStyle pass (mobile only) rather than joining
    // the shared one below — it's the only line here backed by a real
    // link-like action of its own (openMailto) rather than just being
    // read, so LINK_COLOR marks it as tappable the same way an underlined
    // blue link would, without needing an icon or an underline that'd
    // fight the card's own typographic style.
    ctx.fillStyle = isTouchDevice ? LINK_COLOR : ink(0.85);
    ctx.fillText(CONTACT.email, pad, bh * BACK_LINES_TOP_F);
    ctx.fillStyle = ink(0.85);
    ctx.fillText(CONTACT.url, pad, bh * (BACK_LINES_TOP_F + BACK_LINE_GAP_F));

    socialLinkBounds.length = 0;
    if (isTouchDevice) {
      socialLinkBounds.push({
        uMin: pad / w, uMax: (w - pad) / w,
        vMin: BACK_HEADER_BAR_TOP_F, vMax: BACK_HEADER_BAR_BOTTOM_F,
        action: () => { downloadVCard(); showConfirmation('contact saved'); }
      });
      const emailWidthPx = ctx.measureText(CONTACT.email).width;
      socialLinkBounds.push({
        uMin: pad / w, uMax: (pad + emailWidthPx) / w,
        vMin: BACK_LINES_TOP_F - 0.05, vMax: BACK_LINES_TOP_F + 0.02,
        action: openMailto
      });
    }
    const iconSize = Math.round(infoSize * 1.05);
    SOCIAL_LINKS.forEach((link, i) => {
      const rowFrac = BACK_LINES_TOP_F + (i + 2) * BACK_LINE_GAP_F;
      const rowY = bh * rowFrac;
      let cx = SOCIAL_GLYPHS[link.icon](ctx, pad, rowY, iconSize, ink(0.55));
      cx += infoSize * 0.35;
      ctx.font = `400 ${infoSize}px ${FONT_DISPLAY}`;
      ctx.fillStyle = ink(0.85);
      ctx.fillText(link.handle, cx, rowY);
      const handleEnd = cx + ctx.measureText(link.handle).width;
      socialLinkBounds.push({
        uMin: pad / w,
        uMax: handleEnd / w,
        vMin: rowFrac - 0.05,
        vMax: rowFrac + 0.02,
        action: () => window.open(link.href, '_blank', 'noopener')
      });
    });

    // no label below the divider — the form's own "Send note" button
    // already carries that context, and the gap to BACK_FORM_TOP_F is too
    // tight to fit one anyway
    ctx.save();
    ctx.setLineDash([bh * 0.012, bh * 0.012]);
    ctx.strokeStyle = ink(0.25);
    ctx.lineWidth = Math.max(1, bh * 0.003);
    ctx.beginPath();
    ctx.moveTo(pad, bh * BACK_DIVIDER_F);
    ctx.lineTo(w - pad, bh * BACK_DIVIDER_F);
    ctx.stroke();
    ctx.restore();

    applyGrain(ctx, w, h, GRAIN_ALPHA);
    backTex.needsUpdate = true;
    buildBackBumpMap();
  }

  function cardStockMaterial(map, normalTexture) {
    return new THREE.MeshPhysicalMaterial({
      map,
      roughness: 0.82,
      metalness: 0,
      clearcoat: 0,
      sheen: 0.08,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(0xfff6e8),
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(NORMAL_MAP_SCALE, NORMAL_MAP_SCALE)
    });
  }

  function edgeMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: CARD_EDGE_COLOR,
      roughness: 0.95,
      metalness: 0,
      clearcoat: 0,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
  }

  /* ---------- card mesh: rounded-rect front/back caps + extruded edge.
     Built exactly once, at its one fixed size — nothing here is ever
     rebuilt or resized again. ---------- */

  const frontMat = cardStockMaterial(frontTex, frontNormalTex);
  const backMat = cardStockMaterial(backTex, backNormalTex);
  const edgeSideMat = edgeMaterial();
  const edgeCapMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  const cardShape = roundedRectShape(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  const tabShape = tabRoundedRectShape(CARD_WIDTH, TAB_HEIGHT, CARD_RADIUS);

  // Recessed just enough behind the card's own front face to avoid
  // z-fighting while tucked closed (where the tab sits directly behind
  // the card, at the same depth, fully hidden by the opaque front face).
  // This recess is only needed there — once the tab has slid out from
  // behind the card, nothing overlaps it any more, so the shader offset
  // below (see addTabOffsetShader) linearly cancels it back out as
  // progress goes 0->1.
  const TAB_RECESS = 0.0015;
  const TAB_CAP_Z = CARD_THICKNESS / 2 - TAB_RECESS;

  // ---- unified FRONT cap geometry: ONE continuous mesh (the card's own
  // front content AND the résumé tab's), instead of two independently-
  // positioned objects that have to be kept in sync by hand. Front-only —
  // the back never extends, so it stays a plain single-shape mesh (see
  // backCapGeo below), which is also exactly why the back is immune to
  // any bug in this shader-offset machinery: it doesn't use it at all.
  // cardShape and tabShape are exactly the same shapes the card's own
  // edge wall already uses (so the two regions' curves are, by
  // construction, identical — nothing to separately match), baked at
  // their OPEN rest position; aTabWeight (0 card / 1 tab) tags which
  // vertices a small vertex-shader patch (addTabOffsetShader) is allowed
  // to move when the dropdown opens/closes. Since it's a pure
  // translation — never a bend — normals need no correction, so lighting
  // stays exactly right at every point in the animation. The card and tab
  // regions are two disjoint vertex sets glued only by sharing one
  // texture/material/draw-call — never welded across the seam — which is
  // what keeps a rigid slide from shearing the mesh in between: the same
  // physical relationship two separate objects would have, just built,
  // matched, and lit as one asset instead of two.
  // v is measured down from the card's own native top edge (CARD_HEIGHT/2
  // — never shifted, since the card region below is never shifted either)
  // so this lines up with the *_F fractions regardless of which piece
  // (card, at yShift 0, or tab, at yShift TAB_OPEN_LOCAL_Y) is calling it.
  function remapUVShifted(geo, totalW, totalH, yShift) {
    const uv = geo.attributes.uv;
    const topY = CARD_HEIGHT / 2;
    for (let i = 0; i < uv.count; i++) {
      const u = (uv.getX(i) + totalW / 2) / totalW;
      const v = (uv.getY(i) + yShift - topY + totalH) / totalH;
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
  }

  function taggedCapPart(shape, yShift, tabWeight) {
    const geo = new THREE.ShapeGeometry(shape, 16);
    remapUVShifted(geo, CARD_WIDTH, TOTAL_HEIGHT, yShift);
    geo.translate(0, yShift, CARD_THICKNESS / 2);
    const count = geo.attributes.position.count;
    geo.setAttribute('aTabWeight', new THREE.Float32BufferAttribute(new Float32Array(count).fill(tabWeight), 1));
    return geo;
  }

  function mergeCapParts(a, b) {
    const geo = new THREE.BufferGeometry();
    const copyAttr = (name, itemSize) => {
      const A = a.attributes[name], B = b.attributes[name];
      const arr = new Float32Array(A.array.length + B.array.length);
      arr.set(A.array, 0);
      arr.set(B.array, A.array.length);
      geo.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
    };
    copyAttr('position', 3);
    copyAttr('normal', 3);
    copyAttr('uv', 2);
    copyAttr('aTabWeight', 1);

    const offset = a.attributes.position.count;
    const total = offset + b.attributes.position.count;
    const IndexArray = total > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(a.index.count + b.index.count);
    for (let i = 0; i < a.index.count; i++) indices[i] = a.index.getX(i);
    for (let i = 0; i < b.index.count; i++) indices[a.index.count + i] = b.index.getX(i) + offset;
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  // cardPart is NOT shifted — its baked position must land exactly where
  // edgeMesh/hitMesh already sit (both built from the same native,
  // unshifted cardShape), since the card region never moves and has no
  // shader offset of its own to correct a mismatch later. tabPart is
  // shifted by TAB_OPEN_LOCAL_Y — the same constant the old two-object
  // design used to park the open tab's group — so its native top edge
  // (TAB_HEIGHT/2) lands exactly on the card's own native bottom edge
  // (-CARD_HEIGHT/2), open, with zero gap and zero overlap.
  function buildUnifiedCap() {
    const cardPart = taggedCapPart(cardShape, 0, 0);
    const tabPart = taggedCapPart(tabShape, TAB_OPEN_LOCAL_Y, 1);
    return mergeCapParts(cardPart, tabPart);
  }

  // Injects a tiny vertex offset: tab-region vertices (aTabWeight=1) move
  // by uTabOffset (local Y, local Z); card-region vertices never move.
  // offsetUniform is a plain {value: THREE.Vector2} kept by the caller —
  // mutating .value in place each frame (see setDropdownVisual) is picked
  // up automatically without recompiling the shader.
  function addTabOffsetShader(material, offsetUniform) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTabOffset = offsetUniform;
      shader.vertexShader =
        'attribute float aTabWeight;\nuniform vec2 uTabOffset;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n\ttransformed.y += aTabWeight * uTabOffset.x;\n\ttransformed.z += aTabWeight * uTabOffset.y;'
      );
    };
    // Per-material, not a shared constant: two materials returning the
    // *same* cache key make Three.js reuse one already-linked WebGLProgram
    // for the second material without re-running its own onBeforeCompile,
    // so its uTabOffset never gets wired to its own offsetUniform (it
    // silently inherits whatever the first material's program last bound,
    // which — since frontMat and backMat drive independent uniforms —
    // is wrong). material.uuid keeps every material's program distinct.
    material.customProgramCacheKey = () => 'unifiedCap-' + material.uuid;
  }

  const capGeometry = buildUnifiedCap();

  const tabOffsetFront = { value: new THREE.Vector2(0, 0) };
  addTabOffsetShader(frontMat, tabOffsetFront);

  const frontCap = new THREE.Mesh(capGeometry, frontMat);

  // The back cap, deliberately built the plain way — one ShapeGeometry,
  // one un-shifted UV remap (yShift 0 reduces remapUVShifted to an
  // ordinary 0..1 mapping), no aTabWeight, no onBeforeCompile. It never
  // needs to move any of its own vertices, so it doesn't carry any of the
  // machinery that would let it.
  const backCapGeo = new THREE.ShapeGeometry(cardShape, 16);
  remapUVShifted(backCapGeo, CARD_WIDTH, CARD_HEIGHT, 0);
  backCapGeo.translate(0, 0, CARD_THICKNESS / 2);
  const backCap = new THREE.Mesh(backCapGeo, backMat);
  backCap.rotation.y = Math.PI;

  // Full perimeter, deliberately NOT open along the bottom — only the
  // résumé tab rig's own top edge is omitted (see makeTabRig below).
  // Omitting the edge wall from *both* pieces at the seam killed the
  // double-wall crease, but it also stripped the corner's own "3D
  // thickness" bevel from exactly that curve, while the straight edges
  // right next to it (still fully walled) kept theirs — the corner read
  // as a visible flat notch/step relative to its neighbors under any
  // raking angle. Keeping the card's wall whole and omitting only the
  // tab's gives exactly one continuous bevel at the boundary instead of
  // zero or two: no doubled crease, and the corner's thickness cue stays
  // consistent all the way around the card's own perimeter — including
  // the back, which has no tab of its own to worry about at all.
  const edgeGeo = new THREE.ExtrudeGeometry(cardShape, { depth: CARD_THICKNESS, bevelEnabled: false, curveSegments: 16 });
  edgeGeo.translate(0, 0, -CARD_THICKNESS / 2);
  const edgeMesh = new THREE.Mesh(edgeGeo, [edgeCapMat, edgeSideMat]);

  const hitGeo = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS * 3);
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);

  /* ---------- résumé tab rig: edge wall + invisible hitbox only — the
     cap itself lives in the unified front mesh above. Front-only, since
     the back never extends and so has no rig of its own any more. Never
     scales or rebuilds; extending/un-extending only ever *moves* it (in
     lockstep with the same progress driving the cap's shader offset). -- */

  function makeTabRig() {
    // open along the top — the side that meets the card's own (also-open)
    // bottom once the tab slides out
    const edgeGeo2 = buildEdgeStrip(
      tabRoundedRectPathOpenTop(CARD_WIDTH, TAB_HEIGHT, CARD_RADIUS),
      TAB_CAP_Z, TAB_CAP_Z - CARD_THICKNESS, 64
    );
    const edge = new THREE.Mesh(edgeGeo2, edgeSideMat);

    const hitGeo2 = new THREE.BoxGeometry(CARD_WIDTH, TAB_HEIGHT, CARD_THICKNESS * 3);
    const hit = new THREE.Mesh(hitGeo2, hitMat);

    const group = new THREE.Group();
    group.add(edge, hit);
    group.position.y = TAB_CLOSED_LOCAL_Y;
    return { group, hit };
  }

  const { group: tabGroup, hit: tabHitMesh } = makeTabRig();

  // anchor for the note form's CSS-3D panel (see contact.js): a plain
  // child of backCap, so it automatically inherits the mirrored (back-
  // facing) orientation and — further up the chain — the card's own
  // drag/tilt/flip/lift transform. Fixed at the form region's own center
  // (BACK_FORM_LOCAL_Y) — unlike the old note-tab anchor, this never
  // moves on its own; the back face doesn't extend, so there's nothing
  // for it to track.
  const backFormAnchor = new THREE.Object3D();
  backFormAnchor.position.set(0, BACK_FORM_LOCAL_Y, CARD_THICKNESS / 2 + 0.001);
  backCap.add(backFormAnchor);

  const cardMesh = new THREE.Group();
  cardMesh.add(edgeMesh, frontCap, backCap, hitMesh, tabGroup);

  const cardGroup = new THREE.Group();
  cardGroup.add(cardMesh);
  scene.add(cardGroup);

  let basePaddingBottomPx = null;

  function updateHeroPadding(progress) {
    if (basePaddingBottomPx === null) {
      basePaddingBottomPx = parseFloat(getComputedStyle(interactionRoot).paddingBottom) || 0;
    }
    const growthPx = PAGE_GROWTH_WORLD * progress * PIXELS_PER_WORLD_UNIT;
    interactionRoot.style.paddingBottom = (basePaddingBottomPx + growthPx) + 'px';
    // tick() sizes the drawing buffer and redraws it in this same callback.
  }

  // declared ahead of the initial draw calls below since drawFront() reads
  // this to decide which way the chevron glyph points
  let dropdownOpen = false;
  let dropdownProgress = 0; // résumé tab's current 0..1 slide progress
  let cardLift = 0;
  let cancelDropdownTween = null;
  let dropdownAnimation = null;

  // tabGroup's own resting position is already baked in at construction
  // (group.position.y = TAB_CLOSED_LOCAL_Y in makeTabRig), but the
  // unified cap's shader offset has no such default — its uniform starts
  // at (0,0), which is the *open* offset in the baked-at-open convention
  // above. This establishes the actual closed state before the first
  // frame ever renders. (Not routed through the full
  // setDropdownVisual()/updateHeroPadding() — that reaches into
  // handleResize()'s own lastResizeW/lastResizeH, which aren't
  // initialized yet this early in setup.)
  tabOffsetFront.value.set(TAB_HEIGHT, -TAB_RECESS);

  drawFront();
  drawBack();

  // regenerate all text once webfonts are confirmed loaded, for crisp type
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      drawFront();
      drawBack();
    });
  }

  // CSS custom properties re-theme the DOM on their own, but nothing
  // repaints a canvas for free — re-read the palette and redraw both faces
  // whenever the dev-only theme switcher (themeSwitcher.js) changes theme.
  onThemeChange(() => {
    PALETTE = getPalette();
    CARD_STOCK_COLOR = PALETTE.cardStock;
    INK_COLOR = PALETTE.ink;
    LINK_COLOR = PALETTE.accent;
    CARD_EDGE_COLOR = PALETTE.cardEdge || '#e6dcc4';
    edgeSideMat.color.set(CARD_EDGE_COLOR);
    FONT_MONO = PALETTE.fontMono;
    FONT_DISPLAY = PALETTE.fontDisplay;
    GRAIN_ALPHA = PALETTE.grainOpacity || 0.055;
    drawFront();
    drawBack();
    // A theme can introduce a font family the page has never rendered
    // before, so the browser may still be fetching its file at the moment
    // of this redraw (Google Fonts only downloads the actual font bytes
    // once something first tries to paint with them) — this draw falls
    // back to a substitute font silently. Re-draw once it's confirmed in,
    // same as the initial-load handling above.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        drawFront();
        drawBack();
      });
    }
  });

  /* ---------- extend/un-extend: front-only now. Animates the résumé
     tab's position and the card's own lift; the page grows to match. No
     geometry or texture is touched by any of this. ---------- */

  function setDropdownVisual(progress) {
    dropdownProgress = progress;
    const y = TAB_CLOSED_LOCAL_Y + (TAB_OPEN_LOCAL_Y - TAB_CLOSED_LOCAL_Y) * progress;
    tabGroup.position.y = y;
    // cancels the tab rig's built-in closed-state z-recess (see
    // TAB_RECESS) as it slides out, so the edge wall ends up flush with
    // the card's own face at full open.
    tabGroup.position.z = TAB_RECESS * progress;

    // Same slide, expressed as a shader offset on the unified cap's
    // tagged tab-region vertices: baked rest state is the OPEN position
    // (0 offset), so closed is +TAB_HEIGHT in local Y and -TAB_RECESS in
    // local Z.
    const closedAmount = 1 - progress;
    tabOffsetFront.value.set(TAB_HEIGHT * closedAmount, -TAB_RECESS * closedAmount);

    cardLift = PARKED_LIFT * progress;
    updateHeroPadding(progress);
  }

  function animateDropdown(target) {
    if (cancelDropdownTween) cancelDropdownTween();
    dropdownAnimation = {
      from: dropdownProgress,
      target,
      startTime: performance.now()
    };
    // Preserve the existing cancellation/settled-state contract. Unlike the
    // general tween helper, this schedules no separate frame callback.
    cancelDropdownTween = () => { dropdownAnimation = null; };
  }

  function advanceDropdown(now) {
    if (!dropdownAnimation) return;
    const { from, target, startTime } = dropdownAnimation;
    const t = Math.max(0, Math.min(1, (now - startTime) / 500));
    setDropdownVisual(from + (target - from) * EASE.outCubic(t));
    if (t === 1) {
      dropdownAnimation = null;
      cancelDropdownTween = null;
      // The closing card remains above the nav until it is actually closed.
      updateElevation();
      updateMobileFlipGuide();
    }
  }

  function openDropdown() {
    // front-only: the back has nothing to extend, and extending is how
    // flipping-to-the-back gets disabled in the first place (see
    // toggleFlip), so a flipped/flipping card should never reach here —
    // this guard is just belt-and-suspenders against a stray caller.
    if (dropdownOpen || flipped || flipping) return;
    dropdownOpen = true;
    redrawToggleChevron();
    updateGuideContent();
    updateMobileFlipGuide();
    updateElevation();
    animateDropdown(1);
  }

  function closeDropdown() {
    if (!dropdownOpen) return;
    dropdownOpen = false;
    redrawToggleChevron();
    updateGuideContent();
    updateMobileFlipGuide();
    updateElevation();
    animateDropdown(0);
  }

  function downloadResumePdf() {
    const a = document.createElement('a');
    a.href = RESUME_PDF_PATH;
    a.download = 'matthew-scheffler-resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function isCardSettled() {
    // mode, not dragging: dragging flips back to false the instant a drag
    // ends, but a throw leaves mode at 'thrown'/'returning' for the ~1.6s
    // the card is still visibly flying off-screen and back (see
    // throwCard) — exactly the sort of mid-animation state this check
    // exists to rule out. Every other gate that cares about this
    // (pointerdown, toggleFlip) already checks mode; this one needs to as
    // well, since the back face (and its form) stays interactive through
    // a throw — flipped/flipping are untouched by throwCard.
    return mode === 'idle' && !flipping && !cancelDropdownTween && !cancelReturnTween;
  }

  /* ---------- interaction state ---------- */

  let tiltX = 0, tiltTargetX = 0, tiltVelX = 0;
  let tiltY = 0, tiltTargetY = 0, tiltVelY = 0;
  const TILT_MAX = THREE.MathUtils.degToRad(12);
  const TILT_STIFFNESS = 0.09;
  const TILT_DAMPING = 0.8;
  let hovering = false;

  let physicsSuspended = false;
  function setPhysicsSuspended(v) {
    physicsSuspended = v;
    if (v) { tiltTargetX = 0; tiltTargetY = 0; }
  }

  let flipYaw = 0, flipped = false, flipping = false;

  let idleT = Math.random() * 100;
  // Eased amplitude for the idle sway/breathe effect, not a hard on/off —
  // see its own comment at the tick() computation for why.
  let idleBlend = 0;
  let throwSpin = 0;
  let posX = 0, posY = 0;
  let liftProgress = 0, liftProgressTarget = 0;

  let mode = 'idle'; // idle | dragging | thrown | returning
  let dragOriginClientX = 0, dragOriginClientY = 0;
  let dragStartX = 0, dragStartY = 0;
  let lastDragProgress = 0;
  let cancelReturnTween = null;

  let isPointerDown = false;
  let potentialDrag = false;
  let dragging = false;
  let pointerDownClient = null;
  let pointerDownTime = 0;
  let pointerDownOnCard = false;
  const DRAG_THRESHOLD = 6;
  // Mobile has no visual drag feedback to speak of any more (see the
  // pointermove listener below) — a tap is judged as "still a tap" by
  // this instead, a good deal more forgiving than a mouse's own precise
  // DRAG_THRESHOLD, since a fingertip drifts more than a mouse cursor
  // does even when the person holding it means to just tap once.
  const TOUCH_TAP_TOLERANCE_PX = 16;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function worldHeightAtZ(zDepth) {
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    return 2 * Math.tan(vFOV / 2) * (camera.position.z - zDepth);
  }
  function worldWidthAtZ(zDepth) {
    return worldHeightAtZ(zDepth) * camera.aspect;
  }

  function setNdcFromClient(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
  }

  function hitsCard(clientX, clientY) {
    setNdcFromClient(clientX, clientY);
    if (raycaster.intersectObject(hitMesh, false).length > 0) return true;
    // the résumé tab only has its own separate hit region while it's
    // actually extended and the front face is the one showing
    if (!flipped && dropdownOpen) return raycaster.intersectObject(tabHitMesh, false).length > 0;
    return false;
  }

  // returns how far down the click landed, as a fraction of
  // BASE_CARD_HEIGHT from the card's top edge (matching the *_F layout
  // constants above), or null if the click missed the card entirely.
  function hitFractionFromTop(clientX, clientY) {
    setNdcFromClient(clientX, clientY);
    const hits = raycaster.intersectObject(hitMesh, false);
    if (!hits.length || !hits[0].uv) return null;
    const worldFromTop = (1 - hits[0].uv.y) * CARD_HEIGHT;
    return worldFromTop / BASE_CARD_HEIGHT;
  }

  // same idea, but also returns the horizontal position (u, 0..1 across
  // CARD_WIDTH) — needed for the back face's social-link row, which
  // (unlike the front's single-column job rows) sits side by side rather
  // than stacked, so a Y-band alone can't tell the links apart.
  function hitUVOnCard(clientX, clientY) {
    setNdcFromClient(clientX, clientY);
    const hits = raycaster.intersectObject(hitMesh, false);
    if (!hits.length || !hits[0].uv) return null;
    const worldFromTop = (1 - hits[0].uv.y) * CARD_HEIGHT;
    return { u: hits[0].uv.x, vFrac: worldFromTop / BASE_CARD_HEIGHT };
  }

  // same idea, against the résumé tab's own hitbox — only meaningful while
  // it's open. Returned in the same "fraction of BASE_CARD_HEIGHT from the
  // *card's* top edge" space as the DOWNLOAD_BAND_* constants, by adding
  // TAB_F_OFFSET back on.
  function tabHitFractionFromTop(clientX, clientY) {
    setNdcFromClient(clientX, clientY);
    const hits = raycaster.intersectObject(tabHitMesh, false);
    if (!hits.length || !hits[0].uv) return null;
    const worldFromTop = (1 - hits[0].uv.y) * TAB_HEIGHT;
    return worldFromTop / BASE_CARD_HEIGHT + TAB_F_OFFSET;
  }

  function handleCardClick(clientX, clientY) {
    // Checked against the card's own hitbox first. This only covers the
    // card body itself (up through the toggle band) — the résumé tab's
    // job rows and download link live entirely below that, on the tab's
    // own separate mesh, so a null here does NOT mean the click missed
    // everything; it just means it missed the card proper.
    const frac = hitFractionFromTop(clientX, clientY);

    // the toggle row is front-only now — the back has no toggle row (and
    // nothing of its own to extend), so this branch simply doesn't apply
    // there any more
    if (!flipped && frac !== null && frac >= TOGGLE_BAND_TOP_F && frac <= TOGGLE_BAND_BOTTOM_F) {
      if (dropdownOpen) closeDropdown(); else openDropdown();
      return;
    }

    if (!flipped && dropdownOpen) {
      const tfrac = tabHitFractionFromTop(clientX, clientY);
      if (tfrac !== null) {
        for (let i = 0; i < JOBS.length; i++) {
          const rowTopF = ROWS_TOP_F + i * ROW_HEIGHT_F;
          if (tfrac >= rowTopF && tfrac <= rowTopF + ROW_HEIGHT_F) {
            // the card only ever announces the click — it stays self-
            // contained by never calling into the page's own code
            // directly; the page decides what a job click means.
            container.dispatchEvent(new CustomEvent('resume-job-click', { detail: { jobId: JOBS[i].id }, bubbles: true }));
            return;
          }
        }
        if (tfrac >= DOWNLOAD_BAND_TOP_F && tfrac <= DOWNLOAD_BAND_BOTTOM_F) {
          downloadResumePdf();
          return;
        }
      }
    }

    // back-only: the Instagram/LinkedIn icon+handle rows, plus (mobile
    // only) the "CONTACT" header itself (save-contact) and the email line
    // below it (all drawn by drawBack, bounds recorded in socialLinkBounds
    // each time it redraws — each is its own row now, so bounds carry
    // their own v-range rather than sharing one row's band)
    if (flipped) {
      const hit = hitUVOnCard(clientX, clientY);
      if (hit !== null) {
        const link = socialLinkBounds.find(b =>
          hit.u >= b.uMin && hit.u <= b.uMax && hit.vFrac >= b.vMin && hit.vFrac <= b.vMax
        );
        if (link) {
          link.action();
          return;
        }
      }
    }

    // a click that missed both the card's own hitbox and (when applicable)
    // the tab's job rows/download link didn't land on anything clickable
    if (frac === null) return;

    // flipping stays available no matter what's open — the open/closed
    // state itself is shared between both faces, but which face is
    // currently showing can always be changed by clicking the card body
    toggleFlip();
  }

  /* ---------- pointer handling: click-on-card = flip/toggle, drag-anywhere = move/throw ---------- */

  // Base: fully permissive. interactionRoot is the whole hero *section*
  // (see its own definition above) — on a phone that's close to the full
  // viewport height, so 'none' applied here unconditionally (the previous
  // approach) made every touch anywhere in that mostly-empty region a dead
  // zone for scrolling, not just touches on the card itself, which read as
  // the page being unscrollable from a phone. Narrowed to 'none' only for
  // the duration of a touch that actually lands on the card (see
  // pointerdown below, and its pointerup/pointercancel counterpart) — that
  // still lets the card's own drag gesture (both axes; a phone has no
  // hover to fall back on, only this) fully win over native scrolling
  // exactly like before, without claiming the rest of the hero too.
  interactionRoot.style.touchAction = 'auto';
  document.body.style.cursor = 'grab';

  interactionRoot.addEventListener('pointerdown', (e) => {
    if (mode !== 'idle' || flipping || physicsSuspended) return;
    // .contact-form: without this, pressing down to select text in a
    // field (or just the very click that focuses one) would also start
    // dragging the whole card. physicsSuspended above covers everything
    // *after* a field already has focus; this covers the initiating
    // click itself, which lands before focus (and the suspension it
    // triggers) has taken effect.
    if (e.target.closest && e.target.closest('a, button, .contact-form')) return;
    isPointerDown = true;
    potentialDrag = true;
    pointerDownClient = { x: e.clientX, y: e.clientY };
    pointerDownTime = performance.now();
    pointerDownOnCard = hitsCard(e.clientX, e.clientY);
    // See interactionRoot.style.touchAction's own comment, just above —
    // this is the per-touch narrowing that comment describes. A mouse
    // pointerdown ignores touch-action entirely, so gating on pointerType
    // isn't load-bearing, just avoids writing a style that can't do
    // anything on desktop.
    if (e.pointerType === 'touch') {
      interactionRoot.style.touchAction = pointerDownOnCard ? 'none' : 'auto';
    }
    // Nothing in the page marks any of its own text unselectable, and a
    // drag can legitimately sweep well outside the card itself — up past
    // the fixed nav bar's real, plain DOM text while dragging up to
    // extend the résumé (the hover guides' own captions are exempt,
    // being pointer-events:none). Without this, the browser's native
    // mouse-drag text-selection starts the instant the cursor crosses
    // that text, producing a blue highlight flash right around release —
    // exactly the flicker this gesture used to trigger. Set from
    // pointerdown (not just once a drag is confirmed
    // past DRAG_THRESHOLD in beginDrag) so the few px before that
    // threshold — still real mouse-down movement — can't start one
    // either; cleared in pointerup below regardless of whether this
    // turned into a drag, a click, or neither. webkitUserSelect
    // alongside the standard property for the same reason
    // .card3d-container's own CSS sets both — iOS Safari doesn't
    // reliably honor the unprefixed one alone.
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  });

  window.addEventListener('pointermove', (e) => {
    // Mobile drops hover/touch-tilt, free-drag, and the hover guides
    // entirely, by request — tap-to-flip (via handleCardClick, in
    // pointerup below) is the only gesture left there. An earlier version
    // tilted the card toward wherever it was being touched (reusing this
    // same updateHoverTilt) — removed for being one more moving part on
    // top of everything else being cut, not because it didn't work.
    if (isTouchDevice) return;
    if (!dragging) updateHoverTilt(e.clientX, e.clientY);
    if (!dragging) updateGuideHints(e.clientX, e.clientY);

    if (isPointerDown && potentialDrag && !dragging) {
      const dx = e.clientX - pointerDownClient.x;
      const dy = e.clientY - pointerDownClient.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        beginDrag(e.clientX, e.clientY);
      }
    }
    if (dragging) updateDrag(e.clientX, e.clientY);
  });

  window.addEventListener('pointerup', (e) => {
    if (dragging) {
      endDrag();
    } else if (isPointerDown && potentialDrag && pointerDownOnCard) {
      const dt = performance.now() - pointerDownTime;
      const dx = e.clientX - pointerDownClient.x;
      const dy = e.clientY - pointerDownClient.y;
      // Mobile never started a drag to begin with (see pointermove above),
      // so a real fingertip's natural wobble during a plain tap has
      // nothing to have been absorbed by the way a few px of mouse
      // movement before beginDrag's own threshold does — a more forgiving
      // tolerance here is what keeps that same tap reliably still reading
      // as a tap instead of silently doing nothing.
      const tapTolerance = isTouchDevice ? TOUCH_TAP_TOLERANCE_PX : DRAG_THRESHOLD;
      if (Math.hypot(dx, dy) < tapTolerance && dt < 600) {
        handleCardClick(e.clientX, e.clientY);
      }
    }
    isPointerDown = false;
    potentialDrag = false;
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    interactionRoot.style.touchAction = 'auto';
  });

  // A touch sequence can end without ever reaching pointerup — the OS
  // intercepting it for its own gesture (e.g. an edge-swipe system
  // action), an incoming call, etc. Without also resetting here, that
  // leaves touch-action stuck at 'none' from whatever pointerdown last set
  // it to, silently killing scroll in the hero until another full
  // pointerdown/pointerup cycle happens to reset it — worse than the
  // original bug this all exists to fix, since it'd look intermittent.
  window.addEventListener('pointercancel', (e) => {
    // Same as pointerup's own dragging branch — a cancel mid-drag still
    // needs the card physics settled back to its resting state, not just
    // left mid-air wherever the gesture happened to be interrupted.
    if (dragging) endDrag();
    isPointerDown = false;
    potentialDrag = false;
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    interactionRoot.style.touchAction = 'auto';
  });

  interactionRoot.addEventListener('pointerleave', () => {
    hovering = false;
    tiltTargetX = 0;
    tiltTargetY = 0;
    hideGuides();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // a focused form field takes the Escape first (blurs it); only once
    // there's no field to blur does Escape fall through to closing the tab
    if (contactForm.blurActive()) return;
    if (dropdownOpen) closeDropdown();
  });

  /* ---------- hover: vertical -> X tilt, horizontal -> Y tilt (small angle, both axes) ---------- */

  function updateHoverTilt(clientX, clientY) {
    if (physicsSuspended) { hovering = false; tiltTargetX = 0; tiltTargetY = 0; return; }
    const rect = interactionRoot.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      hovering = false;
      tiltTargetX = 0;
      tiltTargetY = 0;
      return;
    }
    hovering = true;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
    tiltTargetX = THREE.MathUtils.clamp(-ny * TILT_MAX, -TILT_MAX, TILT_MAX);
    tiltTargetY = THREE.MathUtils.clamp(nx * TILT_MAX, -TILT_MAX, TILT_MAX);
  }

  /* ---------- flip ---------- */

  function toggleFlip() {
    // Extending and flipping-to-the-back are mutually exclusive: the
    // résumé is a front-only affordance, so while it's extended (and only
    // reachable from the front, since dropdownOpen can't become true
    // while flipped — see openDropdown) flipping away from it is blocked.
    // Flipping back to the front from the back is always allowed, since
    // the back never extends and so never has this conflict.
    if (flipping || dragging || mode !== 'idle' || cancelDropdownTween || (dropdownProgress > 0 && !flipped) || (dropdownOpen && !flipped)) return;
    flipping = true;
    updateMobileFlipGuide();
    const from = flipYaw;
    const to = flipYaw + Math.PI;
    flipped = !flipped;
    tween(400, EASE.flipApex, (v) => {
      flipYaw = from + (to - from) * v;
    }, () => {
      flipYaw = to;
      flipping = false;
      updateMobileFlipGuide();
    });
  }

  /* ---------- drag to throw ---------- */

  // .hero's own CSS pins it at z-index:1 (below nav's fixed z-index:100), so
  // the card can be dragged (or extended into the résumé view) up into the
  // nav's screen area but would render underneath it — bumping the whole
  // hero section above nav whenever either is true lets the card win that
  // overlap without permanently changing hero/nav stacking the rest of the
  // time. A single derived helper (rather than setting/clearing the z-index
  // ad hoc at each call site) avoids the two states stomping on each other —
  // e.g. a drag that ends without closing an already-open résumé must leave
  // the elevation in place, not reset it just because the drag itself ended.
  function updateElevation() {
    interactionRoot.style.zIndex = (dragging || dropdownOpen || dropdownProgress > 0 || !!cancelDropdownTween) ? '150' : '';
  }

  function beginDrag(clientX, clientY) {
    if (cancelReturnTween) { cancelReturnTween(); cancelReturnTween = null; }
    dragging = true;
    hovering = false;
    hideGuides();
    mode = 'dragging';
    dragOriginClientX = clientX;
    dragOriginClientY = clientY;
    dragStartX = posX;
    dragStartY = posY;
    lastDragProgress = 0;
    liftProgressTarget = 1;
    document.body.style.cursor = 'grabbing';
    updateElevation();
  }

  function updateDrag(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const worldW = worldWidthAtZ(0);
    const worldH = worldHeightAtZ(0);
    const nextX = dragStartX + (clientX - dragOriginClientX) * (worldW / rect.width);
    // screen Y grows downward, world Y grows upward
    const nextY = dragStartY - (clientY - dragOriginClientY) * (worldH / rect.height);

    // clamped so a dropped card is always still reachable
    posX = THREE.MathUtils.clamp(nextX, -worldW * MAX_POS_X_FRACTION, worldW * MAX_POS_X_FRACTION);
    posY = THREE.MathUtils.clamp(nextY, -worldH * MAX_POS_Y_FRACTION, worldH * MAX_POS_Y_FRACTION);

    const edgeThreshold = worldW * 0.5 * 0.42;
    const progress = posX / edgeThreshold;
    lastDragProgress = progress;

    zoneRight.classList.toggle('is-active', progress > 0.65);
    zoneLeft.classList.toggle('is-active', progress < -0.65);
  }

  function endDrag() {
    dragging = false;
    document.body.style.cursor = 'grab';
    liftProgressTarget = 0;
    // Provisional — if this same drag opens/closes the dropdown further
    // down, openDropdown()/closeDropdown() will call this again with the
    // final state. Needed here too for the plain-drag-with-no-effect case,
    // where neither of those fires and this is the only place elevation
    // drops back down once dragging itself ends.
    updateElevation();

    const activeRight = lastDragProgress > 0.65;
    const activeLeft = lastDragProgress < -0.65;
    zoneRight.classList.remove('is-active');
    zoneLeft.classList.remove('is-active');

    if (activeRight) { throwCard('right'); return; }
    if (activeLeft) { throwCard('left'); return; }

    // Open/close is judged on how far THIS drag travelled, so a card
    // already parked near the top doesn't re-trigger on every nudge.
    mode = 'idle';

    // Mobile drops drag-to-extend entirely, by request — the toggle
    // row's own tap target (see handleCardClick) is the only way to
    // open/close the résumé there now. A vertical drag on mobile still
    // moves the card and springs it back via returnToHome() below like
    // any other drag, it just doesn't have this side effect anymore.
    if (!isTouchDevice) {
      const worldH = worldHeightAtZ(0);
      const travelY = posY - dragStartY;
      if (travelY > worldH * DRAG_UP_THRESHOLD_FRACTION) {
        // no effect while already extended (that's what left/right-drag are
        // for now — see throwCard) or while viewing the back (which never
        // extends at all)
        if (!dropdownOpen && !flipped) openDropdown();
      } else if (travelY < -worldH * DRAG_DOWN_THRESHOLD_FRACTION) {
        closeDropdown();
      }
    }

    // Dragging is always a temporary displacement, never a new permanent
    // parking spot — the card eases back to its one resting spot (0,0)
    // every time a drag ends, whether or not this same drag opened or
    // closed the dropdown. "Staying" while the dropdown is open is a
    // separate, persistent effect (cardLift, driven by dropdownOpen) that
    // stays applied on top of this regardless of posX/posY, so a résumé
    // drag-open still ends up parked near the top even though posY itself
    // returns home.
    returnToHome();
  }

  function returnToHome() {
    if (cancelReturnTween) cancelReturnTween();
    const startX = posX, startY = posY;
    cancelReturnTween = tween(400, EASE.outCubic, (v) => {
      posX = startX + (0 - startX) * v;
      posY = startY + (0 - startY) * v;
    }, () => {
      posX = 0;
      posY = 0;
      cancelReturnTween = null;
    });
  }

  function throwCard(direction) {
    mode = 'thrown';
    const sign = direction === 'right' ? 1 : -1;
    const worldW = worldWidthAtZ(0);
    const offX = sign * worldW * 0.85;
    // the card's one resting spot — same as returnToHome() uses for every
    // other drag-release. A throw is just a drag that happened to cross
    // the edge threshold, so it returns to the same place any other drag
    // would, not to wherever it happened to be when the throw fired.
    const homeX = 0;
    const homeY = 0;

    // Extended, both edges grab the résumé instead — throwing either way
    // reads as "here, take this" regardless of side once the résumé is
    // what's actually showing; the vCard/mailto split only makes sense
    // for the closed, contact-card-first state. Mobile drops this
    // override entirely, by request: the résumé can still be open there
    // (via the toggle row's tap target — drag-to-extend itself is gone,
    // see endDrag, but tapping still works), but a left/right throw
    // always does the plain vCard/mailto split regardless, and the PDF
    // is only ever reachable by tapping "DOWNLOAD RÉSUMÉ (PDF)" directly.
    if (dropdownOpen && !isTouchDevice) {
      downloadResumePdf();
      showConfirmation('downloading résumé…');
    } else if (direction === 'right') {
      downloadVCard();
      showConfirmation('contact saved');
    } else {
      openMailto();
      showConfirmation('composing…');
    }

    // outCubic both ways (fast-then-settle, not a hard snap-away) and a
    // much smaller spin — a full 18° read as the card being flicked/spun
    // off, not slid. A slide should look like one continuous, flat glide
    // out and back, with just enough rotation (a few degrees) to keep it
    // feeling physical rather than purely mechanical.
    const THROW_SPIN_DEG = 5;
    // Starts from wherever the drag actually left the card (updateDrag's
    // own clamped posX), not from homeX — the drag already carried it
    // most of the way to the edge, so continuing from there (rather than
    // snapping back to center for this tween's own v=0 frame, then
    // animating out) is what makes release read as one unbroken sweep
    // continuing the hand's own motion, instead of the card visibly
    // resetting and then taking off on its own.
    const departX = posX;
    tween(420, EASE.outCubic, (v) => {
      posX = departX + (offX - departX) * v;
      throwSpin = sign * THREE.MathUtils.degToRad(THROW_SPIN_DEG) * v;
    }, () => {
      posX = offX;
      setTimeout(() => {
        mode = 'returning';
        const startX = posX;
        tween(480, EASE.outCubic, (v) => {
          posX = startX + (homeX - startX) * v;
          posY = homeY;
          throwSpin = sign * THREE.MathUtils.degToRad(THROW_SPIN_DEG) * (1 - v);
        }, () => {
          posX = homeX;
          posY = homeY;
          throwSpin = 0;
          mode = 'idle';
        });
      }, 800);
    });
  }

  /* ---------- vCard + mailto ---------- */

  function downloadVCard() {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${CONTACT.last};${CONTACT.first};;;`,
      `FN:${CONTACT.name}`,
      `TITLE:${CONTACT.title}`,
      `EMAIL:${CONTACT.email}`,
      `URL:${CONTACT.url}`,
      'END:VCARD'
    ].join('\r\n');
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matthew-scheffler.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openMailto() {
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Hello from mattscheff.com')}`;
  }

  /* ---------- DOM overlays: drop zones, confirmation ---------- */

  const zoneRight = document.createElement('div');
  zoneRight.className = 'card3d-zone card3d-zone--right';
  document.body.appendChild(zoneRight);
  const zoneLeft = document.createElement('div');
  zoneLeft.className = 'card3d-zone card3d-zone--left';
  document.body.appendChild(zoneLeft);

  const confirmEl = document.createElement('div');
  confirmEl.className = 'card3d-confirm';
  container.appendChild(confirmEl);
  let confirmTimer = null;
  function showConfirmation(text) {
    confirmEl.textContent = text;
    confirmEl.classList.add('is-visible');
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => confirmEl.classList.remove('is-visible'), 1500);
  }

  /* ---------- hover guides: faint per-edge drag hints, same font/weight
     as the card's other small caption text. Each one fades in as the cursor nears the
     card edge its gesture belongs to (and out again as it leaves), so
     they read as a property of hovering that spot rather than a fixed
     label — see updateGuideHints() below for the proximity math, and its
     own call site (alongside updateHoverTilt) for why both are driven off
     the same pointermove. ---------- */

  const ICON_ARROW = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3M4 7l4-4 4 4"/></svg>';
  const ICON_CURVE = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5.2c-2.6 3-6.3 4.4-9.8 3.9"/><path d="M6.4 6.3L2.9 9.2l2.7 2.6"/></svg>';
  const ICON_FLIP = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.3 8.4a4.7 4.7 0 0 1 8-3.3M12.7 7.6a4.7 4.7 0 0 1-8 3.3"/><path d="M11 2.6v2.8H8.2M5 13.4v-2.8h2.8"/></svg>';

  function makeGuide(extraClass) {
    const el = document.createElement('div');
    el.className = 'card3d-guide' + (extraClass ? ' ' + extraClass : '');
    el.innerHTML = '<span class="card3d-guide-icon"></span><span class="card3d-guide-text"></span>';
    container.appendChild(el);
    return el;
  }

  const guideTop = makeGuide('card3d-guide--top');
  const guideLeft = makeGuide('card3d-guide--left');
  const guideRight = makeGuide('card3d-guide--right');
  const guideFlip = makeGuide('card3d-guide--flip');
  const guideIcon = { top: guideTop.querySelector('.card3d-guide-icon'), left: guideLeft.querySelector('.card3d-guide-icon'), right: guideRight.querySelector('.card3d-guide-icon'), flip: guideFlip.querySelector('.card3d-guide-icon') };
  const guideText = { top: guideTop.querySelector('.card3d-guide-text'), left: guideLeft.querySelector('.card3d-guide-text'), right: guideRight.querySelector('.card3d-guide-text'), flip: guideFlip.querySelector('.card3d-guide-text') };
  guideIcon.left.innerHTML = ICON_CURVE;
  guideIcon.right.innerHTML = ICON_CURVE;
  guideIcon.flip.innerHTML = ICON_FLIP;
  guideText.flip.textContent = isTouchDevice ? 'tap to flip' : 'click to flip';

  // The drag-based guides (top/left/right) have no gesture left to hint
  // at on mobile (see the pointermove listener's own comment) —
  // display:none, not just left unpositioned, since these render OUTSIDE
  // the card's own edges with long unwrapped hint sentences ("DRAG RIGHT
  // TO SAVE CONTACT INFO"); on a narrow phone that's wider than the card
  // itself has room for, an opacity-0-but-still-positioned element still
  // contributes to the page's own scrollable width, which is what was
  // actually causing the horizontal scrollbar/dead-scroll-zone this
  // exists to fix — not the touch-action handling, which was already
  // correct. guideFlip is different: tap-to-flip is still very much a
  // live gesture on mobile, just with no hover to reveal it the way
  // updateGuideHints below does for desktop — see updateMobileFlipGuide,
  // which drives it there instead.
  if (isTouchDevice) {
    guideTop.style.display = 'none';
    guideLeft.style.display = 'none';
    guideRight.style.display = 'none';
  }

  // Mobile has no hover to fade guideFlip in near the cursor the way
  // updateGuideHints does for desktop (that whole function is skipped for
  // touch — see the pointermove listener), so this drives the same guide
  // a different way: a fixed, ambient opacity whenever the card is at
  // rest showing its front (the only state tap-to-flip actually applies),
  // hidden the instant that stops being true. Position only needs
  // recomputing on resize and once at startup, not every frame — it's
  // only ever shown at cardLift's resting value (0: the dropdown, the
  // only thing that ever moves it, is one of the states this hides for),
  // so there's no drift to chase the way a truly per-frame position would
  // need to account for.
  const MOBILE_GUIDE_FLIP_OPACITY = 0.6;
  function positionMobileFlipGuide() {
    if (!isTouchDevice) return;
    const hostRect = interactionRoot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const originX = hostRect.left + hostRect.width / 2 - containerRect.left;
    const originY = hostRect.top + hostRect.height / 2 - containerRect.top;
    guideFlip.style.left = originX + 'px';
    guideFlip.style.top = (originY + GUIDE_HALF_H_PX + GUIDE_MARGIN_PX) + 'px';
  }
  function updateMobileFlipGuide() {
    if (!isTouchDevice) return;
    guideFlip.style.opacity = (!flipped && !flipping && !dropdownOpen && !cancelDropdownTween && dropdownProgress === 0) ? MOBILE_GUIDE_FLIP_OPACITY : 0;
  }

  // Only the top/left/right guides' TEXT (and the top guide's icon
  // direction) change with state — updated once per actual state
  // transition (here and in openDropdown/closeDropdown), not per frame;
  // updateGuideHints() below only ever touches position/opacity.
  function updateGuideContent() {
    guideIcon.top.innerHTML = ICON_ARROW;
    guideIcon.top.classList.toggle('is-down', dropdownOpen);
    guideText.top.textContent = dropdownOpen ? 'drag down to close' : 'drag up to view résumé';
    // Mobile keeps the left/right throw as plain email/vCard always (see
    // throwCard) — never repurposed for résumé download the way desktop's
    // still is — so the guide text has to stay accurate to that rather
    // than switching to "drag to save résumé" just because dropdownOpen
    // happens to be true (reachable there via the toggle row's tap
    // target even with drag-to-extend itself gone).
    const resumeDragActive = dropdownOpen && !isTouchDevice;
    guideText.left.textContent = resumeDragActive ? 'drag to save résumé' : 'drag left to send an email';
    guideText.right.textContent = resumeDragActive ? 'drag to save résumé' : 'drag right to save contact info';
  }
  updateGuideContent();
  positionMobileFlipGuide();
  updateMobileFlipGuide();

  function hideGuides() {
    guideTop.style.opacity = 0;
    guideLeft.style.opacity = 0;
    guideRight.style.opacity = 0;
    guideFlip.style.opacity = 0;
  }

  function updateGuideHints(clientX, clientY) {
    if (physicsSuspended || mode !== 'idle' || flipping) { hideGuides(); return; }

    // World origin (the card's resting center) projects to the exact
    // center of interactionRoot's own box (canvas fills it via inset:0,
    // camera looks straight at the origin — see the renderer/camera
    // setup above) — NOT the center of `container`, which the guides are
    // actually appended to (matching confirmEl's own convention)
    // and which can sit off-center inside interactionRoot whenever its
    // host layout pads asymmetrically (true here: the hero section's own
    // top/bottom padding differ). So the shared center point is computed
    // in interactionRoot-space, then re-expressed in container-space
    // (originX/Y below) for the actual left/top writes.
    const hostRect = interactionRoot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const centerX = hostRect.width / 2;
    const centerY = hostRect.height / 2 - cardLift * PIXELS_PER_WORLD_UNIT;
    const px = clientX - hostRect.left - centerX;
    const py = clientY - hostRect.top - centerY;

    const bottomLimit = GUIDE_HALF_H_PX + (dropdownOpen ? GUIDE_TAB_H_PX : 0);
    const inside = Math.abs(px) <= GUIDE_HALF_W_PX * 1.08
      && py >= -GUIDE_HALF_H_PX * 1.08 && py <= bottomLimit * 1.05;

    // Mobile has no drag-up-to-extend to hint at any more (see endDrag) —
    // the toggle row's own tap target is the only way there, and that
    // needs no hover-proximity hint the way a drag gesture does.
    const topStrength = inside && !flipped && !isTouchDevice ? THREE.MathUtils.clamp(-py / GUIDE_HALF_H_PX, 0, 1) : 0;
    const leftStrength = inside ? THREE.MathUtils.clamp(-px / GUIDE_HALF_W_PX, 0, 1) : 0;
    const rightStrength = inside ? THREE.MathUtils.clamp(px / GUIDE_HALF_W_PX, 0, 1) : 0;
    const flipStrength = inside && !dropdownOpen
      ? THREE.MathUtils.clamp(1 - Math.hypot(px / GUIDE_HALF_W_PX, py / GUIDE_HALF_H_PX), 0, 1)
      : 0;
    const GUIDE_MAX_OPACITY = 0.85;

    guideTop.style.opacity = topStrength * GUIDE_MAX_OPACITY;
    guideLeft.style.opacity = leftStrength * GUIDE_MAX_OPACITY;
    guideRight.style.opacity = rightStrength * GUIDE_MAX_OPACITY;
    guideFlip.style.opacity = flipStrength * GUIDE_MAX_OPACITY;

    const originX = (hostRect.left + centerX) - containerRect.left;
    const originY = (hostRect.top + centerY) - containerRect.top;
    guideTop.style.left = originX + 'px';
    guideTop.style.top = (originY - GUIDE_HALF_H_PX - GUIDE_MARGIN_PX) + 'px';
    guideLeft.style.left = (originX - GUIDE_HALF_W_PX - GUIDE_MARGIN_PX) + 'px';
    guideLeft.style.top = originY + 'px';
    guideRight.style.left = (originX + GUIDE_HALF_W_PX + GUIDE_MARGIN_PX) + 'px';
    guideRight.style.top = originY + 'px';
    guideFlip.style.left = originX + 'px';
    guideFlip.style.top = (originY + GUIDE_HALF_H_PX + GUIDE_MARGIN_PX) + 'px';
  }

  /* ---------- contact form (fixed region on the back face) ---------- */

  const contactForm = initContactForm({
    THREE,
    pixelsPerWorldUnit: PIXELS_PER_WORLD_UNIT,
    // contact.js reads projectionMatrix/matrixWorldInverse off this each
    // frame, only after tick() below has already refreshed both (via
    // handleResize() and renderer.render()) — see contact.js's own doc
    // comment for why that ordering makes it safe to read the live
    // camera here, unlike getBoundingClientRect() (its own zoom/
    // replaced-element pitfalls) or the earlier position-only approaches.
    camera,
    anchor: backFormAnchor,
    hostEl: interactionRoot,
    fallbackEmail: CONTACT.email,
    // binary now, not a slide-driven ramp — the back face doesn't extend
    // any more, so the form has nothing to lag behind or race ahead of.
    // This only gates pointer-events/focus — the panel's own transform
    // tracks backFormAnchor every frame it's active (see backActive
    // below), so it visually spins with the card through the flip tween
    // itself; see contact.js's update() for how it hides at the right
    // moment without this flag's help.
    progress: () => (flipped && !flipping) ? 1 : 0,
    // Gates whether contact.js does ANY per-frame work at all — the back
    // cap can only possibly be facing the camera while flipped or mid-flip
    // (see toggleFlip); resting on the front (the vast majority of every
    // session) it never can be, so there's nothing for the matrix/facing
    // math in contact.js's update() to do. Skipping it there, rather than
    // just hiding its result, avoids a continuous, pointless
    // matrix-multiply + style.transform write on a will-change:transform
    // layer every single frame the card just sits idle on the front.
    backActive: () => flipped || flipping,
    isCardSettled,
    onFocusChange: setPhysicsSuspended,
    // the form's own reserved region on the back face, in the same px
    // units the CSS-3D projection already uses — lets contact.js
    // hard-clip the form to that region instead of trusting its natural
    // content height to always stay inside it
    tabWidthPx: CARD_WIDTH * PIXELS_PER_WORLD_UNIT,
    tabHeightPx: BACK_FORM_HEIGHT * PIXELS_PER_WORLD_UNIT,
    // 1 (no shrink) initially — handleResize()'s own synchronous first
    // call, right after this, immediately corrects it via updateGeometry()
    // if a narrow viewport actually needs it smaller (see NATURAL_CARD_WIDTH_PX).
    formScale: 1
  });

  /* ---------- resize ---------- */

  let lastResizeW = 0, lastResizeH = 0;
  let resizePending = true;
  function handleResize() {
    const w = interactionRoot.clientWidth;
    const h = interactionRoot.clientHeight;
    if (!w || !h) return;
    // Skip unchanged dimensions. During motion this runs only from tick(),
    // followed by renderer.render() before the callback returns. Resizing
    // the drawing buffer from a tween/observer callback can clear a frame
    // that the browser is about to composite before the next render.
    if (w === lastResizeW && h === lastResizeH) return;
    lastResizeW = w;
    lastResizeH = h;

    // See NATURAL_CARD_WIDTH_PX's own comment: the card's on-screen size
    // is normally fixed, but a viewport too narrow to fit it at that size
    // needs it scaled down instead of left to overflow. scale is 1 (no
    // change from the fixed reference) for every viewport wide enough —
    // this only ever makes the card *smaller* than REFERENCE_CARD_PX_HEIGHT
    // implies, never bigger.
    const availableWidthPx = w - CARD_VIEWPORT_MARGIN_PX * 2;
    const scale = Math.min(1, availableWidthPx / NATURAL_CARD_WIDTH_PX);
    PIXELS_PER_WORLD_UNIT = (REFERENCE_CARD_PX_HEIGHT / BASE_CARD_HEIGHT) * scale;
    updateGuideConstants();
    positionMobileFlipGuide();

    camera.aspect = w / h;
    // hold on-screen scale constant so the résumé reveal growing
    // interactionRoot's own height — via updateHeroPadding() — never
    // itself changes how big anything already on screen appears.
    camera.position.z = h / (2 * TAN_HALF_FOV * PIXELS_PER_WORLD_UNIT);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);

    // contact.js caches a few of its own geometry figures derived from
    // this same scale (its clip region's hard px size, the form's own
    // content scale, the CSS-3D matrix's world-to-px conversion) — push
    // the current values down whenever they might have changed, same as
    // everything else in this function.
    contactForm.updateGeometry({
      pixelsPerWorldUnit: PIXELS_PER_WORLD_UNIT,
      tabWidthPx: CARD_WIDTH * PIXELS_PER_WORLD_UNIT,
      tabHeightPx: BACK_FORM_HEIGHT * PIXELS_PER_WORLD_UNIT,
      formScale: scale
    });
  }
  const resizeObserver = new ResizeObserver(() => {
    // Notification only: never clear/reallocate a displayed WebGL buffer
    // here without also drawing its replacement in the same callback.
    resizePending = true;
  });
  resizeObserver.observe(interactionRoot);
  handleResize();

  /* ---------- render loop ---------- */

  let lastTime = performance.now();
  let lastFilterStr = '';
  function tick(now) {
    // One transaction: advance the dropdown, apply layout, resize the
    // drawing buffer if needed, then render below. This also works with
    // the supplied index's timer-backed requestAnimationFrame workaround.
    advanceDropdown(now);
    if (resizePending || interactionRoot.clientWidth !== lastResizeW || interactionRoot.clientHeight !== lastResizeH) {
      handleResize();
      resizePending = false;
    }

    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Always advances (not gated on mode) — it's just an ambient phase, not
    // paused-and-resumed state. Only whether it's actually APPLIED (see
    // idleBlend below) depends on mode/hover/drag.
    idleT += dt;

    tiltVelX += (tiltTargetX - tiltX) * TILT_STIFFNESS;
    tiltVelX *= TILT_DAMPING;
    tiltX += tiltVelX;

    tiltVelY += (tiltTargetY - tiltY) * TILT_STIFFNESS;
    tiltVelY *= TILT_DAMPING;
    tiltY += tiltVelY;

    liftProgress += (liftProgressTarget - liftProgress) * 0.14;

    // idleBlend eases toward 0/1 rather than the sway/breathe amplitude
    // switching on/off outright: idleActive used to gate swayY/breathe
    // directly (idleActive ? sin(...) : 0), a hard binary snap between
    // exactly 0 and whatever the sine happened to be at that instant. Every
    // mode change back to 'idle' — most noticeably drag-release, since
    // dragging can hold mode away from 'idle' far longer than a quick
    // hover-out — could land on any phase, including one near the sine's
    // own peak, so the very next frame could jump the card's rotation/
    // position by the sway/breathe's full amplitude in a single frame: a
    // visible pop landing at the exact instant of release, independent of
    // any rendering/perf cost. Easing an amplitude multiplier in/out (same
    // pattern as liftProgress above) fades that in over several frames
    // instead of snapping it, so a stale phase no longer reads as a pop.
    const idleActive = mode === 'idle' && !hovering && !dragging && !physicsSuspended;
    idleBlend += ((idleActive ? 1 : 0) - idleBlend) * 0.1;
    const swayY = THREE.MathUtils.degToRad(4) * Math.sin(idleT * 0.5) * idleBlend;
    const breathe = Math.sin(idleT * 0.6) * 0.035 * idleBlend;

    // posY is a transient drag offset (always springs back to 0); cardLift
    // is the persistent, state-driven "parked near the top" offset for
    // when the dropdown is open, animated by openDropdown()/closeDropdown().
    // The two simply add — the card is always just a rigid translation
    // away from wherever it's resting.
    cardGroup.position.x = posX;
    cardGroup.position.y = posY + cardLift + breathe + liftProgress * 0.12;
    cardGroup.rotation.set(tiltX, flipYaw + tiltY + swayY, throwSpin);
    const scale = 1 + liftProgress * 0.035;
    cardGroup.scale.setScalar(scale);

    // filter:drop-shadow() forces the browser to re-rasterize/re-blur the
    // whole canvas element every time this string changes — a real,
    // non-trivial cost, and liftProgress's own ease (above) means the raw
    // blur/offY/alpha are ALWAYS very slightly different frame to frame,
    // for as long as it takes to fully converge (asymptotic, so
    // technically forever). Rounded to a step coarse enough to be
    // visually identical between adjacent frames but fine enough that the
    // animation still reads as smooth, so the string — and the expensive
    // work behind it — only actually changes on a fraction of frames
    // instead of every single one. This mattered most for exactly the
    // reported case: the longer a drag lasts before release, the closer
    // liftProgress gets to its max before liftProgressTarget flips back
    // to 0, so the bigger and longer the post-release decay tail — a
    // quick drag barely raises liftProgress before releasing and settles
    // almost immediately; a slow one saturates it and then has to
    // re-rasterize a large blur radius every frame for a much longer
    // settle, right around the moment of release.
    const blur = Math.round((16 + liftProgress * 12) * 2) / 2;
    const offY = Math.round((14 + liftProgress * 9) * 2) / 2;
    const alpha = Math.round((0.26 + liftProgress * 0.16) * 100) / 100;
    const filterStr = `drop-shadow(0 ${offY}px ${blur}px rgba(20,14,4,${alpha}))`;
    if (filterStr !== lastFilterStr) {
      renderer.domElement.style.filter = filterStr;
      lastFilterStr = filterStr;
    }

    renderer.render(scene, camera);
    contactForm.update();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function injectStyles() {
  if (document.getElementById('card3d-styles')) return;
  const style = document.createElement('style');
  style.id = 'card3d-styles';
  style.textContent = `
    /* -webkit-touch-callout specifically (not just user-select) is what
       actually suppresses iOS's long-press "select/copy" callout on a
       touch-and-hold — the two are separate properties, and this one has
       no standard/unprefixed equivalent. Permanent, not toggled per-
       gesture like touchAction/userSelect below (see pointerdown/up): it
       only affects selection/callout UI, never touch/scroll routing, so
       there's no equivalent to the "whole hero became a scroll dead zone"
       bug leaving this on unconditionally caused with touch-action. This
       used to be masked as a side effect of that same blanket touch-
       action:none — narrowing that down to be per-touch (see
       interactionRoot.style.touchAction's own comment) lost that side
       effect, which is what a touch-and-hold starting text selection
       during a drag actually was. */
    .card3d-container{position:relative;-webkit-touch-callout:none;-webkit-user-select:none}
    .card3d-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;overflow:visible}

    .card3d-zone{position:fixed;top:0;bottom:0;width:36vw;max-width:520px;pointer-events:none;opacity:0;transition:opacity 0.3s ease;z-index:2}
    .card3d-zone--right{right:0;background:linear-gradient(to right,rgba(var(--accent-rgb),0),rgba(var(--accent-rgb),0.16))}
    .card3d-zone--left{left:0;background:linear-gradient(to left,rgba(var(--accent-rgb),0),rgba(var(--accent-rgb),0.16))}
    .card3d-zone.is-active{opacity:1}

    .card3d-confirm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:var(--font-mono);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);text-shadow:0 0 6px rgba(var(--accent-rgb),0.5);opacity:0;pointer-events:none;transition:opacity 0.35s ease;white-space:nowrap;z-index:5}
    .card3d-confirm.is-visible{opacity:1}

    .card3d-guide{position:absolute;display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:9px;color:rgba(var(--ink-rgb),0.32);letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.25s ease;z-index:4}
    .card3d-guide-icon{display:flex;line-height:0}
    .card3d-guide--top{transform:translate(-50%,-100%);flex-direction:column-reverse;gap:4px}
    .card3d-guide--top .card3d-guide-icon.is-down{transform:rotate(180deg)}
    .card3d-guide--flip{transform:translate(-50%,0);flex-direction:column;gap:4px}
    .card3d-guide--left{transform:translate(calc(-100% - 4px),-50%)}
    .card3d-guide--right{transform:translate(calc(4px),-50%);flex-direction:row-reverse}
    .card3d-guide--right .card3d-guide-icon{transform:scaleX(-1)}
  `;
  document.head.appendChild(style);
}
