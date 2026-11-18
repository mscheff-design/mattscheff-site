// A hand-drawn crayon circle around a piece of heading text, in the same wax
// as the hero's crayon trails (same nib recipe and paper tooth as
// crayonTrails.js). It draws itself once, the first time the heading comes
// into view, and redraws in place (without animating) on resize.
//
//   circleWithCrayon(spanEl, { color })
//
// The canvas is absolutely positioned over the span's parent (made
// position:relative here) and never takes pointer events, so the heading's
// own button keeps working exactly as before.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeRandom(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
}

function makeBrushes(color, random) {
  return Array.from({ length: 7 }, () => {
    const brush = document.createElement('canvas'); brush.width = brush.height = 64;
    const ink = brush.getContext('2d');
    ink.fillStyle = color;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const r = Math.hypot((x - 32) / 30, (y - 32) / 25);
      const tooth = random();
      if (r > 1 || tooth < .1 || (r > .86 && tooth < .35)) continue;
      ink.globalAlpha = Math.min(1, (1 - r) * 7) * (.85 + .15 * Math.sin(y * 1.6)) * (.32 + tooth * .48);
      ink.fillRect(x, y, 1, 1);
    }
    return brush;
  });
}

function makeTooth(random) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const t = c.getContext('2d'); t.fillStyle = '#000';
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    if (random() > .32) continue;
    t.globalAlpha = .08 + random() * .23; t.fillRect(x, y, 1, 1);
  }
  return c;
}

export function circleWithCrayon(span, { color = '#df4931', width = 13, opacity = .62, padX = 40, padY = 30, duration = 950 } = {}) {
  if (!span) return null;
  const host = span.parentElement;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'crayon-circle';
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none', zIndex: '0' });
  // Appended, not prepended: the host's own CSS styles its children by
  // position (:first-child, :nth-child), which a leading canvas would shift.
  host.append(canvas);
  const ctx = canvas.getContext('2d');

  // One hand per page load: the start point, wobble and overshoot vary a
  // little each visit, like the hero's crayon colour does.
  const seed = Math.floor(Math.random() * 4294967295);
  const random = makeRandom(seed);
  const brushes = makeBrushes(color, random);
  const tooth = ctx.createPattern(makeTooth(random), 'repeat');
  const shape = {
    start: -2.5 + random() * .5,         // upper left
    turns: 1.1 + random() * .08,         // runs past its start, like a quick loop
    tilt: -.05 + random() * .04,
    wob: random() * 6.28,
    grow: .05 + random() * .04           // the overshoot drifts outward, so the ends don't meet
  };

  let stamps = [], w = 0, h = 0, revealed = false, raf = 0;

  function layout() {
    const hr = host.getBoundingClientRect(), sr = span.getBoundingClientRect();
    if (!sr.width) return false;
    w = Math.ceil(sr.width + padX * 2); h = Math.ceil(sr.height + padY * 2);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.style.left = (sr.left - hr.left - padX) + 'px';
    canvas.style.top = (sr.top - hr.top - padY) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The loop: an ellipse just outside the text with a gentle wobble, a
    // slight tilt, and a radius that creeps outward over the final stretch.
    // Horizontal reach past the text: 20px, less where the heading sits near
    // the screen edge (phones), so the loop's outer edge stays on screen.
    const extX = Math.max(8, Math.min(20, sr.left - 9));
    const grow = shape.grow * extX / 20;
    const cx = w / 2, cy = h / 2, rx = sr.width / 2 + extX, ry = sr.height / 2 + 13;
    const total = shape.turns * Math.PI * 2, steps = 420;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, a = shape.start + total * u;
      const k = 1 + .035 * Math.sin(a * 2 + shape.wob) + grow * Math.max(0, u - .82) / .18;
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push({ x: cx + x * Math.cos(shape.tilt) - y * Math.sin(shape.tilt), y: cy + x * Math.sin(shape.tilt) + y * Math.cos(shape.tilt) });
    }
    // Stamp it with the trail's recipe: dense round nib, smoothed heading,
    // a slow pressure swing, a soft start and a lighter, lifting finish.
    stamps = [];
    const spacing = Math.max(1.2, width * .1);
    let travelled = 0, carry = 0, heading = null;
    const length = pts.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      if (heading === null) heading = ang;
      else { let d = ang - heading; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; heading += d * .28; }
      let along = carry;
      while (along <= len) {
        const t = along / len, dist = travelled + along;
        const taper = Math.min(1, dist / 14, (length - dist) / 26);
        stamps.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: heading + (random() - .5) * .04,
          size: width * (.92 + .05 * Math.sin(dist * .018)), alpha: opacity * Math.max(.2, taper),
          brush: brushes[Math.floor(random() * brushes.length)], f: dist / length });
        along += spacing;
      }
      carry = along - len; travelled += len;
    }
    return true;
  }

  function paint(progress) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stamps) {
      if (s.f > progress) break;
      ctx.globalAlpha = s.alpha;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
      ctx.drawImage(s.brush, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = tooth; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  function reveal() {
    if (revealed || !layout()) return;
    revealed = true;
    if (reducedMotion()) { paint(1); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      paint(t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      raf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  }

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(reveal, 180); }
  }, { threshold: .9 });
  io.observe(span);

  const ro = new ResizeObserver(() => { if (revealed && !raf && layout()) paint(1); });
  ro.observe(host);

  return { destroy() { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); canvas.remove(); } };
}
