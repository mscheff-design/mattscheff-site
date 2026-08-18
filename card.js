import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * initCard(container) builds and runs the entire 3D business-card hero,
 * including its résumé reveal. Self-contained: owns the Three.js scene,
 * all textures/materials, its own injected stylesheet, and every DOM
 * overlay (confirmation text, scroll cue). The caller only provides an
 * empty container element.
 *
 * Interactions:
 *   - hover, horizontal cursor position -> small Y-axis tilt (same scale as
 *                             the vertical tilt below), just a subtle turn
 *                             toward the cursor
 *   - hover, vertical cursor position   -> small X-axis tilt, card angles
 *                             toward/away from the viewer
 *   - click directly on the card (no drag) -> flip 180° between front/back,
 *                             unless the résumé is open (see below)
 *   - idle (no cursor, no drag)         -> slow ambient Y-axis sway
 *   - click-hold-drag anywhere in the hero -> picks the card up and moves
 *                             it freely in X and Y, following the cursor;
 *                             past 65% of the way to a screen edge, that
 *                             side of the page glows to signal the drop
 *                             zone is active; release there to throw the
 *                             card off (vCard download on the right,
 *                             mailto on the left); released after enough
 *                             upward travel instead opens the résumé
 *                             (released after enough downward travel
 *                             closes it); otherwise it springs back to
 *                             wherever it's currently resting (center when
 *                             closed, parked-near-the-top when open)
 *   - click the "RÉSUMÉ" row (drawn on the card, just below the bio) ->
 *                             the card itself never changes size or shape —
 *                             it's a fixed, single physical object, drawn
 *                             once and never redrawn or rebuilt while
 *                             animating, so it can't warp. Opening the
 *                             résumé instead animates two independent,
 *                             separate objects simultaneously: the card
 *                             (a rigid body) slides up toward the top of
 *                             the page, while a second, entirely separate
 *                             "résumé tab" object — its own fixed-size
 *                             mesh and texture, carrying the job rows/tag
 *                             cloud/download link — slides out from behind
 *                             the card's bottom edge. The surrounding page
 *                             grows in lockstep (the hero section's bottom
 *                             padding grows with the reveal) so nothing
 *                             below gets overlapped. Click the row again to
 *                             close.
 *   - click "DOWNLOAD RÉSUMÉ (PDF)" (visible once the tab is open) ->
 *                             downloads the static résumé PDF
 */

const CARD_WIDTH = 3.4;
const BASE_CARD_HEIGHT = 2.14;
const CARD_THICKNESS = 0.055;
const CARD_RADIUS = 0.12;

// The card is a single fixed physical object — this is its one and only
// height, forever. It is never resized, never rebuilt, never redrawn on a
// timer; that per-frame reshaping is exactly what used to warp the text.
const TOGGLE_BAND_TOP_F = 0.99;
const TOGGLE_LABEL_F = 1.075;
const TOGGLE_BAND_BOTTOM_F = 1.16;
const CARD_HEIGHT = BASE_CARD_HEIGHT * TOGGLE_BAND_BOTTOM_F;

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

// Same rounded-rect, but only the bottom two corners are rounded and the
// top edge is a plain straight line — so when the résumé tab is slid all
// the way out (its top edge flush against the card's bottom edge) the two
// objects read as one continuous card, matching the card's own corner
// radius only where a new outer edge is actually created.
function bottomRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x, y + h);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h);
  shape.lineTo(x, y + h);
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

const JOBS = [
  { name: 'Urban Architecture Inc.', dates: '2022 – Present', tags: 'DIGITAL STRATEGY · E-COMMERCE · CONTENT' },
  { name: 'Bernard Figueroa Studio', dates: '2025 – Present', tags: 'PHOTOGRAPHY · SOCIAL · EMAIL' },
  { name: 'STATMASK', dates: '2020 – 2022', tags: 'PRODUCT PHOTOGRAPHY · PAID SOCIAL · E-COMMERCE' },
  { name: 'Contributor Development Partnership', dates: '2023', tags: 'TRAINING · CRM · DOCUMENTATION' }
];
const TAGCLOUD_LINE_1 = 'STRATEGY · WEB · CONTENT · PHOTOGRAPHY · SOCIAL';
const TAGCLOUD_LINE_2 = 'EMAIL · PAID SOCIAL · E-COMMERCE · TRAINING · CRM';
const RESUME_PDF_PATH = 'assets/matthew-scheffler-resume.pdf';

