/** Passive, bounded crayon marks. Mount underneath the existing card renderer. */
// Separate from the `fine`/`motion` media queries checked per-instance
// below — those gate the INTERACTIVE hover-drawing feature (which
// genuinely doesn't apply on touch), whereas this gates the one-time
// procedural flourish (see drawProceduralFlourish) that exists BECAUSE
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
  holdSeconds: 24, fadeSeconds: 32, maxStamps: 1800, densityLimit: 400
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

export function mountCrayonTrails(hero, {
  surface = hero, toggle = null, color = null, seed = Math.floor(Math.random()*4294967295),
  getExclusionRects = () => [], isPointBlocked = () => false, isBusy = () => false,
  isPaperPoint = () => true, ...overrides
} = {}) {
  const cfg = { ...CRAYON_DEFAULTS, ...overrides };
  const random = makeRandom(seed);
  const chosenColor = color || CRAYON_COLORS[Math.floor(random()*CRAYON_COLORS.length)];
  const canvas = document.createElement('canvas');
  canvas.className = 'crayon-trails';
  canvas.setAttribute('aria-hidden', 'true');
  surface.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); throw new Error('2D canvas is unavailable.'); }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let enabled = fine.matches && !motion.matches;
  let disposed = false, visible = true, paused = false;
  let width = 1, height = 1, dpr = 1, raf = 0, fadeTimer = 0;
  let previous = null, smooth = null, traveled = 0, phase = 0, smoothAngle = null;
  let stamps = [], density = new Map();
  const brushes = Array.from({length: 7}, () => {
    const brush = document.createElement('canvas'); brush.width = brush.height = 64;
    const ink = brush.getContext('2d');
    ink.fillStyle = chosenColor;
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
    toggle.setAttribute('aria-pressed', String(enabled));
    // A minimal dot has no room for a visible label — aria-label keeps it
    // announced correctly for screen readers/keyboard users regardless.
    toggle.setAttribute('aria-label', `Crayon trails ${enabled ? 'on' : 'off'}`);
    toggle.style.setProperty('--crayon-color', chosenColor);
  }
  function cancelWork() { cancelAnimationFrame(raf); clearTimeout(fadeTimer); raf=0; fadeTimer=0; }
  function clear() { stamps=[]; density.clear(); breakStroke(); cancelWork(); ctx.clearRect(0,0,width,height); }
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
    const life=(cfg.holdSeconds+cfg.fadeSeconds)*1000;
    stamps=stamps.filter(s=>now-s.time<life);
    ctx.clearRect(0,0,width,height);
    for (const s of stamps) {
      const fade=opacityAt((now-s.time)/1000,cfg.holdSeconds,cfg.fadeSeconds);
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
    if (stamps.length && visible && !document.hidden) fadeTimer=setTimeout(schedule,150);
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
    paint();
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
  const toggleClick=()=>setEnabled(!enabled);
  const preferences=()=>{setEnabled(fine.matches&&!motion.matches);};
  const visibility=()=>{breakStroke();if(document.hidden)cancelWork();else schedule();};
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
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelWork();breakStroke();}});
  intersection.observe(hero);
  resize();updateToggle();
  // Touch has no hover to draw the interactive marks with at all (see
  // `enabled`'s own fine/motion check above), so instead of nothing, a
  // procedural "ghost hand" keeps doodling on its own — a generated
  // curve, not a recorded gesture, fed through the exact same stamp/
  // paint/hold-fade pipeline real strokes use, so it reads as the same
  // kind of mark, not a different visual system. Ongoing, not one-time:
  // it keeps adding new loops for as long as the hero is visible, at a
  // slow, unhurried pace, while the EXISTING hold/fade lifecycle
  // (cfg.holdSeconds/fadeSeconds — unchanged, the same ones a real
  // continuous stroke ages out on) fades the oldest part of the trail as
  // new parts get drawn — the same bounded "how much is visible at once"
  // desktop's own interactive marks already have for a long continuous
  // doodle, rather than one flourish that draws in once and then sits
  // there statically. Deliberately independent of the `enabled` toggle
  // above (that's about a mouse user turning the interactive feature
  // off — there's nothing here for a touch visitor to have "drawn" to
  // begin with). Still respects prefers-reduced-motion.
  if (isTouchDevice && !motion.matches) requestAnimationFrame(startGhostDoodle);

  function startGhostDoodle() {
    if (disposed) return;
    const spacing = Math.max(1.4, cfg.width * 0.1);
    // How fast the virtual pen moves, in px/sec — slow and unhurried,
    // like an idle doodle rather than a rushed reveal.
    const drawSpeedPxPerSec = 20;
    let px = width * (0.2 + random() * 0.6);
    let py = (surface.clientHeight || height) * (0.2 + random() * 0.6);
    let angle = random() * Math.PI * 2;
    let queue = [];
    let stampBudget = 0;
    let lastTime = performance.now();

    // One loop's worth of stamps, continuing from wherever the pen
    // currently is (not restarting somewhere random each time) — this
    // continuity, not the loop shape itself, is what makes it read as
    // one hand wandering around rather than repeated separate marks.
    function generateNextLoop() {
      const visibleH = surface.clientHeight || height;
      // Softly steers back toward the middle of the visible area once
      // the pen drifts too close to an edge, instead of a hard bounce —
      // keeps the doodle roaming broadly without ever fully wandering
      // off-canvas.
      const marginX = width * 0.12, marginY = visibleH * 0.12;
      let biasAngle = null;
      if (px < marginX || px > width - marginX || py < marginY || py > visibleH - marginY) {
        biasAngle = Math.atan2(visibleH / 2 - py, width / 2 - px);
      }
      const dir = random() < 0.5 ? 1 : -1;
      const radius = 34 * (0.65 + random() * 0.4);
      const radiusY = radius * (0.55 + random() * 0.25);
      const sweep = Math.PI * 2 * (0.55 + random() * 0.55);
      const loopAngle = biasAngle !== null ? biasAngle + (random() - 0.5) * 0.8 : angle;
      const raw = [];
      const steps = 26;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const a = loopAngle + dir * sweep * u;
        // A real scribbling hand never traces a perfectly smooth curve —
        // small per-step wobble on top of the ellipse itself.
        const wobble = (random() - 0.5) * radius * 0.08;
        raw.push({ x: px + Math.cos(a) * (radius + wobble), y: py + Math.sin(a) * (radiusY + wobble) });
      }
      angle = loopAngle + dir * sweep + (random() - 0.5) * 0.7;
      px = raw[raw.length - 1].x;
      py = raw[raw.length - 1].y;
      // Same tangent-angle-from-consecutive-points approach move() uses
      // for real strokes, plus even-arc-length resampling (walk each
      // segment, carry leftover distance into the next) so spacing stays
      // constant regardless of how coarse the raw points are — placing
      // every stamp for a segment at its own endpoint instead, like an
      // earlier version of this did, is what reads as scattered dots
      // rather than a line.
      let smoothAngle = null, distanceToNext = 0;
      for (let i = 1; i < raw.length; i++) {
        const a = raw[i - 1], b = raw[i];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        if (segLen < 0.0001) continue;
        let rawAngle = Math.atan2(b.y - a.y, b.x - a.x);
        if (smoothAngle === null) smoothAngle = rawAngle;
        else {
          let diff = rawAngle - smoothAngle;
          diff = ((diff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
          smoothAngle += diff * 0.5;
        }
        const t = i / raw.length;
        let posAlong = distanceToNext;
        while (posAlong <= segLen) {
          const frac = posAlong / segLen;
          queue.push({
            x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac,
            angle: smoothAngle + (random() - 0.5) * 0.05,
            size: cfg.width * (0.85 + 0.15 * Math.sin(t * 10)),
            alpha: cfg.opacity
          });
          posAlong += spacing;
        }
        distanceToNext = posAlong - segLen;
      }
    }

    (function tick(now) {
      if (disposed) return;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      if (visible && !document.hidden) {
        if (queue.length < 40) generateNextLoop();
        stampBudget += (drawSpeedPxPerSec * dt) / spacing;
        while (stampBudget >= 1 && queue.length) {
          stampBudget -= 1;
          const p = queue.shift();
          stamps.push({ x: p.x, y: p.y, time: now, angle: p.angle, size: p.size, alpha: p.alpha, brush: Math.floor(random() * brushes.length) });
        }
        paint();
        // paint()'s own tail (see its definition above) schedules a
        // fadeTimer->schedule() continuation any time stamps exist,
        // meant for the interactive marks' own "keep fading after the
        // cursor stops moving" case — redundant here since this rAF loop
        // already owns redrawing every frame on its own. Clearing it
        // stops that second, independent scheduling path from also
        // calling paint() again a moment later.
        clearTimeout(fadeTimer);
        fadeTimer = 0;
      }
      requestAnimationFrame(tick);
    })(lastTime);
  }

  return {
    canvas, color: chosenColor, clear, setEnabled,
    pause(value=true) {paused=value;breakStroke();},
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
