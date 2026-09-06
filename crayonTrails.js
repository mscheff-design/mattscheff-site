/** Passive, bounded crayon marks. Mount underneath the existing card renderer. */
export const CRAYON_COLORS = ['#df4931', '#2850ac', '#dcb719', '#1f7a54'];
export const CRAYON_DEFAULTS = {
  width: 17, opacity: .46, gestureThreshold: 12, drawLength: 400, gapLength: 0,
  holdSeconds: 24, fadeSeconds: 32, maxStamps: 1800, densityLimit: 70
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
    const nextDpr=Math.min(window.devicePixelRatio||1,2);
    if (nextWidth===width && nextHeight===height && dpr===nextDpr) return;
    width=nextWidth; height=nextHeight; dpr=nextDpr;
    // Setting canvas.width/height wipes the bitmap immediately — during a
    // continuous size change (the backdrop's own height transition fires
    // this every frame), leaving the redraw to a separately-scheduled rAF
    // left a real gap where the browser could composite the now-blank
    // canvas before that rAF ran, reading as a flicker through the whole
    // transition. Repainting synchronously, in the same tick as the
    // resize, closes that gap.
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    breakStroke(); density.clear();
    cancelWork();
    paint();
  }
  function move(event) {
    if (!enabled || !visible || paused || document.hidden || event.pointerType==='touch' || event.buttons || isBusy()) {breakStroke();return;}
    const target=event.target;
    if (target?.closest?.('a,button,input,textarea,select,[data-crayon-ignore]')) {breakStroke();return;}
    const rect=surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x=(event.clientX-rect.left)*width/rect.width, y=(event.clientY-rect.top)*height/rect.height;
    const excluded=getExclusionRects();
    const blocked=(px,py)=>{
      const cx=rect.left+px*rect.width/width,cy=rect.top+py*rect.height/height;
      // Absolute canvas px, not a fraction of the canvas's own (dynamic)
      // width/height — the host's wood-corner geometry is pinned to a
      // fixed-size region that doesn't grow when this canvas does, so a
      // fraction of the CURRENT canvas size would drift out of alignment
      // with it as soon as the canvas resizes taller.
      return excluded.some(r=>insideRect(cx,cy,r,6)) || isPointBlocked(cx,cy) || !isPaperPoint(px,py);
    };
    if (x<0 || y<0 || x>width || y>height || blocked(x,y)) {breakStroke();return;}
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
    // fluid stroke instead of tracking the cursor almost 1:1.
    const to={x:from.x+(x-from.x)*.42,y:from.y+(y-from.y)*.42};
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
      smoothAngle+=diff*0.35;
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
      // A per-area pigment budget decays, so circling never makes a solid blob.
      const key=`${Math.floor(px/48)},${Math.floor(py/48)}`;
      const old=density.get(key)||{amount:0,time};
      const amount=old.amount*Math.exp(-(time-old.time)/12000);
      if (amount>cfg.densityLimit) continue;
      density.set(key,{amount:amount+1,time});
      const edgeDistance=Math.min(px/width,1-px/width,py/height,1-py/height);
      const marginWeight=.42+.58*Math.max(0,1-edgeDistance/.32);
      const taper=cfg.gapLength>0 ? Math.min(1,along/18,(cfg.drawLength-along)/24) : Math.min(1,phase/14);
      const pressure=.88+.09*Math.sin(phase*.018)+.03*Math.sin(phase*.09);
      // Half the original ±0.08rad jitter — less scratchy zig-zag along
      // the stroke, closer to one continuous waxy line.
      stamps.push({x:px,y:py,time,angle:angle+(random()-.5)*.04,
        size:cfg.width*pressure,alpha:cfg.opacity*marginWeight*taper*(1-amount/(cfg.densityLimit*1.3)),brush:Math.floor(random()*brushes.length)});
    }
    if(stamps.length>cfg.maxStamps) stamps.splice(0,stamps.length-cfg.maxStamps);
    schedule();
  }
  const toggleClick=()=>setEnabled(!enabled);
  const preferences=()=>{setEnabled(fine.matches&&!motion.matches);};
  const visibility=()=>{breakStroke();if(document.hidden)cancelWork();else schedule();};
  const scroll=()=>breakStroke();
  hero.addEventListener('pointermove',move,{passive:true});
  hero.addEventListener('pointerleave',breakStroke,{passive:true});
  hero.addEventListener('pointerdown',breakStroke,{passive:true});
  window.addEventListener('scroll',scroll,{passive:true,capture:true});
  document.addEventListener('visibilitychange',visibility);
  motion.addEventListener('change',preferences); fine.addEventListener('change',preferences);
  toggle?.addEventListener('click',toggleClick);
  const sizeObserver=new ResizeObserver(resize); sizeObserver.observe(surface);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelWork();breakStroke();}});
  intersection.observe(hero);
  resize();updateToggle();
  return {
    canvas, color: chosenColor, clear, setEnabled,
    pause(value=true) {paused=value;breakStroke();},
    get enabled(){return enabled;},
    get markCount(){return stamps.length;},
    destroy(){
      if(disposed)return;disposed=true;cancelWork();
      hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',breakStroke);hero.removeEventListener('pointerdown',breakStroke);
      window.removeEventListener('scroll',scroll,true);document.removeEventListener('visibilitychange',visibility);
      motion.removeEventListener('change',preferences);fine.removeEventListener('change',preferences);toggle?.removeEventListener('click',toggleClick);
      sizeObserver.disconnect();intersection.disconnect();canvas.remove();stamps=[];density.clear();
    }
  };
}