// Résumé-tab layout, expressed as fractions of BASE_CARD_HEIGHT measured
// from the CARD's top edge (so these compose with TOGGLE_BAND_* above) —
// kept in that space purely so the spacing constants read the same way
// they always have. TAB_F_OFFSET (= TOGGLE_BAND_BOTTOM_F) is subtracted
// off whenever one of these needs to become a position *on the tab's own
// canvas*, whose top edge is this same offset lower down.
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

const TAB_F_OFFSET = TOGGLE_BAND_BOTTOM_F;
// The tab's own fixed height — built once, never resized.
const TAB_HEIGHT = BASE_CARD_HEIGHT * (TAB_CONTENT_BOTTOM_F - TAB_F_OFFSET);

// Where things rest, in local Y (card-space) — all fixed constants, none of
// them ever recomputed from a "current" size:
const CARD_BOTTOM_LOCAL_Y = -CARD_HEIGHT / 2;
// tucked fully behind the card's own body, hidden by its opaque front face
const TAB_CLOSED_LOCAL_Y = CARD_BOTTOM_LOCAL_Y + TAB_HEIGHT / 2;
// slid out, top edge flush against the card's bottom edge
const TAB_OPEN_LOCAL_Y = CARD_BOTTOM_LOCAL_Y - TAB_HEIGHT / 2;

// How far the card itself rises toward the top of the page when the résumé
// opens (world units) — the rest of the tab's height is made up by the
// page growing (see PAGE_GROWTH_WORLD / updateHeroPadding).
const PARKED_LIFT = TAB_HEIGHT * 0.6;
const PAGE_GROWTH_WORLD = TAB_HEIGHT - PARKED_LIFT;

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

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function applyGrain(ctx, w, h, amount) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = clamp255(d[i] + n);
    d[i + 1] = clamp255(d[i + 1] + n);
    d[i + 2] = clamp255(d[i + 2] + n * 0.9);
  }
  ctx.putImageData(imgData, 0, 0);
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

const FOV_DEG = 32;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(FOV_DEG) / 2);
// preserves the card's original on-screen size (from when the canvas was
// confined to the small hero container) now that the canvas covers the
// full hero section instead. Fixed to BASE_CARD_HEIGHT so the résumé
// reveal growing the page never itself changes how big anything already
// on screen appears — see handleResize().
const REFERENCE_CARD_PX_HEIGHT = 366;
const PIXELS_PER_WORLD_UNIT = REFERENCE_CARD_PX_HEIGHT / BASE_CARD_HEIGHT;

// how far (as a fraction of viewport height) a drag-release must travel,
// up or down, before it opens/closes the résumé the same way clicking the
// toggle row does.
const DRAG_UP_THRESHOLD_FRACTION = 0.16;
const DRAG_DOWN_THRESHOLD_FRACTION = 0.12;

