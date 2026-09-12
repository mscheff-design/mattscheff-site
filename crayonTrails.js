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
  // touch doodle's auto-loop transition is a quick, continuous cycle: the
  // outgoing mark undraws itself — retreating along its own path, oldest
  // point first — over doodleUndrawSeconds, timed to finish right around
  // when the incoming mark's own ~1.2s reveal completes, so the two read as
  // one continuous gesture rather than a cut. doodleUndrawTailSeconds is
  // just the quick pop-off each individual point gets once its turn along
  // that retreat comes up (see switchDoodle()), not the sweep's own length.
  // Each mark then dwells fully visible for doodleLoopSeconds before the
  // cycle advances again.
  doodleUndrawSeconds: 1.2, doodleUndrawTailSeconds: .12, doodleLoopSeconds: 8
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
  const doodle = isTouchDevice ? {
    path: null, emitted: 0, progress: 0, elapsed: 0, lastTime: null,
    frame: 0, complete: false, dismissed: false, measuredWidth: 0, delay: 300,
    variant: Math.max(0, CRAYON_COLORS.indexOf(chosenColor))
  } : null;
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
      toggle.setAttribute('aria-label', `Change squiggle. Current color: ${MOBILE_DOODLES[doodle.variant].name}`);
    } else {
      toggle.setAttribute('aria-pressed', String(enabled));
      // A minimal dot has no room for a visible label — aria-label keeps it
      // announced correctly for screen readers/keyboard users regardless.
      toggle.setAttribute('aria-label', `Crayon trails ${enabled ? 'on' : 'off'}`);
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
      ctx.drawImage(brushes[s.brush],-s.size/2,-s.size/2,s.size,s.size);
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
    if (doodle && !doodle.dismissed && (!doodle.path || doodle.measuredWidth !== width)) composeDoodle();
    paint();
    wakeDoodle();
  }
  function move(event) {
    if (!enabled || !visible || paused || document.hidden || event.pointerType==='touch' || event.buttons || isBusy()) {breakStroke();return;}
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
    const time=performance.now();
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
        size:cfg.width*pressure,alpha:cfg.opacity*marginWeight*taper,brush:Math.floor(random()*brushes.length)});
    }
    if(stamps.length>cfg.maxStamps) stamps.splice(0,stamps.length-cfg.maxStamps);
    schedule();
  }
  const toggleClick=()=>doodle ? switchDoodle() : setEnabled(!enabled);
  const preferences=()=>{
    if (doodle) { if (motion.matches) finishDoodle(); else {wakeDoodle();scheduleLoop();} }
    else setEnabled(fine.matches&&!motion.matches);
  };
  const visibility=()=>{breakStroke();if(document.hidden)cancelWork();else {schedule();wakeDoodle();scheduleLoop();}};
  const scroll=()=>breakStroke();
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
  window.addEventListener('pointerdown',breakStroke,{passive:true});
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

  function composeDoodle() {
    if (!doodle || doodle.dismissed) return false;
    const rect = surface.getBoundingClientRect();
    const card = getCardScreenRect();
    const visibleH = surface.clientHeight || height;
    if (!card || !rect.width || !rect.height || !width || !visibleH) return false;
    const sx = width / rect.width, sy = visibleH / rect.height;
    const form = MOBILE_DOODLES[doodle.variant];
    const strokeWidth = cfg.width * form.widthScale;
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
    const map = (x,y) => ({ x:mapAxis(x,left,right,width,.108,.892),
      y:mapAxis(y,top,bottom,visibleH,.281,.770) });
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
    // Resample by distance, carrying the leftover between segments. Never
    // stamp just the segment endpoints (the earlier disconnected-dot bug).
    const path=[], spacing=Math.max(1.4,strokeWidth*0.085);
    const textureRandom=makeRandom(0x5c71bb1e);
    let distanceToNext=0, travelled=0;
    for (let i=1;i<raw.length;i++) {
      const a=raw[i-1], b=raw[i], length=Math.hypot(b.x-a.x,b.y-a.y);
      if (length<0.0001) continue;
      let along=distanceToNext;
      while (along<=length) {
        const t=along/length;
        path.push({ x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t,
          distance:travelled+along, angle:Math.atan2(b.y-a.y,b.x-a.x)+(textureRandom()-.5)*.04,
          brush:Math.floor(textureRandom()*brushes.length) });
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
      // Subtle hand pressure and slightly lighter open ends. No animated
      // noise: these values are fixed for the lifetime of the drawing.
      const taper=Math.min(1,p.distance/16,(travelled-p.distance)/20);
      p.size=strokeWidth*(0.82+0.10*Math.sin(p.fraction*13+0.4)+0.035*Math.sin(p.fraction*39));
      p.alpha=cfg.opacity*(0.65+0.35*Math.max(0,taper));
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
    doodle.variant=(doodle.variant+1)%MOBILE_DOODLES.length;
    chosenColor=CRAYON_COLORS[doodle.variant];
    brushes=brushesFor(chosenColor);
    Object.assign(doodle, {path:null, emitted:0, progress:0, elapsed:0,
      lastTime:null, complete:false, dismissed:false, measuredWidth:0, delay:0});
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
    doodle.progress=1; doodle.complete=true;
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
    const t=Math.max(0,Math.min(1,(doodle.elapsed-doodle.delay)/1200));
    // A quick hand-drawn reveal with small, monotonic changes in pace.
    doodle.progress=t+0.025*Math.sin(t*Math.PI*2)-0.014*Math.sin(t*Math.PI*6);
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
      if(disposed)return;disposed=true;cancelWork();
      window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',breakStroke);window.removeEventListener('pointerdown',breakStroke);
      window.removeEventListener('scroll',scroll,true);document.removeEventListener('visibilitychange',visibility);
      motion.removeEventListener('change',preferences);fine.removeEventListener('change',preferences);toggle?.removeEventListener('click',toggleClick);
      sizeObserver.disconnect();intersection.disconnect();canvas.remove();stamps=[];density.clear();
    }
  };
}
