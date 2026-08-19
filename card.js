import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initContactForm } from './contact.js';
import { JOBS } from './jobs.js';

/**
 * initCard(container) builds and runs the entire 3D business-card hero.
 * Self-contained: owns the Three.js scene, all textures/materials, its own
 * injected stylesheet, and every DOM overlay. The caller only provides an
 * empty container element. Communicates outward only via a CustomEvent
 * ('resume-job-click') dispatched on the container — it never calls into
 * the host page's own code directly.
 *
 * Interactions:
 *   - hover, cursor position         -> small X/Y-axis tilt
 *   - idle (no cursor, no drag)      -> slow ambient Y-axis sway
 *   - click directly on the card (no drag) -> flip 180° between front/back;
 *                             always available regardless of whether the
 *                             dropdown tab is open on either face
 *   - click-hold-drag anywhere in the hero -> picks the card up and moves it
 *                             freely. THE CARD STAYS WHERE IT IS DROPPED —
 *                             no snap back to center. Past 65% of the way
 *                             to a screen edge, that side glows; release
 *                             there to throw the card off (vCard download
 *                             on the right, mailto on the left), after
 *                             which it flies back to wherever it was
 *                             sitting before the throw.
 *   - drag UPWARD past a threshold and release -> opens the dropdown tab
 *                             (résumé on the front, contact note on the
 *                             back); dragging up again while already open
 *                             downloads the résumé PDF instead
 *   - drag DOWNWARD past a threshold and release -> closes the dropdown
 *   - click the toggle row ("RÉSUMÉ" / "OR LEAVE A NOTE") -> same
 *                             open/close toggle. Both tabs share ONE
 *                             open/closed state, so whichever face you
 *                             land on after a flip shows its own tab
 *                             already in that same state.
 *   - click a job row on the open résumé tab -> dispatches a
 *                             'resume-job-click' CustomEvent (detail:
 *                             { jobId }) on the container; the page
 *                             decides what that means (this module never
 *                             navigates or opens anything itself for it)
 *   - click "DOWNLOAD RÉSUMÉ (PDF)" (on the open résumé tab) -> downloads
 *                             the static résumé PDF
 *
 * Geometry strategy (this is what keeps the type from warping): the card's
 * own front/back caps and the dropdown tab are each built ONCE, at one
 * fixed size, and never rebuilt or rescaled. Opening/closing the dropdown
 * only ever *moves* the tab (and lifts the card) — it never touches
 * geometry or textures, so nothing can ever resample or stretch.
 */

const CARD_WIDTH = 3.4;
const BASE_CARD_HEIGHT = 2.14;
// thin, real-cardstock feel — paper texture/detailing gets layered on top
// of this later, so the object itself has to read as thin first.
const CARD_THICKNESS = 0.026;
const CARD_RADIUS = 0.12;
const CARD_PAD_FRACTION = 0.09;
// single source of truth for the stock color — used for the card's own
// front/back faces AND both dropdown tabs, so nothing can drift apart.
const CARD_STOCK_COLOR = '#f7f0e1';

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

const CONTACT = {
  name: 'Matthew Scheffler',
  first: 'Matthew',
  last: 'Scheffler',
  title: 'Digital Strategy · E-Commerce · Content & Visual Direction',
  email: 'matthew.scheffler14@gmail.com',
  phone: '7325397388',
  phoneDisplay: '(732) 539-7388',
  url: 'mattscheff.com',
  location: 'Brooklyn, NY'
};

const RESUME_PDF_PATH = 'assets/matthew-scheffler-resume.pdf';

// Résumé/tab layout, expressed as fractions of BASE_CARD_HEIGHT measured
// down from the card's TOP edge. Landmarks derive from each other so
// there's one place to retune spacing. Everything through
// TOGGLE_BAND_BOTTOM_F is drawn on the card's own front/back faces;
// everything from ROWS_TOP_F on lives on the separate dropdown tab (see
// TAB_F_OFFSET below).
const TOGGLE_BAND_TOP_F = 0.99;
const TOGGLE_LABEL_F = 1.075;
const TOGGLE_BAND_BOTTOM_F = 1.16;
const CARD_HEIGHT = BASE_CARD_HEIGHT * TOGGLE_BAND_BOTTOM_F;

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

