/** Passive, bounded crayon marks. Mount underneath the existing card renderer. */
// Separate from the `fine`/`motion` media queries checked per-instance
// below — those gate the INTERACTIVE hover-drawing feature (which
// genuinely doesn't apply on touch), whereas this gates the one-time
// authored doodle that exists BECAUSE
// touch has no hover to draw with. Same (pointer: coarse) convention
// card.js/blocks.js already use elsewhere in this codebase.
const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
export const CRAYON_COLORS = ['#df4931', '#2850ac', '#dcb719', '#1f7a54'];
export const CRAYON_DEFAULTS = {
  width: 17, opacity: .46, gestureThreshold: 12, drawLength: 400, gapLength: 0,
  // densityLimit is in "stamps added" per 48px cell — a single straight
  // pass through a cell alone adds roughly 30-40 (cell width / the ~1.7px
  // stamp spacing), so the old value of 70 left almost no room for a
  // shape that doubles back on itself (a heart, a loop retraced) before
  // hitting the cap. Raised well past what ordinary expressive doodling
  // needs; it's still there as a backstop against literally circling the
  // same spot indefinitely.
  holdSeconds: 24, fadeSeconds: 32, maxStamps: 1800, densityLimit: 400,
  // Separate from holdSeconds/fadeSeconds above, which are tuned for the
  // desktop interactive hover-drawn strokes' own much slower fade-out. The
  // touch doodle's auto-loop transition is two strictly sequential beats,
  // never overlapping: the outgoing mark undraws itself first — retreating
  // along its own path, oldest point first — over doodleUndrawSeconds, and
  // only once it's fully gone does the incoming mark start its own ~1.2s
  // hand-drawn reveal (see switchDoodle()'s doodle.delay, which holds the
  // new mark at zero progress for exactly that long). doodleUndrawTailSeconds
  // is just the quick pop-off each individual point gets once its turn
  // along that retreat comes up, not the sweep's own length. Each mark then
  // dwells fully visible for doodleLoopSeconds before the cycle advances
  // again.
  doodleUndrawSeconds: .75, doodleUndrawTailSeconds: .1, doodleLoopSeconds: 4.5
};
export function makeRandom(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
export function insideRect(x, y, rect, pad = 0) {
  return x >= rect.left-pad && x <= rect.right+pad && y >= rect.top-pad && y <= rect.bottom+pad;
}
export function opacityAt(age, hold, fade) {
  return age <= hold ? 1 : Math.max(0, 1 - (age-hold)/fade);
}

// Traced from the approved four-panel concept, September 11, 2026.
// Coordinates describe the whole paper, with the reference card occupying
// x=.108..892, y=.281..770. These are continuous gestures THROUGH the card
// area, not exclusion routes. The existing opaque 3D card hides the ink.
const MOBILE_DOODLES = [
  { name: 'red', widthScale: .66, start: [-.025,.193], curves: [
    [.040,.165, .186,.123, .244,.105],
    [.188,.139, .079,.202, .016,.224],
    [.141,.195, .382,.102, .508,.075],
    [.528,.073, .305,.223, .185,.269],
    [.312,.241, .530,.160, .640,.144],
    [.672,.153, .564,.231, .542,.275],
    [.566,.270, .588,.249, .610,.252],
    [.649,.296, .641,.403, .714,.505],
    [.794,.625, .833,.719, .892,.752],
    [.984,.729, .965,.791, .747,.854]
  ] },
  { name: 'blue', widthScale: .47, start: [-.025,.870], curves: [
    [.094,.918, .397,.789, .465,.662],
    [.548,.512, .410,.346, .555,.202],
    [.670,.063, .861,.052, .923,.139],
    [1.010,.260, .655,.322, .499,.303],
    [.399,.291, .636,.162, .818,.137],
    [.908,.116, 1.001,.121, 1.032,.153]
  ] },
  { name: 'yellow', widthScale: .44, start: [-.023,.766], curves: [
    [.052,.661, .144,.590, .214,.490],
    [.271,.403, .232,.345, .216,.289],
    [.181,.214, .321,.143, .451,.139],
    [.531,.145, .475,.246, .361,.255],
    [.232,.269, .385,.135, .548,.121],
    [.670,.128, .500,.281, .439,.309],
    [.391,.334, .414,.254, .491,.244],
    [.680,.226, .823,.186, .895,.118],
    [.938,.079, .956,.049, .969,.036]
  ] },
  { name: 'green', widthScale: .48, start: [-.027,.390], curves: [
    [.088,.410, .142,.466, .196,.505],
    [.364,.613, .738,.462, .882,.619],
    [.994,.695, 1.026,.810, .786,.897],
    [.746,.873, .681,.818, .620,.782],
    [.557,.751, .316,.855, .187,.913],
    [.354,.921, .701,.864, .810,.831],
    [.919,.786, .682,.784, .492,.825]
  ] }
];


// Additional preset marks (November 2026), same coordinate convention as
// MOBILE_DOODLES above. Drawn one at a time as the reader scrolls, picked at
// random and randomly mirrored (see pickDoodle), so the set reads as
// spontaneous rather than a loop of four. Most of each mark's ink sits in
// the open paper above and below the card; stretches behind it are hidden.
const EXTRA_DOODLES = [
  { name: 'top loops', start: [-.03,.20], curves: [
    [.08,.16, .14,.08, .22,.07], [.30,.06, .30,.17, .24,.17], [.18,.17, .20,.08, .30,.10],
    [.40,.12, .44,.20, .52,.18], [.60,.16, .62,.07, .56,.06], [.50,.06, .50,.16, .60,.17],
    [.72,.18, .80,.10, .88,.12], [.95,.14, .98,.22, 1.04,.24]
  ] },
  { name: 'bottom wave', start: [1.03,.84], curves: [
    [.92,.80, .84,.92, .74,.90], [.64,.88, .60,.80, .50,.82], [.40,.84, .36,.94, .26,.92],
    [.16,.90, .12,.82, .08,.86], [.04,.90, .08,.96, .14,.93]
  ] },
  { name: 'swash', start: [.02,.06], curves: [
    [.12,.10, .20,.20, .30,.30], [.45,.45, .55,.60, .70,.74], [.80,.84, .90,.90, .94,.86],
    [.98,.82, .92,.76, .86,.82]
  ] },
  { name: 'spiral', start: [.48,.97], curves: [
    [.36,1.0, .10,.97, .08,.88], [.06,.80, .24,.78, .30,.86], [.34,.92, .22,.96, .16,.90],
    [.12,.86, .18,.82, .22,.86]
  ] },
  { name: 'orbit', start: [.50,.12], curves: [
    [.80,.10, .98,.20, .97,.40], [.96,.62, .98,.82, .80,.90], [.60,.97, .30,.97, .14,.88],
    [.00,.80, .02,.55, .04,.35], [.06,.18, .30,.10, .58,.14]
  ] },
  { name: 'figure eight', start: [.40,.22], curves: [
    [.55,.20, .62,.06, .72,.07], [.82,.08, .84,.20, .76,.20], [.68,.20, .66,.08, .78,.06],
    [.90,.04, .96,.16, .88,.22], [.82,.26, .70,.22, .66,.16]
  ] },
  { name: 'underline', start: [.04,.86], curves: [
    [.20,.84, .36,.82, .46,.84], [.56,.86, .58,.94, .50,.95], [.42,.96, .42,.86, .54,.84],
    [.68,.82, .84,.84, .96,.88]
  ] },
  { name: 'ribbon', start: [.80,-.02], curves: [
    [.92,.06, 1.0,.20, .96,.34], [.92,.50, .98,.66, .92,.78], [.86,.90, .70,.94, .56,.90],
    [.44,.87, .40,.80, .30,.82], [.20,.84, .18,.92, .26,.94]
  ] },
  { name: 'lasso', start: [.10,.24], curves: [
    [.10,.05, .55,.02, .62,.12], [.68,.22, .40,.26, .36,.16], [.32,.06, .70,.02, .96,.10]
  ] },
  { name: 'double loop', start: [.02,.90], curves: [
    [.15,.78, .32,.80, .30,.90], [.28,.99, .18,.95, .24,.86], [.32,.76, .62,.80, .62,.90],
    [.62,.99, .52,.96, .58,.86], [.66,.76, .92,.82, 1.03,.88]
  ] },
  { name: 'cloud', start: [.30,.20], curves: [
    [.30,.12, .40,.10, .42,.16], [.44,.22, .36,.22, .38,.16], [.40,.08, .52,.08, .52,.15],
    [.52,.22, .44,.21, .47,.14], [.50,.07, .62,.08, .62,.15], [.62,.21, .55,.22, .57,.16],
    [.60,.09, .72,.12, .74,.20]
  ] }
];
// The original red and yellow marks are zigzags: rapid back-and-forth
// reversals that read as jagged even with rounded corners, so they're left
// out of the rotation (kept above for reference). Colour no longer comes
// from the shape, so all four crayons still appear.
const JAGGED = new Set(['red', 'yellow']);
const DOODLE_SHAPES = [...MOBILE_DOODLES.filter(d => !JAGGED.has(d.name)), ...EXTRA_DOODLES];
// One even, unhurried hand for every mark (personalities were tried, 54f26a6;
// the shaky ones read as jagged). Kept as a table so a variant could return.
//   width/alpha: multipliers on the desktop stroke's width and opacity
//   duration:    the hand-drawn reveal, ms
//   swell:       pressure swing along the stroke
//   jitter:      nib angle wobble, radians; wobble: sideways tremor, px
const PERSONALITIES = {
  steady: { width: 1, alpha: 1, duration: 820, swell: .04, jitter: .02, wobble: 0 }
};
const PERSONALITY_NAMES = Object.keys(PERSONALITIES);
// Every mark should cover real ground on the visible paper. Stretching a
// shape taller mostly pushes ink behind the card, so instead each shape is
// fitted to the open paper it lives in: marks that sit above the card fill
// the band from the nav down to just behind the card's top edge, marks below
// fill the band from just behind its bottom edge to the foot of the screen,
// and every mark spans nearly the full width. Marks that already wrap the
// card (orbit, ribbon, swash...) keep their height. Never shrinks a shape;
// at most FIT_MAX per axis. Reference card: x .108–.892, y .281–.770.
const FIT_W = .96, FIT_MAX = 3.2;
const TOP_BAND = [.03, .33], BOTTOM_BAND = [.72, .985];
const shapeFits = new Map();
function shapeFit(form) {
  if (shapeFits.has(form)) return shapeFits.get(form);
  const xs=[form.start[0]], ys=[form.start[1]];
  for (const c of form.curves) for (let i=0;i<6;i+=2) { xs.push(c[i]); ys.push(c[i+1]); }
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  // Horizontal: widen about the shape's centre to FIT_W, then centre it.
  const ax=Math.min(FIT_MAX, Math.max(1, FIT_W/Math.max(.01,x1-x0)));
  const bx=.5-ax*(x0+x1)/2;
  // Vertical: fill the band the shape belongs to.
  let ay=1, by=0;
  const band = y1<=.42 ? TOP_BAND : y0>=.62 ? BOTTOM_BAND : null;
  if (band) {
    ay=Math.min(FIT_MAX, Math.max(1, (band[1]-band[0])/Math.max(.01,y1-y0)));
    by = band===TOP_BAND ? band[0]-ay*y0 : band[1]-ay*y1;
  }
  const fit={ax,bx,ay,by};
  shapeFits.set(form, fit);
  return fit;
}

// Which open band a shape lives in ('top', 'bottom'), or null if it already
// wraps the card.
function bandOf(form) {
  const ys=[form.start[1]];
  for (const c of form.curves) for (let i=1;i<6;i+=2) ys.push(c[i]);
  const y0=Math.min(...ys), y1=Math.max(...ys);
  return y1<=.42 ? 'top' : y0>=.62 ? 'bottom' : null;
}
// A band shape re-expressed in paper coordinates, fitted to `target` band
// (mirrored top-to-bottom first if it natively lives in the other one), at
// full width, optionally mirrored left-to-right.
function placeInBand(form, target, flipX) {
  const pts=[form.start, ...form.curves.flatMap(c=>[[c[0],c[1]],[c[2],c[3]],[c[4],c[5]]])]
    .map(([x,y])=>[flipX ? 1-x : x, bandOf(form)===target ? y : 1.051-y]);
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const band = target==='top' ? TOP_BAND : BOTTOM_BAND;
  const ax=Math.min(FIT_MAX, Math.max(1, FIT_W/Math.max(.01,x1-x0))), bx=.5-ax*(x0+x1)/2;
  const ay=Math.min(FIT_MAX, Math.max(1, (band[1]-band[0])/Math.max(.01,y1-y0)));
  const by = target==='top' ? band[0]-ay*y0 : band[1]-ay*y1;
  const out=pts.map(([x,y])=>[ax*x+bx, ay*y+by]);
  const curves=[];
  for (let i=1;i<out.length;i+=3) curves.push([...out[i], ...out[i+1], ...out[i+2]]);
  return { start: out[0], curves };
}
// One mark that covers both open bands: a band shape in one, a different
// band shape in the other, joined by a single sweep that runs down (or up)
// the side of the screen past the card, so the stroke reads as one gesture
// travelling around the card rather than staying in one section.
function compositeDoodle(first, second, startTop, flipA, flipB) {
  const a=placeInBand(first, startTop ? 'top' : 'bottom', flipA);
  const b=placeInBand(second, startTop ? 'bottom' : 'top', flipB);
  const aEnd=a.curves[a.curves.length-1].slice(4,6), bStart=b.start;
  const edge = aEnd[0] < .5 ? -.07 : 1.07, dir = startTop ? 1 : -1;
  const join=[edge, aEnd[1]+dir*.18, edge, bStart[1]-dir*.18, bStart[0], bStart[1]];
  return { start: a.start, curves: [...a.curves, join, ...b.curves], composite: true };
}
// Touch marks advance on the doodle's timer (scroll triggering, 5b07c87,
// was tried and set aside).
const SCROLL_TRIGGERED = false;
const COLOR_NAMES = ['red', 'blue', 'yellow', 'green'];

export function mountCrayonTrails(hero, {
  surface = hero, toggle = null, color = null, seed = Math.floor(Math.random()*4294967295),
  getExclusionRects = () => [], isPointBlocked = () => false, isBusy = () => false,
  isPaperPoint = () => true, getCardScreenRect = () => null, ...overrides
} = {}) {
  const cfg = { ...CRAYON_DEFAULTS, ...overrides };
  const random = makeRandom(seed);
  let chosenColor = color || CRAYON_COLORS[Math.floor(random()*CRAYON_COLORS.length)];
  const canvas = document.createElement('canvas');
  canvas.className = 'crayon-trails';
  canvas.setAttribute('aria-hidden', 'true');
  surface.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); throw new Error('2D canvas is unavailable.'); }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let enabled = !isTouchDevice && fine.matches && !motion.matches;
  let disposed = false, visible = true, paused = false;
  let width = 1, height = 1, dpr = 1, raf = 0, fadeTimer = 0, loopTimer = 0;
  let previous = null, smooth = null, traveled = 0, phase = 0, smoothAngle = null;
  let stamps = [], density = new Map();
  // Touch: random preset marks around the card, each with its own
  // personality, drawn in the desktop stroke's look on the doodle's loop.
  // Draws its first mark shortly after load, then loops (hold, undraw, next).
  const doodle = isTouchDevice ? {
    path: null, emitted: 0, progress: 0, elapsed: 0, lastTime: null,
    frame: 0, complete: false, dismissed: false, measuredWidth: 0, delay: 300,
    variant: Math.floor(random()*DOODLE_SHAPES.length), flipX: random()<.5, flipY: random()<.5,
    personality: PERSONALITY_NAMES[Math.floor(random()*PERSONALITY_NAMES.length)], completedAt: 0
  } : null;
  // Touch autopilot state (see startAuto); declared up here because the
  // scroll/pointer handlers and the first scheduleAuto() read it early.
  const auto = { active:false, timer:0, frame:0 };
  // Build each color's nibs only on first use; switching never allocates
  // another full-size drawing canvas. At most four brush sets are cached.
  const brushCache = new Map();
  function brushesFor(inkColor) {
    if (brushCache.has(inkColor)) return brushCache.get(inkColor);
    const set = Array.from({length: 7}, () => {
      const brush = document.createElement('canvas'); brush.width = brush.height = 64;
      const ink = brush.getContext('2d');
      ink.fillStyle = inkColor;
      // A cohesive wax deposit with a ragged edge and fine grain inside it.
      // Each pixel belongs to the nib; pigment is not a cloud of scattered particles.
      for (let y=0;y<64;y++) for (let x=0;x<64;x++) {
        const r=Math.hypot((x-32)/30,(y-32)/25);
        const tooth=random();
        if(r>1 || tooth<.1 || (r>.86 && tooth<.35))continue;
        const body=Math.min(1,(1-r)*7);
        const striation=.85+.15*Math.sin(y*1.6);
        ink.globalAlpha=body*striation*(.32+tooth*.48);
        ink.fillRect(x,y,1,1);
      }
      return brush;
    });
    brushCache.set(inkColor, set);
    return set;
  }
  let brushes = brushesFor(chosenColor);
  // Fixed paper tooth prevents overlapping stamps from polishing away the grain.
  const toothCanvas=document.createElement('canvas');toothCanvas.width=toothCanvas.height=128;
  const toothCtx=toothCanvas.getContext('2d');toothCtx.fillStyle='#000';
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    if(random()>.32)continue;
    toothCtx.globalAlpha=.08+random()*.23;toothCtx.fillRect(x,y,1,1);
  }
  const toothPattern=ctx.createPattern(toothCanvas,'repeat');
  function breakStroke() { previous=null; smooth=null; traveled=0; phase=0; smoothAngle=null; }
  function updateToggle() {
    if (!toggle) return;
    if (doodle) {
      toggle.removeAttribute('aria-pressed');
      toggle.setAttribute('aria-label', `Draw another squiggle. Current color: ${COLOR_NAMES[Math.max(0,CRAYON_COLORS.indexOf(chosenColor))]}`);
    } else {
      toggle.setAttribute('aria-pressed', String(enabled));
      // A minimal dot has no room for a visible label — aria-label keeps it
      // announced correctly for screen readers/keyboard users regardless.
      toggle.setAttribute('aria-label', enabled ? `Change crayon color. Current color: ${COLOR_NAMES[Math.max(0,CRAYON_COLORS.indexOf(chosenColor))]}` : 'Crayon trails off. Turn on');
    }
    toggle.style.setProperty('--crayon-color', chosenColor);
  }
  function cancelWork() { cancelAnimationFrame(raf); clearTimeout(fadeTimer); clearTimeout(loopTimer); raf=0; fadeTimer=0; loopTimer=0; stopDoodle(); }
  function clear() { if (doodle) doodle.dismissed=true; stamps=[]; density.clear(); breakStroke(); cancelWork(); ctx.clearRect(0,0,width,height); }
  function setEnabled(value) {
    enabled=Boolean(value); breakStroke(); if (!enabled) clear(); updateToggle();
  }
  function schedule() {
    if (disposed || !visible || document.hidden || raf) return;
    clearTimeout(fadeTimer); fadeTimer=0;
    raf=requestAnimationFrame(paint);
  }
  function paint() {
    raf=0;
    const now=performance.now();
    // Per-stamp hold/fade (falling back to cfg's) rather than one flat
    // life for every stamp — the doodle's auto-loop crossfade needs a much
    // quicker fade than the desktop hover strokes' cfg.holdSeconds/
    // fadeSeconds, set directly on its own stamps in switchDoodle(). ??
    // (not ||) matters here: those stamps set hold:0, a legitimate value
    // that || would treat as falsy and wrongly fall back to cfg.holdSeconds.
    stamps=stamps.filter(s=>s.persistent || now-s.time<((s.hold??cfg.holdSeconds)+(s.fade??cfg.fadeSeconds))*1000);
    ctx.clearRect(0,0,width,height);
    for (const s of stamps) {
      const fade=s.persistent ? 1 : opacityAt((now-s.time)/1000,s.hold??cfg.holdSeconds,s.fade??cfg.fadeSeconds);
      ctx.globalAlpha=s.alpha*fade;
      // Absolute CSS px, not a fraction of width/height — a stamp's
      // position stays put if the canvas later resizes (e.g. the backdrop
      // growing taller while the résumé is open), instead of every
      // existing mark stretching/rescaling to the new dimensions.
      ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.angle);
      // s.brush is the actual brush canvas the stamp was made with, not an
      // index into the (shared, mutable) `brushes` array — a color switch
      // reassigns `brushes` to the new variant immediately, so an index
      // looked up here would silently repaint every still-undrawing stamp
      // from the OUTGOING mark in the incoming mark's color the instant
      // the switch happens, well before that mark has actually retreated.
      ctx.drawImage(s.brush,-s.size/2,-s.size/2,s.size,s.size);
      ctx.restore();
    }
    ctx.globalAlpha=1;
    if(toothPattern){
      ctx.globalCompositeOperation='destination-out';ctx.fillStyle=toothPattern;
      ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='source-over';
    }
    if (stamps.some(s=>!s.persistent) && visible && !document.hidden) fadeTimer=setTimeout(schedule,150);
  }
  function resize() {
    const nextWidth=surface.clientWidth, nextHeight=surface.clientHeight;
    if (!nextWidth || !nextHeight) return;
    // Height is a high-water mark — it only ever grows, never shrinks
    // back down with the container. Setting canvas.width/height forces
    // the browser to reallocate the ENTIRE backing store, regardless of
    // how little or much gets drawn afterward — that reallocation itself
    // is what was reading as jitter, since the résumé's own open/close
    // animation fires this on nearly every frame for ~500ms. Freezing the
    // buffer at whatever's the tallest it's ever needed to be means that
    // reallocation only happens once, the first time a given height is
    // ever reached — every later open/close of the SAME or a smaller
    // extent is a complete no-op here. What's actually visible at any
    // moment is cropped down by .hero-materials's own overflow:hidden,
    // which already tracks .hero's live height smoothly on its own,
    // fully independent of the canvas's buffer size — see this function's
    // canvas.style.height line, and the .crayon-trails CSS comment.
    const grew=nextHeight>height;
    if (grew) height=nextHeight;
    const nextDpr=Math.min(window.devicePixelRatio||1,2);
    // Skip only when NONE of width/height/dpr actually need a new buffer —
    // canvas.style.height being unset is how the very first call (nothing
    // allocated yet) is told apart from a later no-op call.
    if (!grew && canvas.style.height && nextWidth===width && dpr===nextDpr) return;
    width=nextWidth; dpr=nextDpr;
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    canvas.style.height=height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    breakStroke();
    // Height-only changes (resume reveal / browser chrome) leave the ink
    // on the paper. A changed width reflows the same gesture immediately,
    // preserving reveal progress; it never plays the entrance again.
    // Re-lay an existing mark when the width changes; never compose one here
    // (on touch the first mark waits for the first scroll).
    if (doodle && !doodle.dismissed && doodle.path && doodle.measuredWidth !== width) composeDoodle();
    paint();
    wakeDoodle();
  }
  function move(event) {
    if (isTouchDevice || !enabled || !visible || paused || document.hidden || event.pointerType==='touch' || event.buttons || isBusy()) {breakStroke();return;}
    const target=event.target;
    if (target?.closest?.('a,button,input,textarea,select,[data-crayon-ignore]')) {breakStroke();return;}
    const rect=surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // y is a direct offset, NOT a height/rect.height ratio like x's width
    // one — the canvas's own buffer height is a high-water mark (see
    // resize()) and can legitimately be much taller than what's currently
    // visible through .hero-materials's own overflow:hidden crop, so that
    // ratio would scale y up incorrectly whenever the two differ. Canvas
    // coordinates are already in CSS px (ctx.setTransform handles the
    // dpr scaling), and the buffer's top always matches rect's top, so a
    // plain offset is exactly right regardless of how tall the buffer is.
    const x=(event.clientX-rect.left)*width/rect.width, y=event.clientY-rect.top;
    strokeTo(x,y,performance.now(),rect);
  }
  // The stroke pipeline proper, in canvas px: smoothing, heading blend,
  // stamping. Fed by move() from the real cursor on desktop, and by the
  // autopilot's wandering virtual cursor on touch, so both draw with
  // exactly the same hand.
  function strokeTo(x,y,time,rect) {
    const excluded=getExclusionRects();
    const blocked=(px,py)=>{
      const cx=rect.left+px*rect.width/width,cy=rect.top+py;
      // Absolute canvas px, not a fraction of the canvas's own (dynamic)
      // width/height — the host's wood-corner geometry is pinned to a
      // fixed-size region that doesn't grow when this canvas does, so a
      // fraction of the CURRENT canvas size would drift out of alignment
      // with it as soon as the canvas resizes taller.
      return excluded.some(r=>insideRect(cx,cy,r,6)) || isPointBlocked(cx,cy) || !isPaperPoint(px,py);
    };
    // Bounded by rect.height (what's actually visible right now), not
    // height (the buffer's high-water mark) — a point beyond the visible,
    // currently-cropped area shouldn't be drawable even though it's
    // technically still inside the oversized buffer.
    if (x<0 || y<0 || x>width || y>rect.height || blocked(x,y)) {breakStroke();return;}
    if (!previous || time-previous.time>320) { previous={x,y,time};smooth={x,y};traveled=0;phase=0;return; }
    const rawDistance=Math.hypot(x-previous.x,y-previous.y);
    const elapsed=Math.max(1,time-previous.time);
    if (rawDistance<1.4) return;
    if (rawDistance>180 || rawDistance/elapsed<.015) {breakStroke();return;}
    previous={x,y,time};
    const from=smooth;
    // Lower pull-toward-target factor than the original .62 — the smoothed
    // point lags the raw pointer more, which reads as a gentler, more
    // fluid stroke instead of tracking the cursor almost 1:1. Nudged down
    // again (.42 -> .36) for a bit more of that same fluidity.
    const to={x:from.x+(x-from.x)*.36,y:from.y+(y-from.y)*.36};
    const distance=Math.hypot(to.x-from.x,to.y-from.y);
    smooth=to;
    if (distance<1) return;
    traveled+=distance;
    if (traveled<cfg.gestureThreshold) return;
    // Smoothing the segment's DIRECTION, not just its position, is what
    // actually kills the jagged look — position smoothing alone still
    // draws a straight line between each pair of smoothed points, and a
    // hand's natural tremor makes those per-event segments turn sharply
    // against each other. Blending each new heading into a running
    // average (shortest-path, so it doesn't spin the long way around at
    // near-180° turns) turns that polyline of kinks into one continuously
    // curving stroke.
    const rawAngle=Math.atan2(to.y-from.y,to.x-from.x);
    if (smoothAngle===null) smoothAngle=rawAngle;
    else {
      let diff=rawAngle-smoothAngle;
      diff=((diff+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
      smoothAngle+=diff*0.28;
    }
    const angle=smoothAngle;
    const spacing=Math.max(1.4,cfg.width*.1);
    const count=Math.ceil(distance/spacing);
    for (let i=1;i<=count;i++) {
      const t=i/count,px=from.x+(to.x-from.x)*t,py=from.y+(to.y-from.y)*t;
      phase+=distance/count;
      const cycle=cfg.drawLength+cfg.gapLength;
      const along=cfg.gapLength>0 ? phase%cycle : phase;
      if ((cfg.gapLength>0 && along>cfg.drawLength) || blocked(px,py)) continue;
      // A per-area pigment budget, decaying over time, stops truly
      // relentless circling in one exact spot from accumulating forever —
      // but it's a hard stop on ADDING new stamps once a generous budget
      // is used up, not a gradual fade. Fading alpha by density (the
      // previous two tunings here) dimmed every stamp in a well-travelled
      // spot a little more than the last, which is exactly what read as
      // spotty/inconsistent in an ordinary doodle with some overlap (a
      // heart shape, a loop retraced a couple times) — normal drawing
      // revisits the same small area constantly, so it should stay one
      // consistent wax color there, not visibly fade as it fills in.
      const key=`${Math.floor(px/48)},${Math.floor(py/48)}`;
      const old=density.get(key)||{amount:0,time};
      const amount=old.amount*Math.exp(-(time-old.time)/12000);
      if (amount>cfg.densityLimit) continue;
      density.set(key,{amount:amount+1,time});
      // py/rect.height, not py/height — height is the canvas buffer's
      // high-water mark (see resize()), which can be taller than what's
      // actually visible right now; the margin vignette should read
      // against the real visible edge, not a sometimes-much-taller one.
      const edgeDistance=Math.min(px/width,1-px/width,py/rect.height,1-py/rect.height);
      const marginWeight=.42+.58*Math.max(0,1-edgeDistance/.32);
      const taper=cfg.gapLength>0 ? Math.min(1,along/18,(cfg.drawLength-along)/24) : Math.min(1,phase/14);
      const pressure=.88+.09*Math.sin(phase*.018)+.03*Math.sin(phase*.09);
      // Half the original ±0.08rad jitter — less scratchy zig-zag along
      // the stroke, closer to one continuous waxy line.
      stamps.push({x:px,y:py,time,angle:angle+(random()-.5)*.04,
        size:cfg.width*pressure,alpha:cfg.opacity*marginWeight*taper,brush:brushes[Math.floor(random()*brushes.length)]});
    }
    if(stamps.length>cfg.maxStamps) stamps.splice(0,stamps.length-cfg.maxStamps);
    schedule();
  }
  // Desktop: each click steps to the next crayon color, starting from the
  // one picked at mount; after the last of the four, one more click turns
  // trails off (a hollow dot), and the next turns them back on at the
  // starting color. Marks already on the canvas keep their own brush, so
  // they fade out in the color they were drawn in.
  const cycleStart=Math.max(0,CRAYON_COLORS.indexOf(chosenColor));
  let cycleStep=0;
  function cycleColor() {
    if (!enabled) { cycleStep=0; }
    else if (++cycleStep>=CRAYON_COLORS.length) { cycleStep=0; setEnabled(false); return; }
    chosenColor=CRAYON_COLORS[(cycleStart+cycleStep)%CRAYON_COLORS.length];
    brushes=brushesFor(chosenColor); breakStroke();
    if (enabled) updateToggle(); else setEnabled(true);
  }
  const toggleClick=()=>doodle ? switchDoodle() : cycleColor();
  const preferences=()=>{
    if (doodle) { if (motion.matches) finishDoodle(); else {wakeDoodle();scheduleLoop();} }
    else setEnabled(fine.matches&&!motion.matches);
  };
  const visibility=()=>{breakStroke();if(document.hidden)cancelWork();else {schedule();wakeDoodle();scheduleLoop();}};
  // The autopilot draws in canvas px, so scrolling or tapping mid-stroke
  // doesn't disturb it; only real-cursor strokes break on those.
  const scroll=()=>{ if (!isTouchDevice && !auto.active) breakStroke(); };
  function down() { if (!auto.active) breakStroke(); }
  // window/documentElement, not hero — nav is a DOM SIBLING of hero, not a
  // descendant, so a listener on hero itself never sees pointer events
  // whose target is inside nav (they bubble through nav's own ancestor
  // chain, never through hero). card.js's own tilt-tracking hit this same
  // class of problem and already listens on window for exactly this
  // reason. move()'s own bounds check against `surface`'s rect already
  // rejects/breaks the stroke once the cursor leaves the drawable area, so
  // listening this broadly doesn't risk drawing outside it.
  window.addEventListener('pointermove',move,{passive:true});
  document.documentElement.addEventListener('pointerleave',breakStroke,{passive:true});
  window.addEventListener('pointerdown',down,{passive:true});
  window.addEventListener('scroll',scroll,{passive:true,capture:true});
  document.addEventListener('visibilitychange',visibility);
  motion.addEventListener('change',preferences); fine.addEventListener('change',preferences);
  toggle?.addEventListener('click',toggleClick);
  const sizeObserver=new ResizeObserver(resize); sizeObserver.observe(surface);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){schedule();wakeDoodle();scheduleLoop();}else{cancelWork();breakStroke();}});
  intersection.observe(hero);
  resize();updateToggle();
  // Draw once on first visibility, then stop all doodle scheduling. The
  // persistent stamps share the desktop brush but not its fade lifecycle.
  wakeDoodle();
  // scheduleAuto(700);  // touch autopilot (ed5220c), parked in favour of the doodle



  // ---- Touch scroll pen -------------------------------------------------
  // On a phone, scrolling is the one continuous, physical motion the reader
  // makes, so it drives the crayon: each scroll moves a virtual pen across
  // the visible paper by an amount proportional to how far the page moved,
  // fed through the same strokeTo() pipeline as the desktop cursor (so the
  // line has the identical round, waxy hand). A flick draws a long sweep, a
  // nudge a short mark, and a pause ends the stroke. The pen's turning is a
  // function of distance travelled (two slow sines, random phase), so the
  // path's shape doesn't depend on scroll speed, only its pace does. Soft
  // walls keep it on the part of the paper that's actually on screen, and it
  // may pass behind the card.
  const pen = { x:null, y:null, heading:0, dist:0, pending:0, lastY:window.scrollY, frame:0, lastFeed:0 };
  function penSeed(top, bottom) {
    const rect=surface.getBoundingClientRect();
    const card=getCardScreenRect();
    const cr=card ? { l:card.left-rect.left, t:card.top-rect.top, r:card.right-rect.left, b:card.bottom-rect.top } : null;
    for (let i=0;i<14;i++) {
      pen.x=width*(.08+random()*.84); pen.y=top+(bottom-top)*random();
      if (!cr || !(pen.x>cr.l-10 && pen.x<cr.r+10 && pen.y>cr.t-10 && pen.y<cr.b+10)) break;
    }
    pen.heading=random()*Math.PI*2;
    Object.assign(pen, { a1:.006+random()*.009, w1:.004+random()*.006, p1:random()*6.3,
      a2:.003+random()*.006, w2:.011+random()*.012, p2:random()*6.3 });
  }
  function penScroll() {
    const y=window.scrollY, delta=y-pen.lastY;
    pen.lastY=y;
    if (!enabled || !visible || paused || document.hidden || isBusy()) return;
    pen.pending+=Math.min(160, Math.abs(delta));
    if (!pen.frame) pen.frame=requestAnimationFrame(penStep);
  }
  function penStep(now) {
    pen.frame=0;
    const rect=surface.getBoundingClientRect();
    // The paper actually on screen, in canvas px, below the nav.
    const top=Math.max(0,-rect.top)+Math.max(0,64-Math.max(0,rect.top));
    const bottom=Math.min(rect.height, window.innerHeight-rect.top)-10;
    if (bottom-top<110 || !rect.width) { pen.pending=0; breakStroke(); return; }
    // A pause in scrolling ends the stroke; the next one starts fresh from
    // where the pen is (or a new spot, if that's scrolled off).
    if (now-pen.lastFeed>320) {
      breakStroke();
      if (pen.x===null || pen.y<top || pen.y>bottom) penSeed(top, bottom);
    }
    const d=Math.min(pen.pending*.65, 30);
    pen.pending=Math.max(0, pen.pending-d/.65);
    if (d<.5) return;
    const card=getCardScreenRect();
    const cr=card ? { l:card.left-rect.left, t:card.top-rect.top, r:card.right-rect.left, b:card.bottom-rect.top } : null;
    const sub=Math.ceil(d/6);
    for (let i=0;i<sub;i++) {
      const step=d/sub;
      pen.dist+=step;
      pen.heading+=(pen.a1*Math.sin(pen.dist*pen.w1+pen.p1)+pen.a2*Math.sin(pen.dist*pen.w2+pen.p2))*step;
      const m=30, cx=width/2, cy=(top+bottom)/2;
      if (pen.x<m || pen.x>width-m || pen.y<top+m || pen.y>bottom-m) {
        const want=Math.atan2(cy-pen.y, cx-pen.x);
        let dd=want-pen.heading; dd=((dd+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
        pen.heading+=dd*.08;
      }
      // Behind the card the marks are hidden, so it can cross under it but
      // is eased back out toward the nearest edge rather than lingering.
      if (cr && pen.x>cr.l && pen.x<cr.r && pen.y>cr.t && pen.y<cr.b) {
        const exits=[[pen.x-cr.l,Math.PI],[cr.r-pen.x,0],[pen.y-cr.t,-Math.PI/2],[cr.b-pen.y,Math.PI/2]];
        exits.sort((p,q)=>p[0]-q[0]);
        let dd=exits[0][1]-pen.heading; dd=((dd+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
        pen.heading+=dd*.05;
      }
      pen.x+=Math.cos(pen.heading)*step; pen.y+=Math.sin(pen.heading)*step;
    }
    strokeTo(pen.x, pen.y, now, rect);
    pen.lastFeed=now;
    if (pen.pending>.5) pen.frame=requestAnimationFrame(penStep);
  }

  // ---- Touch autopilot --------------------------------------------------
  // A phone has no cursor to draw with, so on touch a virtual one wanders the
  // paper now and then, fed through the same strokeTo() pipeline as the
  // desktop cursor, so the marks have the identical waxy hand. Each stroke
  // is a relaxed, cursor-speed wander whose turning rate is a sum of two
  // slow sines with random phase, which yields organic curves and the odd
  // loop rather than geometric shapes; it starts on open paper beside the
  // card and is free to pass behind it, so marks read as ribbons around it.
  function autoReady() {
    return isTouchDevice && enabled && visible && !paused && !document.hidden && !disposed && !isBusy();
  }
  function scheduleAuto(delay) {
    clearTimeout(auto.timer);
    if (!isTouchDevice || disposed) return;
    auto.timer=setTimeout(startAuto, delay);
  }
  function startAuto() {
    auto.timer=0;
    if (!autoReady()) { scheduleAuto(1200); return; }
    const rect=surface.getBoundingClientRect();
    const visH=Math.min(rect.height, window.innerHeight-Math.max(0,rect.top)) || rect.height;
    if (!rect.width || visH<80) { scheduleAuto(1500); return; }
    const card=getCardScreenRect();
    const cr=card ? { l:card.left-rect.left, t:card.top-rect.top, r:card.right-rect.left, b:card.bottom-rect.top } : null;
    const top=Math.max(0,-rect.top)+64, bottom=Math.max(0,-rect.top)+visH-12;
    // Start on open paper: above or below the card (or anywhere, if the
    // card isn't measurable), a little in from the edges.
    let sx, sy;
    for (let i=0;i<12;i++) {
      sx=width*(.08+random()*.84); sy=top+(bottom-top)*random();
      if (!cr || !(sx>cr.l-14 && sx<cr.r+14 && sy>cr.t-14 && sy<cr.b+14)) break;
    }
    const s={
      x:sx, y:sy, heading:random()*Math.PI*2, speed:.34+random()*.3,
      a1:.0016+random()*.0026, w1:.0012+random()*.0018, p1:random()*6.3,
      a2:.0009+random()*.0018, w2:.003+random()*.004, p2:random()*6.3,
      t:0, dur:1700+random()*1700, last:null, top, bottom, rect
    };
    auto.active=true; breakStroke();
    const step=(now)=>{
      auto.frame=0;
      if (!autoReady()) { endAuto(); return; }
      const dt=s.last===null ? 16 : Math.min(40, now-s.last);
      s.last=now; s.t+=dt;
      const turn=s.a1*Math.sin(s.t*s.w1+s.p1)+s.a2*Math.sin(s.t*s.w2+s.p2);
      s.heading+=turn*dt;
      // Soft walls: near an edge of the visible paper, ease the heading back
      // toward the middle instead of running off.
      const m=34, cx=width/2, cy=(s.top+s.bottom)/2;
      if (s.x<m || s.x>width-m || s.y<s.top+m || s.y>s.bottom-m) {
        const want=Math.atan2(cy-s.y, cx-s.x);
        let d=want-s.heading; d=((d+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
        s.heading+=d*.06;
      }
      // Ease in and out of the stroke's speed, like a hand settling.
      const u=s.t/s.dur, ease=Math.min(1, u*5, (1-u)*4);
      const v=s.speed*(.55+.45*ease);
      s.x+=Math.cos(s.heading)*v*dt; s.y+=Math.sin(s.heading)*v*dt;
      strokeTo(s.x, s.y, now, surface.getBoundingClientRect());
      if (s.t>=s.dur) { endAuto(); return; }
      auto.frame=requestAnimationFrame(step);
    };
    auto.frame=requestAnimationFrame(step);
  }
  function endAuto() {
    if (auto.frame) cancelAnimationFrame(auto.frame);
    auto.frame=0;
    if (auto.active) { auto.active=false; breakStroke(); }
    scheduleAuto(4200+random()*3800);
  }


  // Next preset: random, never the same shape twice running, randomly
  // mirrored left/right and top/bottom about the card.
  function pickDoodle() {
    let v=doodle.variant;
    if (DOODLE_SHAPES.length>1) while (v===doodle.variant) v=Math.floor(random()*DOODLE_SHAPES.length);
    doodle.variant=v; doodle.flipX=random()<.5; doodle.flipY=random()<.5; doodle.composite=null;
    if (PERSONALITY_NAMES.length>1) {
      let p=doodle.personality;
      while (p===doodle.personality) p=PERSONALITY_NAMES[Math.floor(random()*PERSONALITY_NAMES.length)];
      doodle.personality=p;
    } else doodle.personality=PERSONALITY_NAMES[0];
  }
  // A burst of scrolling while the hero is on screen draws the next mark,
  // once the current one has finished drawing and had a moment on the page.
  let scrollAcc=0, scrollLastY=window.scrollY;
  function doodleScroll() {
    const y=window.scrollY, delta=Math.abs(y-scrollLastY);
    scrollLastY=y;
    if (!doodle || disposed || paused || !visible || document.hidden || isBusy()) return;
    if (!doodle.complete) return;
    scrollAcc+=delta;
    if (scrollAcc<36) return;
    if (doodle.path && performance.now()-doodle.completedAt<1400) return;
    scrollAcc=0;
    switchDoodle();
  }

  function composeDoodle() {
    if (!doodle || doodle.dismissed) return false;
    const rect = surface.getBoundingClientRect();
    const card = getCardScreenRect();
    const visibleH = surface.clientHeight || height;
    if (!card || !rect.width || !rect.height || !width || !visibleH) return false;
    const sx = width / rect.width, sy = visibleH / rect.height;
    const picked = DOODLE_SHAPES[doodle.variant];
    // Band shapes travel: paired with a second band shape on the other side
    // of the card (fixed per mark, so a re-layout redraws the same thing).
    if (!doodle.composite && bandOf(picked)) {
      const bands=DOODLE_SHAPES.filter(f=>bandOf(f) && f!==picked);
      const second=bands[Math.floor(random()*bands.length)];
      doodle.composite=compositeDoodle(picked, second, random()<.5, random()<.5, random()<.5);
    }
    const form = bandOf(picked) ? doodle.composite : picked;
    // Full desktop width (the authored widthScale made these thinner and
    // flatter than the cursor trail); see the stamping pass below.
    const P = PERSONALITIES[doodle.personality] || PERSONALITIES.elegant;
    const strokeWidth = cfg.width * P.width;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const left = clamp((card.left-rect.left)*sx, 0, width);
    const right = clamp((card.right-rect.left)*sx, left, width);
    const top = clamp((card.top-rect.top)*sy, 0, visibleH);
    const bottom = clamp((card.bottom-rect.top)*sy, top, visibleH);
    // Match the reference composition around the real card. Mapping is
    // continuous across its edges, so hidden stretches remain connected.
    // A few authored endpoints run off the paper; the canvas clips them.
    const mapAxis = (v, a, b, extent, refA, refB) => v < refA
      ? a*v/refA
      : v > refB ? b+(extent-b)*(v-refB)/(1-refB)
      : a+(b-a)*(v-refA)/(refB-refA);
    // Mirroring is about the reference card's own centre (x .5, y .5255), so
    // a flipped mark still wraps the card the same way.
    // Composites are already placed in paper coordinates (and mirrored).
    const fit = form.composite ? {ax:1,bx:0,ay:1,by:0} : shapeFit(form);
    const map = (x,y) => {
      x=fit.ax*x+fit.bx; y=fit.ay*y+fit.by;
      if (!form.composite && doodle.flipX) x=1-x;
      if (!form.composite && doodle.flipY) y=1.051-y;
      return { x:mapAxis(x,left,right,width,.108,.892), y:mapAxis(y,top,bottom,visibleH,.281,.770) };
    };
    let previous = map(...form.start);
    const raw = [previous];
    for (const curve of form.curves) {
      const a=previous, b=map(curve[0],curve[1]), c=map(curve[2],curve[3]), d=map(curve[4],curve[5]);
      const length = Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(c.x-b.x,c.y-b.y)+Math.hypot(d.x-c.x,d.y-c.y);
      const steps = Math.max(20, Math.ceil(length/4));
      for (let i=1; i<=steps; i++) {
        const t=i/steps, u=1-t;
        raw.push({ x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,
          y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y });
      }
      previous=d;
    }
    // Round every corner. The authored beziers meet at hard joins in places
    // (the zigzags especially), which the desktop trail never shows because
    // its pen chases the cursor on a leash. Same idea here: resample to even
    // 3px steps, then run a forward and a backward exponential smoothing
    // pass (zero lag overall), which turns any corner into an arc of roughly
    // 30px radius while leaving gentle curves essentially untouched.
    {
      const even=[raw[0]]; let carry=0;
      for (let i=1;i<raw.length;i++) {
        const a=raw[i-1], b=raw[i], len=Math.hypot(b.x-a.x,b.y-a.y);
        let d=3-carry;
        while (d<=len) { const t=d/len; even.push({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t}); d+=3; }
        carry=len-(d-3);
      }
      even.push(raw[raw.length-1]);
      const k=.09;
      for (let i=1;i<even.length;i++) { even[i]={x:even[i-1].x+(even[i].x-even[i-1].x)*k, y:even[i-1].y+(even[i].y-even[i-1].y)*k}; }
      for (let i=even.length-2;i>=0;i--) { even[i]={x:even[i+1].x+(even[i].x-even[i+1].x)*k, y:even[i+1].y+(even[i].y-even[i+1].y)*k}; }
      raw.length=0; raw.push(...even);
    }
    // Resample by distance, carrying the leftover between segments. Never
    // stamp just the segment endpoints (the earlier disconnected-dot bug).
    // Same spacing and heading treatment as strokeTo(): the heading is a
    // running blend of each segment's direction (0.28 pull), so the nib
    // turns smoothly rather than snapping to every bezier step.
    const path=[], spacing=Math.max(1.4,strokeWidth*.1);
    const textureRandom=makeRandom(0x5c71bb1e);
    let distanceToNext=0, travelled=0, heading=null;
    for (let i=1;i<raw.length;i++) {
      const a=raw[i-1], b=raw[i], length=Math.hypot(b.x-a.x,b.y-a.y);
      if (length<0.0001) continue;
      const rawAngle=Math.atan2(b.y-a.y,b.x-a.x);
      if (heading===null) heading=rawAngle;
      else { let d=rawAngle-heading; d=((d+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI; heading+=d*.28; }
      let along=distanceToNext;
      while (along<=length) {
        const t=along/length;
        // A furious hand trembles sideways a little; the others don't.
        const tremor=P.wobble ? (Math.sin((travelled+along)*.21)+Math.sin((travelled+along)*.067))*P.wobble*.5 : 0;
        const nx=-Math.sin(heading), ny=Math.cos(heading);
        path.push({ x:a.x+(b.x-a.x)*t+nx*tremor, y:a.y+(b.y-a.y)*t+ny*tremor,
          distance:travelled+along, angle:heading+(textureRandom()-.5)*P.jitter,
          brush:brushes[Math.floor(textureRandom()*brushes.length)] });
        along+=spacing;
      }
      distanceToNext=along-length; travelled+=length;
    }
    let revealDistance=0;
    for (let i=0;i<path.length;i++) {
      const p=path[i];
      const hidden=p.x>left+strokeWidth && p.x<right-strokeWidth &&
        p.y>top+strokeWidth && p.y<bottom-strokeWidth;
      revealDistance+=(i ? p.distance-path[i-1].distance : 0)*(hidden ? .18 : 1);
      p.revealDistance=revealDistance;
    }
    for (const p of path) {
      p.fraction=p.revealDistance/Math.max(1,revealDistance);
      doodle.revealLength=revealDistance;
      // The desktop cursor trail's own pressure, start taper and margin
      // weighting (see strokeTo), so the doodle reads as the same crayon.
      const phase=p.distance;
      const taper=Math.min(1,phase/14);
      // Only the long, slow pressure swing: the short (~70px) ripple the
      // desktop recipe layers on top read as beading along these longer,
      // evenly drawn marks.
      p.size=strokeWidth*(.92+P.swell*Math.sin(phase*.018));
      const edgeDistance=Math.min(p.x/width,1-p.x/width,p.y/visibleH,1-p.y/visibleH);
      const marginWeight=.42+.58*Math.max(0,1-edgeDistance/.32);
      p.alpha=Math.min(.9, cfg.opacity*P.alpha*marginWeight*taper);
      p.persistent=true;
    }
    doodle.path=path;
    doodle.measuredWidth=width;
    doodle.emitted=0;
    stamps=stamps.filter(s=>!s.persistent);
    emitDoodle();
    return true;
  }

  function switchDoodle() {
    if (!doodle || disposed) return;
    // Cancel a partial reveal before replacing it, even on rapid taps — but
    // only the doodle's own reveal rAF chain (stopDoodle()), not a full
    // cancelWork(): the outgoing mark is about to become a fading
    // transient stamp below, and fading it needs the general paint()/
    // fadeTimer loop to keep running and repainting across frames while
    // the next mark draws on top of it.
    stopDoodle();
    // A manual tap (or an auto-advance) always restarts the loop's dwell
    // clock from here, once the new mark finishes drawing (see
    // scheduleLoop(), re-armed by finishDoodle()) — otherwise a switch
    // that was already close to its next auto-advance would double-fire
    // moments later.
    clearTimeout(loopTimer); loopTimer=0;
    const now=performance.now();
    // Let the outgoing mark undraw itself on its own instead of
    // composeDoodle()'s usual hard cut a few lines down (its own
    // `stamps=stamps.filter(s=>!s.persistent)` would otherwise delete every
    // one of this mark's stamps outright). Flipping them to transient
    // stamps spares them from that filter; paint() already knows how to
    // fade any non-persistent stamp via opacityAt(), keyed off each one's
    // own hold/fade rather than one flat cfg pair.
    //
    // Staggering `hold` by the stamp's own `fraction` (0 at the start of
    // the path, 1 at its end — the exact same value composeDoodle() used
    // to pace the original hand-drawn reveal, carried straight through
    // from doodle.path onto each stamp by emitDoodle()) is what turns a
    // flat fade into a retreat: the point drawn FIRST is the point that
    // disappears first, and the point drawn LAST lingers until the very
    // end of doodleUndrawSeconds — the mark erases itself in the same
    // order it was drawn, rather than everywhere at once. `fade` stays a
    // short, fixed pop-off (doodleUndrawTailSeconds) so each point still
    // reads as a clean edge sweeping along the line, not a long smear.
    for (const s of stamps) if (s.persistent) {
      s.persistent=false; s.time=now;
      s.hold=(s.fraction??0)*cfg.doodleUndrawSeconds; s.fade=cfg.doodleUndrawTailSeconds;
    }
    const hadMark=stamps.some(s=>!s.persistent && s.fraction!==undefined && s.time===now);
    pickDoodle();
    chosenColor=CRAYON_COLORS[(Math.max(0,CRAYON_COLORS.indexOf(chosenColor))+1)%CRAYON_COLORS.length];
    brushes=brushesFor(chosenColor);
    // delay (not 0, like the old hard-cut used) is what keeps this
    // sequential rather than simultaneous: advanceDoodle()'s progress stays
    // pinned at zero — composeDoodle() below still runs immediately and
    // builds the new path, but emitDoodle() draws none of it yet — until
    // doodle.elapsed passes the outgoing mark's own full undraw span
    // (doodleUndrawSeconds + doodleUndrawTailSeconds, the longest any of
    // its stamps can possibly still be on screen), so the new mark only
    // starts appearing once the old one is completely gone.
    Object.assign(doodle, {path:null, emitted:0, progress:0, elapsed:0,
      lastTime:null, complete:false, dismissed:false, measuredWidth:0,
      delay:hadMark ? (cfg.doodleUndrawSeconds+cfg.doodleUndrawTailSeconds)*1000 : 120});
    density.clear(); breakStroke();
    updateToggle(); composeDoodle(); paint(); wakeDoodle();
  }

  function scheduleLoop() {
    clearTimeout(loopTimer); loopTimer=0;
    // Only ever counts down once a mark is actually fully drawn (never
    // mid-reveal) — finishDoodle() (re)arms this on every normal
    // completion, and the various pause/hide resume paths re-arm it too,
    // in case the mark had already finished before that happened.
    // Continuous, unprompted cycling is exactly what prefers-reduced-motion
    // asks pages to avoid, so the loop simply never (re)starts while that's
    // set — the manual toggle still works regardless, since it doesn't
    // depend on this timer.
    // Marks now advance on scroll (doodleScroll), not on a timer.
    if (SCROLL_TRIGGERED) return;
    if (!doodle || !doodle.complete || doodle.dismissed || disposed || paused || !visible || document.hidden || motion.matches) return;
    loopTimer=setTimeout(advanceLoop, cfg.doodleLoopSeconds*1000);
  }

  function advanceLoop() {
    loopTimer=0;
    if (!doodle || doodle.dismissed || disposed || paused || !visible || document.hidden) return;
    switchDoodle();
  }

  function emitDoodle() {
    if (!doodle?.path || (!doodle.complete && doodle.progress <= 0)) return;
    const now=performance.now();
    while (doodle.emitted<doodle.path.length && (doodle.complete || doodle.path[doodle.emitted].fraction<=doodle.progress)) {
      stamps.push({ ...doodle.path[doodle.emitted++], time:now });
    }
  }

  function stopDoodle() {
    if (!doodle) return;
    if (doodle.frame) cancelAnimationFrame(doodle.frame);
    doodle.frame=0;
    doodle.lastTime=null;
  }

  function finishDoodle() {
    if (!doodle || doodle.dismissed || disposed) return;
    stopDoodle();
    if (!doodle.path && !composeDoodle()) return;
    doodle.progress=1; doodle.complete=true; doodle.completedAt=performance.now();
    emitDoodle(); paint();
    scheduleLoop();
  }

  function wakeDoodle() {
    if (!doodle || doodle.dismissed || doodle.complete || doodle.frame || disposed || paused || !visible || document.hidden) return;
    if (motion.matches) { finishDoodle(); return; }
    doodle.frame=requestAnimationFrame(advanceDoodle);
  }

  function advanceDoodle(now) {
    doodle.frame=0;
    if (disposed || doodle.dismissed || doodle.complete || paused || !visible || document.hidden) { stopDoodle(); return; }
    if (motion.matches) { finishDoodle(); return; }
    const dt=doodle.lastTime===null ? 0 : Math.max(0,Math.min(50,now-doodle.lastTime));
    doodle.lastTime=now;
    doodle.elapsed+=dt;
    if (!doodle.path && !composeDoodle()) {
      // A missing card callback must not leave a permanent animation loop.
      // A later resize/visibility event can retry when geometry is ready.
      if (doodle.elapsed<2500) wakeDoodle();
      else stopDoodle();
      return;
    }
    // A steady pen speed (px/s of visible line) rather than one fixed time
    // for every mark, so a long sweep isn't dumped onto the page in big
    // per-frame chunks and a short one doesn't crawl. Clamped so nothing
    // takes forever or flashes in.
    const revealMs=Math.max(550, Math.min(1500, (doodle.revealLength||1200)/1.45));
    const t=Math.max(0,Math.min(1,(doodle.elapsed-doodle.delay)/revealMs));
    // A quick hand-drawn reveal with small, monotonic changes in pace.
    // Even pace with a soft start and finish (no mid-stroke lurches), so
    // the line grows smoothly rather than in surges.
    doodle.progress=t<.12 ? (t/.12)*(t/.12)*.06 : t>.88 ? 1-((1-t)/.12)*((1-t)/.12)*.06 : .06+(t-.12)/.76*.88;
    if (t===1) { finishDoodle(); return; }
    emitDoodle(); paint();
    wakeDoodle();
  }

  return {
    canvas, clear, setEnabled,
    get color(){return chosenColor;},
    pause(value=true) {paused=value;breakStroke();if(paused){stopDoodle();clearTimeout(loopTimer);loopTimer=0;}else{wakeDoodle();scheduleLoop();}},
    get enabled(){return enabled;},
    get markCount(){return stamps.length;},
    destroy(){
      if(disposed)return;disposed=true;cancelWork();if(pen.frame)cancelAnimationFrame(pen.frame);clearTimeout(auto.timer);if(auto.frame)cancelAnimationFrame(auto.frame);
      window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',breakStroke);window.removeEventListener('pointerdown',down);
      window.removeEventListener('scroll',scroll,true);document.removeEventListener('visibilitychange',visibility);
      motion.removeEventListener('change',preferences);fine.removeEventListener('change',preferences);toggle?.removeEventListener('click',toggleClick);
      sizeObserver.disconnect();intersection.disconnect();canvas.remove();stamps=[];density.clear();
    }
  };
}