export function initCard(container) {
  injectStyles();

  // the canvas must cover the whole hero section — not just the small
  // container box the DOM overlays live in — so the card has room to be
  // dragged/thrown anywhere on screen without hitting a bounding-box edge.
  // Every ancestor up to <html> is also forced to overflow:visible so none
  // of them can clip it either.
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

  /* ---------- card textures (drawn once; redrawn only twice per résumé
     toggle, to swap the chevron glyph — never resized, never touched on a
     per-frame basis) ---------- */

  const frontCanvas = document.createElement('canvas');
  const backCanvas = document.createElement('canvas');
  const frontTex = new THREE.CanvasTexture(frontCanvas);
  const backTex = new THREE.CanvasTexture(backCanvas);
  frontTex.colorSpace = backTex.colorSpace = THREE.SRGBColorSpace;

  function sizeCanvas(canvas, aspectW, aspectH) {
    const w = 1024;
    const h = Math.round(w * (aspectH / aspectW));
    canvas.width = w;
    canvas.height = h;
    return canvas.getContext('2d');
  }

  function drawFront() {
    const ctx = sizeCanvas(frontCanvas, CARD_WIDTH, CARD_HEIGHT);
    const w = frontCanvas.width, h = frontCanvas.height;
    const bh = h; // the card's own canvas is always exactly CARD_HEIGHT tall
    const pad = w * 0.09;

    ctx.fillStyle = '#f7f0e1';
    ctx.fillRect(0, 0, w, h);
    const vg = ctx.createRadialGradient(w / 2, bh / 2, bh * 0.15, w / 2, bh / 2, w * 0.65);
    vg.addColorStop(0, 'rgba(28,20,10,0)');
    vg.addColorStop(1, 'rgba(28,20,10,0.06)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, bh);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1c140a';
    ctx.font = `400 ${Math.round(bh * 0.135)}px "EB Garamond", serif`;
    ctx.fillText(CONTACT.first, pad, bh * 0.365);
    ctx.fillStyle = 'rgba(28,20,10,0.55)';
    ctx.font = `italic 400 ${Math.round(bh * 0.135)}px "EB Garamond", serif`;
    ctx.fillText(CONTACT.last, pad, bh * 0.52);

    drawTracked(ctx, 'DIGITAL STRATEGY · E-COMMERCE', pad, bh * 0.655, Math.round(bh * 0.035), 'rgba(28,20,10,0.5)', 1.4);
    drawTracked(ctx, 'CONTENT & VISUAL DIRECTION', pad, bh * 0.715, Math.round(bh * 0.035), 'rgba(28,20,10,0.5)', 1.4);
    drawTracked(ctx, 'BROOKLYN, NY  ·  2026', pad, bh * 0.81, Math.round(bh * 0.031), 'rgba(28,20,10,0.32)', 1.4);

    // dashed divider
    ctx.save();
    ctx.setLineDash([bh * 0.012, bh * 0.012]);
    ctx.strokeStyle = 'rgba(28,20,10,0.25)';
    ctx.lineWidth = Math.max(1, bh * 0.003);
    ctx.beginPath();
    ctx.moveTo(pad, bh * (TOGGLE_BAND_TOP_F / TOGGLE_BAND_BOTTOM_F));
    ctx.lineTo(w - pad, bh * (TOGGLE_BAND_TOP_F / TOGGLE_BAND_BOTTOM_F));
    ctx.stroke();
    ctx.restore();

    // toggle row: label + chevron. The chevron's orientation is baked in
    // directly (0° closed, 180° open) — this redraw happens exactly once
    // per open/close, not continuously, so there's no per-frame texture
    // churn and nothing here can ever warp the card's own fixed geometry.
    const labelYF = TOGGLE_LABEL_F / TOGGLE_BAND_BOTTOM_F;
    drawTracked(ctx, 'RÉSUMÉ', pad, bh * labelYF, Math.round(bh * 0.03), 'rgba(28,20,10,0.55)', 1.3);
    ctx.save();
    ctx.font = `400 ${Math.round(bh * 0.035)}px "DM Mono", monospace`;
    ctx.fillStyle = 'rgba(28,20,10,0.55)';
    ctx.textAlign = 'center';
    ctx.translate(w - pad - bh * 0.017, bh * (labelYF - 0.009));
    ctx.rotate(resumeOpen ? Math.PI : 0);
    ctx.fillText('⌄', 0, 0);
    ctx.restore();

    applyGrain(ctx, w, h, 6);
    frontTex.needsUpdate = true;
  }

  function drawBack() {
    const ctx = sizeCanvas(backCanvas, CARD_WIDTH, CARD_HEIGHT);
    const w = backCanvas.width, h = backCanvas.height;
    const bh = h;
    ctx.fillStyle = '#efe4cd';
    ctx.fillRect(0, 0, w, h);
    const vg = ctx.createRadialGradient(w / 2, bh / 2, bh * 0.15, w / 2, bh / 2, w * 0.65);
    vg.addColorStop(0, 'rgba(28,20,10,0)');
    vg.addColorStop(1, 'rgba(28,20,10,0.08)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, bh);

    const pad = w * 0.09;
    drawTracked(ctx, 'CONTACT', pad, bh * 0.14, Math.round(bh * 0.032), 'rgba(28,20,10,0.4)', 3);

    const lines = [CONTACT.email, CONTACT.phoneDisplay, CONTACT.url, CONTACT.location];
    const startY = bh * 0.32;
    const lineGap = bh * 0.13;
    lines.forEach((line, i) => {
      drawTracked(ctx, line.toUpperCase(), pad, startY + i * lineGap, Math.round(bh * 0.05), '#1c140a', 1.2);
    });

    applyGrain(ctx, w, h, 6);
    backTex.needsUpdate = true;
  }

  /* ---------- résumé tab texture (own canvas, own fixed size — drawn
     once, never resized) ---------- */

  const tabCanvas = document.createElement('canvas');
  const tabTex = new THREE.CanvasTexture(tabCanvas);
  tabTex.colorSpace = THREE.SRGBColorSpace;

  function drawTab() {
    const ctx = sizeCanvas(tabCanvas, CARD_WIDTH, TAB_HEIGHT);
    const w = tabCanvas.width, h = tabCanvas.height;
    const bh = h / (TAB_CONTENT_BOTTOM_F - TAB_F_OFFSET); // same px-per-fraction scale as the card's own canvas
    const pad = w * 0.09;
    const off = TAB_F_OFFSET; // rebases the card-relative *_F constants onto the tab's own top edge

    ctx.fillStyle = '#f7f0e1';
    ctx.fillRect(0, 0, w, h);

    // job rows
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

      drawTracked(ctx, job.tags, pad, bh * (rowTopF + 0.11), Math.round(bh * 0.023), 'rgba(28,20,10,0.35)', 1.1);

      ctx.save();
      ctx.strokeStyle = 'rgba(28,20,10,0.1)';
      ctx.lineWidth = Math.max(1, bh * 0.0015);
      ctx.beginPath();
      ctx.moveTo(pad, bh * (rowTopF + ROW_HEIGHT_F - 0.02));
      ctx.lineTo(w - pad, bh * (rowTopF + ROW_HEIGHT_F - 0.02));
      ctx.stroke();
      ctx.restore();
    });

    // tag cloud
    drawTracked(ctx, TAGCLOUD_LINE_1, pad, bh * (TAGCLOUD_TOP_F - off), Math.round(bh * 0.021), 'rgba(28,20,10,0.3)', 1);
    drawTracked(ctx, TAGCLOUD_LINE_2, pad, bh * (TAGCLOUD_BOTTOM_F - off), Math.round(bh * 0.021), 'rgba(28,20,10,0.3)', 1);

    // download link, with a manual underline (canvas has no text-decoration)
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

    applyGrain(ctx, w, h, 6);
    tabTex.needsUpdate = true;
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

  // ShapeGeometry's default UVs are raw shape-space coordinates, not
  // normalized to 0..1 (unlike BoxGeometry's faces) — remap them to the
  // shape's own bounding box ourselves.
  function remapUV(geo, w, h) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = (uv.getX(i) + w / 2) / w;
      const v = (uv.getY(i) + h / 2) / h;
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
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

  /* ---------- résumé tab mesh: a second, entirely separate fixed-size
     object. It never scales or rebuilds either — opening/closing the
     résumé only ever *moves* it (and the card), never reshapes either
     one. ---------- */

  const tabMat = cardStockMaterial(tabTex);
  const tabShape = bottomRoundedRectShape(CARD_WIDTH, TAB_HEIGHT, CARD_RADIUS);

  const tabFrontGeo = new THREE.ShapeGeometry(tabShape, 16);
  remapUV(tabFrontGeo, CARD_WIDTH, TAB_HEIGHT);
  const tabFrontCap = new THREE.Mesh(tabFrontGeo, tabMat);
  // recessed slightly behind the card's own front face so that, when
  // tucked closed, the opaque card front fully occludes it
  tabFrontCap.position.z = CARD_THICKNESS / 2 - 0.01;

  const tabEdgeGeo = new THREE.ExtrudeGeometry(tabShape, { depth: CARD_THICKNESS, bevelEnabled: false, curveSegments: 16 });
  tabEdgeGeo.translate(0, 0, tabFrontCap.position.z - CARD_THICKNESS);
  const tabEdgeMesh = new THREE.Mesh(tabEdgeGeo, [edgeCapMat, edgeSideMat]);

  const tabHitGeo = new THREE.BoxGeometry(CARD_WIDTH, TAB_HEIGHT, CARD_THICKNESS * 3);
  const tabHitMesh = new THREE.Mesh(tabHitGeo, hitMat);

  const tabGroup = new THREE.Group();
  tabGroup.add(tabFrontCap, tabEdgeMesh, tabHitMesh);
  tabGroup.position.y = TAB_CLOSED_LOCAL_Y;

  const cardMesh = new THREE.Group();
  cardMesh.add(edgeMesh, frontCap, backCap, hitMesh, tabGroup);

  const cardGroup = new THREE.Group();
  cardGroup.add(cardMesh);
  scene.add(cardGroup);

  // declared ahead of the initial draw calls below since drawFront() reads
  // it to decide which way the chevron glyph points
  let resumeOpen = false;
  let cardLift = 0;
  let cancelResumeTween = null;

  drawFront();
  drawBack();
  drawTab();

  // regenerate all text once webfonts are confirmed loaded, for crisp type
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      drawFront();
      drawBack();
      drawTab();
    });
  }

  /* ---------- résumé open/close: the card and the tab each animate their
     own position in lockstep, driven by one shared progress value; the
     page grows to match. No geometry or texture is touched by any of
     this. ---------- */

  function setResumeVisual(progress) {
    cardLift = PARKED_LIFT * progress;
    tabGroup.position.y = TAB_CLOSED_LOCAL_Y + (TAB_OPEN_LOCAL_Y - TAB_CLOSED_LOCAL_Y) * progress;
    updateHeroPadding(progress);
  }

  function animateResume(target) {
    if (cancelResumeTween) cancelResumeTween();
    const start = (cardLift / PARKED_LIFT) || 0;
    cancelResumeTween = tween(500, EASE.outCubic, (v) => {
      setResumeVisual(start + (target - start) * v);
    }, () => {
      cancelResumeTween = null;
    });
  }

  function expandResume() {
    if (resumeOpen) return;
    resumeOpen = true;
    drawFront();
    animateResume(1);
  }

  function collapseResume() {
    if (!resumeOpen) return;
    resumeOpen = false;
    drawFront();
    animateResume(0);
  }

  function downloadResumePdf() {
    const a = document.createElement('a');
    a.href = RESUME_PDF_PATH;
    a.download = 'matthew-scheffler-resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  let basePaddingBottomPx = null;

  function updateHeroPadding(progress) {
    if (basePaddingBottomPx === null) {
      basePaddingBottomPx = parseFloat(getComputedStyle(interactionRoot).paddingBottom) || 0;
    }
    const growthPx = PAGE_GROWTH_WORLD * progress * PIXELS_PER_WORLD_UNIT;
    interactionRoot.style.paddingBottom = (basePaddingBottomPx + growthPx) + 'px';
    // padding-only growth doesn't change interactionRoot's content-box
    // size, so a ResizeObserver watching that (the default) never fires
    // for it — handleResize() is called directly instead, every frame of
    // the reveal, to keep the camera/renderer in sync with the growing
    // section.
    handleResize();
  }

  /* ---------- interaction state ---------- */

  // hover tilt: vertical -> X, horizontal -> Y, same small-angle spring for both
  let tiltX = 0, tiltTargetX = 0, tiltVelX = 0;
  let tiltY = 0, tiltTargetY = 0, tiltVelY = 0;
  const TILT_MAX = THREE.MathUtils.degToRad(12);
  const TILT_STIFFNESS = 0.09;
  const TILT_DAMPING = 0.8;
  let hovering = false; // cursor currently within interactionRoot (and not dragging)

  // click-to-flip
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
    if (resumeOpen) return raycaster.intersectObject(tabHitMesh, false).length > 0;
    return false;
  }

  // returns how far down the click landed, as a fraction of BASE_CARD_HEIGHT
  // from the card's top edge (matching the *_F layout constants above), or
  // null if the click missed the card entirely.
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
    const frac = hitFractionFromTop(clientX, clientY);
    if (frac !== null) {
      if (frac >= TOGGLE_BAND_TOP_F && frac <= TOGGLE_BAND_BOTTOM_F) {
        if (resumeOpen) collapseResume(); else expandResume();
        return;
      }
      if (!resumeOpen) {
        toggleFlip();
        return;
      }
    }
    if (resumeOpen) {
      const tfrac = tabHitFractionFromTop(clientX, clientY);
      if (tfrac !== null && tfrac >= DOWNLOAD_BAND_TOP_F && tfrac <= DOWNLOAD_BAND_BOTTOM_F) {
        downloadResumePdf();
      }
    }
  }

  /* ---------- pointer handling: click-on-card = flip/toggle, drag-anywhere = move/throw ---------- */

  interactionRoot.style.touchAction = 'none';
  document.body.style.cursor = 'grab';

  interactionRoot.addEventListener('pointerdown', (e) => {
    if (mode !== 'idle' || flipping) return;
    if (e.target.closest && e.target.closest('a, button')) return;
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
    if (e.key === 'Escape' && resumeOpen) collapseResume();
  });

  /* ---------- hover: vertical -> X tilt, horizontal -> Y tilt (small angle, both axes) ---------- */

  function updateHoverTilt(clientX, clientY) {
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
    liftProgressTarget = 1;
    document.body.style.cursor = 'grabbing';
  }

  function updateDrag(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const worldW = worldWidthAtZ(0);
    const worldH = worldHeightAtZ(0);
    posX = dragStartX + (clientX - dragOriginClientX) * (worldW / rect.width);
    // screen Y grows downward, world Y grows upward
    posY = dragStartY - (clientY - dragOriginClientY) * (worldH / rect.height);

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

    if (activeRight) {
      throwCard('right');
      return;
    } else if (activeLeft) {
      throwCard('left');
      return;
    }

    // The card only ever moves as a rigid body — dragging never changes
    // its shape. posY here is purely the transient hand-off-center offset
    // from wherever it's currently resting; it always springs back to 0
    // below. The résumé's own open/closed "parked" offset lives entirely
    // in cardLift, animated separately by expandResume()/collapseResume(),
    // which is what actually moves the card toward the top of the page.
    const worldH = worldHeightAtZ(0);
    const dragDeltaY = posY - dragStartY;
    if (dragDeltaY > worldH * DRAG_UP_THRESHOLD_FRACTION) {
      if (resumeOpen) downloadResumePdf(); else expandResume();
    } else if (dragDeltaY < -worldH * DRAG_DOWN_THRESHOLD_FRACTION) {
      collapseResume();
    }

    mode = 'returning';
    const startX = posX, startY = posY;
    tween(360, EASE.outCubic, (v) => {
      posX = startX * (1 - v);
      posY = startY * (1 - v);
    }, () => {
      posX = 0;
      posY = 0;
      mode = 'idle';
    });
  }

  function throwCard(direction) {
    mode = 'thrown';
    const sign = direction === 'right' ? 1 : -1;
    const worldW = worldWidthAtZ(0);
    const offX = sign * worldW * 0.85;
    const startX = posX;
    const startY = posY;

    if (direction === 'right') {
      downloadVCard();
      showConfirmation('contact saved');
    } else {
      openMailto();
      showConfirmation('composing…');
    }

    tween(340, EASE.inCubic, (v) => {
      posX = startX + (offX - startX) * v;
      posY = startY * (1 - v);
      throwSpin = sign * THREE.MathUtils.degToRad(18) * v;
    }, () => {
      posX = offX;
      posY = 0;
      setTimeout(() => {
        mode = 'returning';
        tween(480, EASE.outCubic, (v) => {
          posX = offX * (1 - v);
          throwSpin = sign * THREE.MathUtils.degToRad(18) * (1 - v);
        }, () => {
          posX = 0;
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

  /* ---------- resize ---------- */

  function handleResize() {
    const w = interactionRoot.clientWidth;
    const h = interactionRoot.clientHeight;
    if (!w || !h) return;
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

    const idleActive = mode === 'idle' && !hovering && !dragging;
    const swayY = idleActive ? THREE.MathUtils.degToRad(4) * Math.sin(idleT * 0.5) : 0;
    const breathe = idleActive ? Math.sin(idleT * 0.6) * 0.035 : 0;

    // posY is a transient drag offset (always springs back to 0); cardLift
    // is the persistent, state-driven "parked near the top" offset for
    // when the résumé is open, animated by expandResume()/collapseResume().
    // The two simply add — the card is always just a rigid translation
    // away from wherever it's currently resting.
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