// TAB_F_OFFSET (= TOGGLE_BAND_BOTTOM_F) is subtracted off whenever one of
// these card-relative fractions needs to become a position on the tab's
// own canvas, whose top edge is this same offset lower down.
const TAB_F_OFFSET = TOGGLE_BAND_BOTTOM_F;
const TAB_HEIGHT = BASE_CARD_HEIGHT * (TAB_CONTENT_BOTTOM_F - TAB_F_OFFSET);

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
// BASE_CARD_HEIGHT — the unit the card's own *_F layout fractions are
// multiplied by when drawing; the tab canvas uses its own analogous scale
// (see drawTab/drawNoteTab).
const TEX_W = 1024;
const TEX_H = Math.round(TEX_W * (CARD_HEIGHT / CARD_WIDTH));
const TEX_BASE_PX = TEX_W * (BASE_CARD_HEIGHT / CARD_WIDTH);
const TAB_TEX_H = Math.round(TEX_W * (TAB_HEIGHT / CARD_WIDTH));

const FOV_DEG = 32;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(FOV_DEG) / 2);
// preserves the card's on-screen size regardless of viewport — fixed to
// BASE_CARD_HEIGHT so the page growing to reveal the dropdown never itself
// changes how big anything already on screen appears. See handleResize().
const REFERENCE_CARD_PX_HEIGHT = 366;
const PIXELS_PER_WORLD_UNIT = REFERENCE_CARD_PX_HEIGHT / BASE_CARD_HEIGHT;

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
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
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

function drawTracked(ctx, text, x, y, size, color, spacing, font) {
  ctx.font = `${font || '400'} ${size}px "DM Mono", monospace`;
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx;
}

function makeBumpTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 46;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

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

  /* ---------- textures: fixed resolution, drawn once, never rebuilt ---------- */

  const frontCanvas = document.createElement('canvas');
  const backCanvas = document.createElement('canvas');
  const tabCanvas = document.createElement('canvas');
  const noteCanvas = document.createElement('canvas');
  frontCanvas.width = backCanvas.width = tabCanvas.width = noteCanvas.width = TEX_W;
  frontCanvas.height = backCanvas.height = TEX_H;
  tabCanvas.height = noteCanvas.height = TAB_TEX_H;

  const frontTex = new THREE.CanvasTexture(frontCanvas);
  const backTex = new THREE.CanvasTexture(backCanvas);
  const tabTex = new THREE.CanvasTexture(tabCanvas);
  const noteTex = new THREE.CanvasTexture(noteCanvas);
  [frontTex, backTex, tabTex, noteTex].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  [frontTex, backTex, tabTex, noteTex].forEach(t => { t.anisotropy = maxAniso; });

  // shared toggle-row drawing for the card's own front/back faces — same
  // spot on both, toggling the same shared open/closed state.
  function drawToggleRow(ctx, w, bh, pad, label) {
    ctx.save();
    ctx.setLineDash([bh * 0.012, bh * 0.012]);
    ctx.strokeStyle = 'rgba(28,20,10,0.25)';
    ctx.lineWidth = Math.max(1, bh * 0.003);
    ctx.beginPath();
    ctx.moveTo(pad, bh * TOGGLE_BAND_TOP_F);
    ctx.lineTo(w - pad, bh * TOGGLE_BAND_TOP_F);
    ctx.stroke();
    ctx.restore();

    drawTracked(ctx, label, pad, bh * TOGGLE_LABEL_F, Math.round(bh * 0.034), 'rgba(28,20,10,0.55)', 1.3);
    ctx.save();
    ctx.font = `400 ${Math.round(bh * 0.04)}px "DM Mono", monospace`;
    ctx.fillStyle = 'rgba(28,20,10,0.55)';
    ctx.textAlign = 'center';
    ctx.translate(w - pad - bh * 0.02, bh * (TOGGLE_LABEL_F - 0.01));
    ctx.rotate(dropdownOpen ? Math.PI : 0);
    ctx.fillText('⌄', 0, 0);
    ctx.restore();
  }

  function drawFront() {
    const ctx = frontCanvas.getContext('2d');
    const w = TEX_W, h = TEX_H, bh = TEX_BASE_PX;
    const pad = w * CARD_PAD_FRACTION;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CARD_STOCK_COLOR;
    ctx.fillRect(0, 0, w, h);

    const vg = ctx.createRadialGradient(w / 2, bh / 2, bh * 0.15, w / 2, bh / 2, w * 0.65);
    vg.addColorStop(0, 'rgba(28,20,10,0)');
    vg.addColorStop(1, 'rgba(28,20,10,0.06)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, bh);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c140a';
    ctx.font = `400 ${Math.round(bh * 0.155)}px "EB Garamond", serif`;
    ctx.fillText(CONTACT.first, pad, bh * 0.42);
    ctx.fillStyle = 'rgba(28,20,10,0.55)';
    ctx.font = `italic 400 ${Math.round(bh * 0.155)}px "EB Garamond", serif`;
    ctx.fillText(CONTACT.last, pad, bh * 0.6);

    drawTracked(ctx, 'DIGITAL STRATEGY · E-COMMERCE', pad, bh * 0.75, Math.round(bh * 0.04), 'rgba(28,20,10,0.5)', 1.4);
    drawTracked(ctx, 'CONTENT & VISUAL DIRECTION', pad, bh * 0.82, Math.round(bh * 0.04), 'rgba(28,20,10,0.5)', 1.4);
    drawTracked(ctx, 'BROOKLYN, NY  ·  2026', pad, bh * 0.93, Math.round(bh * 0.036), 'rgba(28,20,10,0.32)', 1.4);

    drawToggleRow(ctx, w, bh, pad, 'RÉSUMÉ');

    applyGrain(ctx, w, h, 0.055);
    frontTex.needsUpdate = true;
  }

  function drawBack() {
    const ctx = backCanvas.getContext('2d');
    const w = TEX_W, h = TEX_H, bh = TEX_BASE_PX;
    const pad = w * CARD_PAD_FRACTION;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CARD_STOCK_COLOR;
    ctx.fillRect(0, 0, w, h);
    const vg = ctx.createRadialGradient(w / 2, bh / 2, bh * 0.15, w / 2, bh / 2, w * 0.65);
    vg.addColorStop(0, 'rgba(28,20,10,0)');
    vg.addColorStop(1, 'rgba(28,20,10,0.08)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, bh);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    drawTracked(ctx, 'CONTACT', pad, bh * 0.18, Math.round(bh * 0.04), 'rgba(28,20,10,0.4)', 3);

    const lines = [CONTACT.email, CONTACT.phoneDisplay, CONTACT.url, CONTACT.location];
    const startY = bh * 0.38;
    const lineGap = bh * 0.148;
    lines.forEach((line, i) => {
      drawTracked(ctx, line.toUpperCase(), pad, startY + i * lineGap, Math.round(bh * 0.058), '#1c140a', 1.2);
    });

    drawToggleRow(ctx, w, bh, pad, 'OR LEAVE A NOTE');

    applyGrain(ctx, w, h, 0.055);
    backTex.needsUpdate = true;
  }

  // job rows, tag cloud, and the download link — all live on the résumé
  // tab's own canvas now, rebased so its top edge is TAB_F_OFFSET.
  function drawTab() {
    const ctx = tabCanvas.getContext('2d');
    const w = TEX_W, h = TAB_TEX_H, bh = TEX_BASE_PX;
    const off = TAB_F_OFFSET;
    const pad = w * CARD_PAD_FRACTION;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CARD_STOCK_COLOR;
    ctx.fillRect(0, 0, w, h);

    JOBS.forEach((job, i) => {
      const rowTopF = ROWS_TOP_F + i * ROW_HEIGHT_F - off;
      ctx.font = `400 ${Math.round(bh * 0.052)}px "EB Garamond", serif`;
      ctx.fillStyle = 'rgba(28,20,10,0.88)';
      ctx.textAlign = 'left';
      ctx.fillText(job.name, pad, bh * (rowTopF + 0.075));

      ctx.save();
      ctx.font = `400 ${Math.round(bh * 0.027)}px "DM Mono", monospace`;
      ctx.fillStyle = 'rgba(28,20,10,0.35)';
      ctx.textAlign = 'right';
      ctx.fillText(job.dates, w - pad, bh * (rowTopF + 0.07));
      ctx.restore();

      drawTracked(ctx, job.tags.join(' · '), pad, bh * (rowTopF + 0.11), Math.round(bh * 0.023), 'rgba(28,20,10,0.35)', 1.1);

      ctx.save();
      ctx.strokeStyle = 'rgba(28,20,10,0.1)';
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
    drawTracked(ctx, line1, pad, bh * (TAGCLOUD_TOP_F - off), Math.round(bh * 0.021), 'rgba(28,20,10,0.3)', 1);
    drawTracked(ctx, line2, pad, bh * (TAGCLOUD_BOTTOM_F - off), Math.round(bh * 0.021), 'rgba(28,20,10,0.3)', 1);

    const downloadText = 'DOWNLOAD RÉSUMÉ (PDF) →';
    const downloadSize = Math.round(bh * 0.027);
    ctx.font = `400 ${downloadSize}px "DM Mono", monospace`;
    ctx.fillStyle = '#1c140a';
    ctx.textAlign = 'left';
    ctx.fillText(downloadText, pad, bh * (DOWNLOAD_LABEL_F - off));
    const underlineY = bh * (DOWNLOAD_LABEL_F - off) + downloadSize * 0.22;
    ctx.save();
    ctx.strokeStyle = 'rgba(28,20,10,0.3)';
    ctx.lineWidth = Math.max(1, bh * 0.0015);
    ctx.beginPath();
    ctx.moveTo(pad, underlineY);
    ctx.lineTo(pad + ctx.measureText(downloadText).width, underlineY);
    ctx.stroke();
    ctx.restore();

    applyGrain(ctx, w, h, 0.055);
    tabTex.needsUpdate = true;
  }

  // the note tab's own canvas stays a blank stock-color background — the
  // actual form is a real DOM overlay (contact.js) sitting on top of it,
  // so there's nothing to draw here beyond matching the card stock.
  function drawNoteTab() {
    const ctx = noteCanvas.getContext('2d');
    const w = TEX_W, h = TAB_TEX_H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CARD_STOCK_COLOR;
    ctx.fillRect(0, 0, w, h);
    applyGrain(ctx, w, h, 0.055);
    noteTex.needsUpdate = true;
  }

  const bump = makeBumpTexture();

  function cardStockMaterial(map) {
    return new THREE.MeshPhysicalMaterial({
      map,
      roughness: 0.82,
      metalness: 0,
      clearcoat: 0,
      sheen: 0.08,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(0xfff6e8),
      bumpMap: bump,
      bumpScale: 0.0018
    });
  }

  function edgeMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xe6dcc4,
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

  const frontMat = cardStockMaterial(frontTex);
  const backMat = cardStockMaterial(backTex);
  const edgeSideMat = edgeMaterial();
  const edgeCapMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  const cardShape = roundedRectShape(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);

  function remapUV(geo, w, h) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = (uv.getX(i) + w / 2) / w;
      const v = (uv.getY(i) + h / 2) / h;
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
  }

  const frontGeo = new THREE.ShapeGeometry(cardShape, 16);
  remapUV(frontGeo, CARD_WIDTH, CARD_HEIGHT);
  const frontCap = new THREE.Mesh(frontGeo, frontMat);
  frontCap.position.z = CARD_THICKNESS / 2;

  const backGeo = new THREE.ShapeGeometry(cardShape, 16);
  remapUV(backGeo, CARD_WIDTH, CARD_HEIGHT);
  const backCap = new THREE.Mesh(backGeo, backMat);
  backCap.position.z = -CARD_THICKNESS / 2;
  backCap.rotation.y = Math.PI;

  const edgeGeo = new THREE.ExtrudeGeometry(cardShape, { depth: CARD_THICKNESS, bevelEnabled: false, curveSegments: 16 });
  edgeGeo.translate(0, 0, -CARD_THICKNESS / 2);
  const edgeMesh = new THREE.Mesh(edgeGeo, [edgeCapMat, edgeSideMat]);

  const hitGeo = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS * 3);
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);

  /* ---------- tab meshes: two second, entirely separate fixed-size
     objects — one behind the front face (résumé), one behind the back
     (contact note). Neither ever scales or rebuilds; opening/closing
     either only ever *moves* it (and the card), never reshapes anything.
     Both are built by the same makeTab() so the two stay identical in
     construction; mirrored=true is the only thing that differs for the
     back one, flipping it to face the same way backCap does. ---------- */

  const tabShape = tabRoundedRectShape(CARD_WIDTH, TAB_HEIGHT, CARD_RADIUS);
  // Recessed just enough behind the card's own front face to avoid
  // z-fighting — enough that, when tucked closed, the opaque card front
  // fully occludes it, but small enough it doesn't read as a visible
  // depth step once the tab is slid out and its cap sits at the card's edge.
  const TAB_CAP_Z = CARD_THICKNESS / 2 - 0.0015;

  function makeTab(texture, mirrored) {
    const capGeo = new THREE.ShapeGeometry(tabShape, 16);
    remapUV(capGeo, CARD_WIDTH, TAB_HEIGHT);
    const cap = new THREE.Mesh(capGeo, cardStockMaterial(texture));
    cap.position.z = TAB_CAP_Z;

    const edgeGeo2 = new THREE.ExtrudeGeometry(tabShape, { depth: CARD_THICKNESS, bevelEnabled: false, curveSegments: 16 });
    edgeGeo2.translate(0, 0, TAB_CAP_Z - CARD_THICKNESS);
    const edge = new THREE.Mesh(edgeGeo2, [edgeCapMat, edgeSideMat]);

    const hitGeo2 = new THREE.BoxGeometry(CARD_WIDTH, TAB_HEIGHT, CARD_THICKNESS * 3);
    const hit = new THREE.Mesh(hitGeo2, hitMat);

    const group = new THREE.Group();
    group.add(cap, edge, hit);
    if (mirrored) group.rotation.y = Math.PI;
    group.position.y = TAB_CLOSED_LOCAL_Y;
    return { group, hit };
  }

  const { group: tabGroup, hit: tabHitMesh } = makeTab(tabTex, false);
  const { group: noteGroup } = makeTab(noteTex, true);

  // anchor for the contact form's CSS-3D panel (see contact.js):
  // positioned in the *same* unmirrored local convention as the note
  // tab's own cap, so it automatically inherits the tab's open/close
  // slide, the mirrored (back-facing) orientation, and — further up the
  // chain — the card's own drag/tilt/flip/lift transform.
  const noteAnchor = new THREE.Object3D();
  noteAnchor.position.set(0, 0, TAB_CAP_Z + 0.001);
  noteGroup.add(noteAnchor);

  const cardMesh = new THREE.Group();
  cardMesh.add(edgeMesh, frontCap, backCap, hitMesh, tabGroup, noteGroup);

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
    handleResize();
  }

  // declared ahead of the initial draw calls below since drawFront()/
  // drawBack() read this to decide which way the chevron glyph points
  let dropdownOpen = false;
  let dropdownProgress = 0; // both tabs' current, shared 0..1 slide progress
  let cardLift = 0;
  let cancelDropdownTween = null;

  drawFront();
  drawBack();
  drawTab();
  drawNoteTab();

  // regenerate all text once webfonts are confirmed loaded, for crisp type
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      drawFront();
      drawBack();
      drawTab();
    });
  }

  /* ---------- open/close: a single shared state drives both tabs at
     once, in lockstep, animating the card and both tabs' positions; the
     page grows to match. No geometry or texture is touched by any of
     this. Flipping never opens or closes anything by itself — whichever
     face you land on after a flip shows its own tab already in the same
     open/closed state, since both tabs always move together. ---------- */

  function setDropdownVisual(progress) {
    dropdownProgress = progress;
    const y = TAB_CLOSED_LOCAL_Y + (TAB_OPEN_LOCAL_Y - TAB_CLOSED_LOCAL_Y) * progress;
    tabGroup.position.y = y;
    noteGroup.position.y = y;
    cardLift = PARKED_LIFT * progress;
    updateHeroPadding(progress);
  }

  function animateDropdown(target) {
    if (cancelDropdownTween) cancelDropdownTween();
    const start = dropdownProgress;
    cancelDropdownTween = tween(500, EASE.outCubic, (v) => {
      setDropdownVisual(start + (target - start) * v);
    }, () => {
      cancelDropdownTween = null;
    });
  }

  function openDropdown() {
    if (dropdownOpen) return;
    dropdownOpen = true;
    drawFront();
    drawBack();
    animateDropdown(1);
  }

  function closeDropdown() {
    if (!dropdownOpen) return;
    dropdownOpen = false;
    drawFront();
    drawBack();
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
    return !dragging && !flipping && !cancelDropdownTween;
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
  let throwSpin = 0;
  let posX = 0, posY = 0;
  let liftProgress = 0, liftProgressTarget = 0;

  let mode = 'idle'; // idle | dragging | thrown | returning
  let dragOriginClientX = 0, dragOriginClientY = 0;
  let dragStartX = 0, dragStartY = 0;
  let lastDragProgress = 0;

  let isPointerDown = false;
  let potentialDrag = false;
  let dragging = false;
  let pointerDownClient = null;
  let pointerDownTime = 0;
  let pointerDownOnCard = false;
  const DRAG_THRESHOLD = 6;

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
    // the note tab has no click target of its own (it's a real DOM form,
    // not canvas-drawn) — only the résumé tab's own hit region needs a
    // hit test, and only when the front face is actually the one showing.
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

    // the toggle row sits at the same spot on both faces and toggles the
    // same shared open/closed state regardless of which one you click
    if (frac !== null && frac >= TOGGLE_BAND_TOP_F && frac <= TOGGLE_BAND_BOTTOM_F) {
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

    // a click that missed both the card's own hitbox and (when applicable)
    // the tab's job rows/download link didn't land on anything clickable
    if (frac === null) return;

    // flipping stays available no matter what's open — the open/closed
    // state itself is shared between both faces, but which face is
    // currently showing can always be changed by clicking the card body
    toggleFlip();
  }

  /* ---------- pointer handling: click-on-card = flip/toggle, drag-anywhere = move/throw ---------- */

  interactionRoot.style.touchAction = 'none';
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
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) updateHoverTilt(e.clientX, e.clientY);

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
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD && dt < 600) {
        handleCardClick(e.clientX, e.clientY);
      }
    }
    isPointerDown = false;
    potentialDrag = false;
  });

  interactionRoot.addEventListener('pointerleave', () => {
    hovering = false;
    tiltTargetX = 0;
    tiltTargetY = 0;
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
    if (flipping || dragging || mode !== 'idle') return;
    flipping = true;
    const from = flipYaw;
    const to = flipYaw + Math.PI;
    flipped = !flipped;
    tween(400, EASE.flipApex, (v) => {
      flipYaw = from + (to - from) * v;
    }, () => {
      flipYaw = to;
      flipping = false;
    });
  }

  /* ---------- drag to throw ---------- */

  function beginDrag(clientX, clientY) {
    dragging = true;
    hovering = false;
    mode = 'dragging';
    dragOriginClientX = clientX;
    dragOriginClientY = clientY;
    dragStartX = posX;
    dragStartY = posY;
    lastDragProgress = 0;
    liftProgressTarget = 1;
    document.body.style.cursor = 'grabbing';
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

    const activeRight = lastDragProgress > 0.65;
    const activeLeft = lastDragProgress < -0.65;
    zoneRight.classList.remove('is-active');
    zoneLeft.classList.remove('is-active');

    if (activeRight) { throwCard('right'); return; }
    if (activeLeft) { throwCard('left'); return; }

    // The card keeps whatever position it was released at — no snap back
    // to center. Open/close is judged on how far THIS drag travelled, so
    // a card already parked near the top doesn't re-trigger on every nudge.
    mode = 'idle';
    const worldH = worldHeightAtZ(0);
    const travelY = posY - dragStartY;

    if (travelY > worldH * DRAG_UP_THRESHOLD_FRACTION) {
      if (dropdownOpen) downloadResumePdf(); else openDropdown();
    } else if (travelY < -worldH * DRAG_DOWN_THRESHOLD_FRACTION) {
      closeDropdown();
    }
  }

  function throwCard(direction) {
    mode = 'thrown';
    const sign = direction === 'right' ? 1 : -1;
    const worldW = worldWidthAtZ(0);
    const offX = sign * worldW * 0.85;
    // where the card lives when it isn't mid-throw — it returns here, not
    // to the center of the screen.
    const homeX = posX;
    const homeY = posY;

    if (direction === 'right') {
      downloadVCard();
      showConfirmation('contact saved');
    } else {
      openMailto();
      showConfirmation('composing…');
    }

    tween(340, EASE.inCubic, (v) => {
      posX = homeX + (offX - homeX) * v;
      throwSpin = sign * THREE.MathUtils.degToRad(18) * v;
    }, () => {
      posX = offX;
      setTimeout(() => {
        mode = 'returning';
        const startX = posX;
        tween(480, EASE.outCubic, (v) => {
          posX = startX + (homeX - startX) * v;
          posY = homeY;
          throwSpin = sign * THREE.MathUtils.degToRad(18) * (1 - v);
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
      `TEL:${CONTACT.phone}`,
      `URL:${CONTACT.url}`,
      `ADR:;;${CONTACT.location};;;;`,
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

  /* ---------- DOM overlays: drop zones, confirmation, scroll cue ---------- */

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

  const scrollEl = document.createElement('div');
  scrollEl.className = 'card3d-scroll';
  scrollEl.textContent = 'scroll';
  container.appendChild(scrollEl);
  function onFirstScroll() {
    scrollEl.classList.add('is-hidden');
    window.removeEventListener('scroll', onFirstScroll);
  }
  window.addEventListener('scroll', onFirstScroll, { passive: true });

  /* ---------- contact form (back-face note tab) ---------- */

  const contactForm = initContactForm({
    THREE,
    // canvasEl + these two fixed constants replace passing the mutable
    // `camera` object directly — see contact.js's own doc comment for why
    // reading position off the live camera was the actual source of the
    // panel drifting away from the card after a resize
    canvasEl: renderer.domElement,
    pixelsPerWorldUnit: PIXELS_PER_WORLD_UNIT,
    invTanHalfFov: 1 / TAN_HALF_FOV,
    anchor: noteAnchor,
    hostEl: interactionRoot,
    fallbackEmail: CONTACT.email,
    // driven directly off the same progress moving the tab itself, so the
    // form fades in/out in exact lockstep with the drawer sliding rather
    // than lagging behind on its own timer
    progress: () => (flipped && !flipping) ? dropdownProgress : 0,
    isCardSettled,
    onFocusChange: setPhysicsSuspended,
    // the note tab's true footprint, in the same px units the CSS-3D
    // projection already uses — lets contact.js hard-clip the form to the
    // tab's own real size instead of trusting its natural content height
    // to always stay inside it
    tabWidthPx: CARD_WIDTH * PIXELS_PER_WORLD_UNIT,
    tabHeightPx: TAB_HEIGHT * PIXELS_PER_WORLD_UNIT
  });

  /* ---------- resize ---------- */

  let lastResizeW = 0, lastResizeH = 0;
  function handleResize() {
    const w = interactionRoot.clientWidth;
    const h = interactionRoot.clientHeight;
    if (!w || !h) return;
    lastResizeW = w;
    lastResizeH = h;
    camera.aspect = w / h;
    // hold on-screen scale constant so the résumé reveal growing
    // interactionRoot's own height — via updateHeroPadding() — never
    // itself changes how big anything already on screen appears.
    camera.position.z = h / (2 * TAN_HALF_FOV * PIXELS_PER_WORLD_UNIT);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(interactionRoot);
  handleResize();

  /* ---------- render loop ---------- */

  let lastTime = performance.now();
  function tick(now) {
    // ResizeObserver notifications are delivered *after* this frame's own
    // requestAnimationFrame callbacks (per spec) — so mid-resize, the
    // canvas's on-screen CSS box can already reflect the new size while
    // camera.aspect/position.z (only touched inside handleResize()) are
    // still one or more frames stale. That's invisible on the card itself
    // (its box just follows CSS either way), but contact.js's panel used
    // to project its position off this same camera every frame — so for
    // however long the camera lagged, the panel would visibly drift from
    // the card. Position no longer depends on the camera at all (see
    // contact.js), but this check stays cheap insurance for the WebGL
    // render itself never lagging a resize by more than zero frames.
    if (interactionRoot.clientWidth !== lastResizeW || interactionRoot.clientHeight !== lastResizeH) {
      handleResize();
    }

    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (mode === 'idle') idleT += dt;

    tiltVelX += (tiltTargetX - tiltX) * TILT_STIFFNESS;
    tiltVelX *= TILT_DAMPING;
    tiltX += tiltVelX;

    tiltVelY += (tiltTargetY - tiltY) * TILT_STIFFNESS;
    tiltVelY *= TILT_DAMPING;
    tiltY += tiltVelY;

    liftProgress += (liftProgressTarget - liftProgress) * 0.14;

    const idleActive = mode === 'idle' && !hovering && !dragging && !physicsSuspended;
    const swayY = idleActive ? THREE.MathUtils.degToRad(4) * Math.sin(idleT * 0.5) : 0;
    const breathe = idleActive ? Math.sin(idleT * 0.6) * 0.035 : 0;

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

    const blur = 16 + liftProgress * 12;
    const offY = 14 + liftProgress * 9;
    const alpha = 0.26 + liftProgress * 0.16;
    renderer.domElement.style.filter = `drop-shadow(0 ${offY}px ${blur}px rgba(20,14,4,${alpha.toFixed(3)}))`;

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
    .card3d-container{position:relative}
    .card3d-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;overflow:visible}

    .card3d-zone{position:fixed;top:0;bottom:0;width:36vw;max-width:520px;pointer-events:none;opacity:0;transition:opacity 0.3s ease;z-index:2}
    .card3d-zone--right{right:0;background:linear-gradient(to right,rgba(244,129,31,0),rgba(244,129,31,0.16))}
    .card3d-zone--left{left:0;background:linear-gradient(to left,rgba(244,129,31,0),rgba(244,129,31,0.16))}
    .card3d-zone.is-active{opacity:1}

    .card3d-confirm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#F4811F;text-shadow:0 0 6px rgba(244,129,31,0.5);opacity:0;pointer-events:none;transition:opacity 0.35s ease;white-space:nowrap;z-index:5}
    .card3d-confirm.is-visible{opacity:1}

    .card3d-scroll{position:absolute;left:50%;bottom:0;transform:translateX(-50%);font-family:'DM Mono',monospace;font-size:9px;color:rgba(28,20,10,0.25);letter-spacing:0.1em;text-transform:uppercase;transition:opacity 0.4s ease;z-index:4}
    .card3d-scroll.is-hidden{opacity:0}
  `;
  document.head.appendChild(style);
}
