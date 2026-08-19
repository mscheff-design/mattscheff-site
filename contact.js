/**
 * initContactForm(opts) builds and runs the "leave a note" contact form
 * that lives in a fixed region of the card's own BACK face (below the
 * contact info/social row — the back face itself never extends or moves
 * anything; see card.js's own doc comment for why that's deliberate).
 * Self-contained: owns its own DOM (a CSS-3D-transformed panel kept in
 * sync with the card's actual Three.js transform every frame), its own
 * injected stylesheet, and all form/submission state. card.js owns the
 * Three.js scene and only ever hands this module a few read hooks and one
 * write hook (focus suspension) — it never reaches into card.js's
 * internals, and card.js never reaches into this module's DOM.
 *
 * Why a real DOM form instead of a canvas texture (like the résumé tab):
 * canvas-drawn "fields" can't be typed into. The card's own front/back
 * faces stay canvas-drawn (they're just text), but this panel is a CSS-3D
 * overlay kept pinned to the card's own rendered canvas box every frame,
 * so it sits, tilts, and slides with the card exactly — while the actual
 * <input> elements remain normal, focusable, native DOM nodes the whole
 * time (crisp text at any zoom, real caret/selection, real autofill).
 *
 * Position is rebuilt from scratch every frame from hostEl's own current
 * size (never anything cached or read off another element that might
 * itself be stale) plus card.js's own camera and pixelsPerWorldUnit
 * constant. Several bugs, each found by actually reproducing the panel
 * drifting away from the card rather than by inspection alone, ruled out
 * plausible-looking approaches before landing here:
 *
 *  - getBoundingClientRect() (an early version used this, on the canvas
 *    and stage): it returns viewport-space coordinates, which only equal
 *    the *local* (containing-block-relative) coordinates style.left/top
 *    are interpreted in when nothing between them applies a zoom/scale.
 *    Under real browser zoom that stops being true, and the panel ends up
 *    drifting from the card by an amount that grows with zoom level.
 *  - reading size from `stage` itself (the next version): stage's own
 *    width/height get explicitly written to further down
 *    (`stage.style.width = w + 'px'`) to give it a known box for the CSS
 *    3D math. But a `position:absolute;inset:0` element's explicit width,
 *    once set, determines its size from then on — the insets stop
 *    mattering. Reading stage.clientWidth as the resize signal meant
 *    reading back exactly what this same code last wrote to it: the very
 *    first write "locked" stage's size, and no resize or zoom afterward
 *    could ever be detected again. hostEl (interactionRoot) is never
 *    written to by this module, so it stays a genuine, always-current
 *    ground truth — that's specifically why w/h are read from it, not
 *    from stage, even though stage is kept sized to match.
 *  - splitting position (an affine X/Y-to-px scale off the anchor's world
 *    position, later patched with a manual perspective-divide for its Z)
 *    from orientation (Matrix4.extractRotation(), rendered through a
 *    separate CSS `perspective`+`perspective-origin`) worked exactly at
 *    the anchor's own single point, by construction — but a flat panel
 *    isn't a point. Comparing the panel's actual rendered corners against
 *    the camera's own true projection of the same world points
 *    (Vector3.project) showed a real gap that grows with tilt angle: CSS
 *    `perspective`'s single-distance model doesn't reproduce Three's
 *    actual FOV/aspect projection precisely enough across the panel's own
 *    extent once the card rotates. Rotation was right; the *shape* of the
 *    perspective wasn't — which read as the panel's lines "seesawing"
 *    against the card instead of tilting as one rigid surface.
 *  - Three's `.project(camera)` for position only (the version just
 *    before this one) hit that same perspective-shape gap, for the same
 *    reason: it only corrected a single point.
 *
 * The current approach reads camera.projectionMatrix and
 * .matrixWorldInverse directly and composes them with the anchor's own
 * matrixWorld into one matrix3d (see update()) — genuinely the camera's
 * own projection, not a reconstruction of it, so it's correct across the
 * panel's whole extent, not just its center. This does read live
 * properties off the camera object, which an even earlier version
 * avoided specifically because camera.projectionMatrix only gets
 * refreshed inside card.js's handleResize() — a separate callback
 * (ResizeObserver) not guaranteed to run before the frame that reads it.
 * That's safe here because of *where* this runs: card.js's tick() calls
 * handleResize() (refreshing the projection matrix) before
 * renderer.render() (refreshing matrixWorldInverse) before
 * contactForm.update() — by construction, the camera this reads is
 * already the same one the frame was just rendered with.
 *
 * opts:
 *   THREE           - the Three.js module card.js already imported
 *   pixelsPerWorldUnit - card.js's one fixed world-units-to-CSS-px
 *                     constant (never viewport-dependent by construction)
 *   camera          - the scene's camera, read for its live
 *                     projectionMatrix/matrixWorldInverse only after
 *                     card.js's own render pass has refreshed them for
 *                     this frame (see above) — never cached across frames
 *   anchor          - a THREE.Object3D fixed by card.js at the exact spot
 *                     (and 1/PIXELS_PER_WORLD_UNIT scale) the form's
 *                     visual center should sit; parented under the back
 *                     cap itself, so it automatically inherits the
 *                     back-face mirroring and (further up the chain) the
 *                     card's drag/tilt/flip/lift transforms. It never
 *                     moves on its own the way the old note-tab anchor
 *                     used to — the back face doesn't extend.
 *   hostEl          - element to mount the CSS-3D stage into (card.js
 *                     passes interactionRoot, the same element the WebGL
 *                     canvas is absolutely positioned inside)
 *   fallbackEmail   - shown in the error state so a failed submit is
 *                     never a dead end
 *   progress()      - 0 or 1: whether the back face is actually the one
 *                     showing and settled (0 mid-flip or while the front
 *                     is up). Binary, not a slide-driven ramp — the back
 *                     face doesn't extend, so the form has nothing of its
 *                     own to lag behind. This no longer drives visibility
 *                     (see update()'s own comment) — it only gates
 *                     pointer-events/focus and, on mobile, the plain
 *                     display toggle.
 *   backActive()    - true whenever the back cap could conceivably be
 *                     facing the camera (flipped or mid-flip either way);
 *                     false while the card just sits resting on the
 *                     front. Gates the entire per-frame matrix/facing-test
 *                     block in update() — resting on the front is the vast
 *                     majority of every session, and none of that math has
 *                     anything to do while the back can't possibly be
 *                     showing, so skipping it there (rather than computing
 *                     it and hiding the result) avoids a continuous,
 *                     pointless matrix-multiply + style.transform write
 *                     every single frame.
 *   isCardSettled() - true when the card isn't mid drag/tween/flip;
 *                     gates submit so Enter can't fire mid-animation
 *   onFocusChange(hasFocus) - called when any field gains/loses focus, so
 *                     card.js can suspend/resume ambient sway, hover
 *                     tilt, and drag-initiation while someone is typing
 *   tabWidthPx,
 *   tabHeightPx     - the form's own reserved region on the back face (its
 *                     world-unit size run through card.js's fixed
 *                     pixels-per-world-unit constant). The panel's CSS box
 *                     is set to exactly this size, once, with overflow
 *                     hidden — pegging the clip region itself to that
 *                     region's true geometry so the form can never render
 *                     past its own edge into the contact info above it.
 *
 * returns { update(), blurActive() }
 *   update()      - call once per render frame (after renderer.render(),
 *                   so camera/anchor matrices are current) to refresh the
 *                   panel's CSS transform and visibility
 *   blurActive()  - if a field currently holds focus, blurs it and
 *                   returns true; otherwise returns false. card.js's
 *                   Escape handler calls this first, before its own
 *                   existing close-the-tab behavior, per the requested
 *                   key-handling hierarchy.
 */

const MOBILE_BREAKPOINT_PX = 640;
const CONTACT_ENDPOINT = '/api/contact';

export function initContactForm(opts) {
  const {
    THREE, pixelsPerWorldUnit, camera, anchor, hostEl,
    fallbackEmail,
    progress,
    backActive,
    isCardSettled,
    onFocusChange,
    tabWidthPx, tabHeightPx
  } = opts;

  injectStyles();

  /* ---------- DOM: CSS-3D stage (desktop) + plain fallback (mobile) ---------- */

  // stage: a perspective-bearing, always-present, pointer-events:none
  // layer the same size as the canvas. Only the form panel inside it ever
  // takes pointer events, and only once it's actually visible — so it
  // never blocks drags anywhere else on the card.
  const stage = document.createElement('div');
  stage.className = 'contact3d-stage';
  hostEl.appendChild(stage);

  const panel = document.createElement('div');
  panel.className = 'contact3d-panel';
  stage.appendChild(panel);

  // The clip box is pegged to the tab's *actual* physical footprint
  // (tabWidthPx/tabHeightPx — the same world-space tab size card.js builds
  // the résumé tab from, converted through its one fixed
  // pixels-per-world-unit constant), with overflow hidden — it's
  // geometrically impossible for the form to render past the tab's own
  // edge into the card above it, regardless of how tall the form's content
  // gets (a wrapped error message, an autofilled long email) or what point
  // mid-animation it's caught at. It's a plain (non-3D) child of the panel
  // that already carries the position/rotation, deliberately: WebKit is
  // known to ignore `overflow:hidden` on an element that itself is a 3D
  // transform target (or has transform-style:preserve-3d), so the clip has
  // to live one level below that, on an element with no 3D styling of its
  // own — it just inherits the already-3D-transformed parent visually.
  const clip = document.createElement('div');
  clip.className = 'contact3d-clip';
  if (tabWidthPx && tabHeightPx) {
    clip.style.width = tabWidthPx + 'px';
    clip.style.height = tabHeightPx + 'px';
  }
  panel.appendChild(clip);

  const { formEl, els, setState } = buildFormDOM(fallbackEmail);
  clip.appendChild(formEl);

  /* ---------- focus -> physics suspension ---------- */

  formEl.addEventListener('focusin', () => onFocusChange(true));
  formEl.addEventListener('focusout', () => {
    // deferred so a focus move *between* two fields in the same form
    // (blur then focus) doesn't cause a spurious resume in between
    setTimeout(() => {
      if (!formEl.contains(document.activeElement)) onFocusChange(false);
    }, 0);
  });

  function blurActive() {
    const el = document.activeElement;
    if (el && formEl.contains(el)) {
      el.blur();
      return true;
    }
    return false;
  }

  /* ---------- submission ---------- */

  let state = 'idle'; // idle | submitting | success | error

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Enter (or the button) firing mid drag/tween/flip is exactly the
    // "reads as broken" case the card's own physics work hard to avoid —
    // simplest fix is to just not submit until the card is settled.
    if (!isCardSettled()) return;
    if (state === 'submitting') return;

    // honeypot: real visitors never fill in a field that's off-screen and
    // unreachable by tab order. If it's populated, pretend success
    // without ever hitting the network.
    if (els.company.value.trim()) {
      state = 'success';
      setState('success');
      return;
    }

    state = 'submitting';
    setState('submitting');

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: els.name.value.trim(),
          email: els.email.value.trim(),
          message: els.message.value.trim()
        })
      });

      if (!res.ok) {
        let message = 'Something went wrong sending that.';
        try {
          const data = await res.json();
          if (data && data.message) message = data.message;
        } catch (_) { /* non-JSON error body — keep the default message */ }
        state = 'error';
        setState('error', message);
        return;
      }

      state = 'success';
      setState('success');
    } catch (_) {
      state = 'error';
      setState('error', 'Couldn’t reach the server — check your connection and try again.');
    }
  });

  /* ---------- CSS-3D sync (desktop) ---------- */
  //
  // The panel's transform is built as ONE matrix3d that is card.js's own
  // camera projection, reproduced exactly — not an approximation of it.
  //
  // An earlier version computed position (an affine X/Y-to-px scale, later
  // patched with a manual perspective-divide for the anchor's own Z) and
  // orientation (Matrix4.extractRotation(), rendered through a separate
  // CSS `perspective`) as two independent pieces. That worked at the
  // anchor's own single point by construction, but a *flat panel* isn't a
  // point — it has extent, and CSS's `perspective` model, driven by a
  // single distance-in-px number standing in for the camera, doesn't
  // reproduce Three's actual FOV/aspect-based projection precisely enough
  // across that extent once the card is rotated: comparing the panel's
  // rendered corners against the camera's own true projection of the same
  // world points (Vector3.project) showed a real, measurable gap that
  // *grows with tilt angle* — a few percent at a large test tilt, present
  // at any nonzero rotation, invisible at zero. That's exactly the
  // "reacts to movement but the motion doesn't align" symptom: rotation
  // was right, the *shape* of the perspective wasn't.
  //
  // The fix is to stop approximating the camera and just use it: compose
  //   local panel px  →  anchor-local world units (unit/flip fix)
  //                   →  world space (anchor.matrixWorld)
  //                   →  view space (camera.matrixWorldInverse)
  //                   →  clip space (camera.projectionMatrix)
  //                   →  CSS px from the stage's own center
  // into a single 4×4, and hand it to the browser as one matrix3d. CSS's
  // own W-divide on that matrix then IS the camera's perspective divide,
  // not a stand-in for it, so it's correct for every point on the panel,
  // not just its center — no separate `perspective`/`perspective-origin`
  // needed at all.
  //
  // This is the same `.project(camera)` approach an early version of this
  // module tried and abandoned (see the module doc comment) — but that
  // attempt read camera.projectionMatrix directly on every frame with no
  // guarantee card.js's own resize handling had refreshed it first. Here,
  // card.js's tick() already calls handleResize() (which refreshes the
  // camera) before rendering and before contactForm.update() — by the
  // time this runs, the camera the frame just rendered with and the
  // camera read here are guaranteed to be the same one.
  const mvpMatrix = new THREE.Matrix4();
  // Facing test (is the anchor's own face turned toward the camera right
  // now?), used to show/hide the panel every frame — see the comment
  // where these are used, in update(), for why this is done as an
  // explicit dot product rather than CSS backface-visibility.
  const worldNormal = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const anchorWorldPos = new THREE.Vector3();
  // local panel px (Y-down, origin at panel's own center, post
  // translate(-50%,-50%)) → anchor-local world units (Y-up): a fixed
  // scale, computed once, since neither the unit conversion nor the
  // CSS-vs-Three Y convention ever changes.
  const pxToWorld = new THREE.Matrix4().makeScale(1 / pixelsPerWorldUnit, -1 / pixelsPerWorldUnit, 1);
  const ndcToPx = new THREE.Matrix4();
  let lastW = 0, lastH = 0;
  let cachedCanvasCenterX = 0, cachedCanvasCenterY = 0;

  // w/h are always the fresh hostEl-derived values from update() (see the
  // comment on why hostEl and not stage) — the canvas fills hostEl exactly
  // (`inset:0`), and stage is kept sized to match it, so the canvas's
  // center in stage's own local coordinate space (exactly what
  // panel.style.left/top need) is trivially w/2, h/2. No
  // getBoundingClientRect() anywhere: that returns viewport-space
  // coordinates, which only equal the *local* (containing-block-relative)
  // coordinates style.left/top are interpreted in when nothing between
  // them applies a zoom/scale — under real browser zoom that stops being
  // true, and a getBoundingClientRect()-based value assigned to
  // style.left/top ends up with the zoom factor applied a second time.
  function recomputeCanvasGeometry(w, h) {
    cachedCanvasCenterX = w / 2;
    cachedCanvasCenterY = h / 2;
    // NDC → CSS px *from the stage's own center* (not from its top-left):
    // panel is pinned at (cachedCanvasCenterX, cachedCanvasCenterY) below,
    // so the matrix's own output should already be "how far from there",
    // with no separate offset term — X keeps NDC's sign (right stays
    // right); Y flips (NDC +Y is up, CSS +Y is down).
    ndcToPx.makeScale(w / 2, -h / 2, 1);
  }

  let interactive = false;

  function update() {
    // hostEl (interactionRoot), not stage: stage's own width/height get
    // explicitly written to below (`stage.style.width = w + 'px'`), and
    // once a `position:absolute;inset:0` element has an explicit width
    // set, that width — not the insets — determines its size from then
    // on. Reading stage.clientWidth here would be reading back exactly
    // what this same code last wrote to it, so `w !== lastW` could never
    // fire again after the first frame — a real resize or zoom afterward
    // would just silently stop updating. hostEl is never written to, so
    // its size always reflects genuine, current layout.
    const w = hostEl.clientWidth, h = hostEl.clientHeight;
    if (!w || !h) return;

    const mobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    stage.classList.toggle('is-mobile', mobile);

    // p is binary (0 or 1) — the back face is a fixed region, not a slide,
    // so there's no ramp to compute here. It no longer drives visibility
    // on desktop (see the transform block below for why); it still gates
    // interactivity and, on mobile, the plain display toggle.
    const p = progress();
    stage.classList.toggle('is-visible', p > 0); // mobile's display toggle only

    const nextInteractive = p > 0;
    if (nextInteractive !== interactive) {
      interactive = nextInteractive;
      panel.style.pointerEvents = interactive ? 'auto' : 'none';
      if (!interactive) blurActive();
    }

    if (mobile) return;

    // The back cap can only possibly be facing the camera while flipped
    // or mid-flip (see backActive's own doc comment) — resting on the
    // front, none of the matrix/facing-test work below has anything to
    // do, so it's skipped entirely rather than computed and then hidden.
    // The panel is already invisible by the time this can go false (the
    // facing test below flips it well before the flip tween itself
    // finishes — see toggleFlip), so there's no visible discontinuity
    // from stopping here; this purely removes now-pointless per-frame
    // work for the (vast majority of) time the card just sits idle.
    if (!backActive()) {
      if (panel.style.visibility !== 'hidden') panel.style.visibility = 'hidden';
      return;
    }

    if (w !== lastW || h !== lastH) {
      stage.style.width = w + 'px';
      stage.style.height = h + 'px';
      lastW = w; lastH = h;
      // the canvas's on-screen box just changed size — refresh the cached
      // geometry derived from it (see recomputeCanvasGeometry's own
      // comment). lastW/lastH start at 0, so this also covers the very
      // first frame the panel becomes visible.
      recomputeCanvasGeometry(w, h);
      // panel is always pinned at the stage's own center — the matrix
      // built below carries the *entire* position/rotation/perspective
      // relative to that one fixed point, so left/top never need to
      // track the anchor themselves any more.
      panel.style.left = cachedCanvasCenterX + 'px';
      panel.style.top = cachedCanvasCenterY + 'px';
    }

    // Runs every frame regardless of p, including mid-flip: the anchor is
    // a real child of backCap (see opts doc), so its matrixWorld already
    // carries the card's live rotation at whatever point the flip tween
    // is currently at — recomputing the matrix here on every frame,
    // rather than only once flipped/settled, is what makes the panel
    // physically spin with the card instead of popping into its resting
    // pose once the card has already finished turning.
    anchor.updateMatrixWorld(true);

    // Visibility is no longer a separate opacity fade gated by p — it's a
    // per-frame facing test, so the panel shows/hides at the same instant
    // the WebGL back cap itself would stop facing the camera, in lockstep
    // with the card's live rotation rather than only at the two tween
    // endpoints. This was first tried as CSS backface-visibility:hidden
    // on the panel (free, and the standard trick for CSS card flips) —
    // but that test is defined for an ordinary affine 3D transform
    // (rotateX/Y/translateZ), and panel's transform is a full camera
    // *projection* matrix, not an affine one; against that matrix
    // backface-visibility didn't track the true facing direction at all
    // (the panel showed through, mirrored, even while resting flat on the
    // front). Explicitly transforming the anchor's own local +Z (its
    // outward face normal, since backCap's own rotation.y = Math.PI is
    // already baked into anchor.matrixWorld — see card.js) into world
    // space and dotting it with the direction to the camera reproduces
    // exactly the test the WebGL back-face culling itself is doing, so it
    // can't disagree with what the card's own geometry is doing.
    worldNormal.set(0, 0, 1).transformDirection(anchor.matrixWorld);
    anchor.getWorldPosition(anchorWorldPos);
    toCamera.copy(camera.position).sub(anchorWorldPos);
    panel.style.visibility = worldNormal.dot(toCamera) > 0 ? 'visible' : 'hidden';

    // camera.matrixWorldInverse and .projectionMatrix are both already
    // current: card.js's tick() calls handleResize() (which refreshes
    // the projection matrix) before renderer.render() (which refreshes
    // matrixWorldInverse), and only *then* calls contactForm.update().
    mvpMatrix
      .copy(ndcToPx)
      .multiply(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse)
      .multiply(anchor.matrixWorld)
      .multiply(pxToWorld);

    panel.style.transform = 'translate(-50%,-50%) matrix3d(' + mvpMatrix.elements.join(',') + ')';
  }

  return { update, blurActive };
}

/* ---------- form markup ---------- */

function buildFormDOM(fallbackEmail) {
  const formEl = document.createElement('form');
  formEl.className = 'contact-form';
  formEl.noValidate = true;

  formEl.innerHTML = `
    <div class="cf-fields">
      <div class="cf-field">
        <label for="cf-name">Name</label>
        <input id="cf-name" name="name" type="text" autocomplete="name" required>
      </div>
      <div class="cf-field">
        <label for="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="cf-field">
        <label for="cf-message">Message</label>
        <textarea id="cf-message" name="message" rows="3" required></textarea>
      </div>
      <div class="cf-honeypot" aria-hidden="true">
        <label for="cf-company">Company</label>
        <input id="cf-company" name="company" type="text" tabindex="-1" autocomplete="off">
      </div>
      <button type="submit" class="cf-submit">
        <span class="cf-submit-label">Send note →</span>
      </button>
      <p class="cf-status" role="status" aria-live="polite"></p>
    </div>
    <div class="cf-result" hidden></div>
  `;

  const els = {
    name: formEl.querySelector('#cf-name'),
    email: formEl.querySelector('#cf-email'),
    message: formEl.querySelector('#cf-message'),
    company: formEl.querySelector('#cf-company')
  };
  const fieldsEl = formEl.querySelector('.cf-fields');
  const resultEl = formEl.querySelector('.cf-result');
  const submitBtn = formEl.querySelector('.cf-submit');
  const submitLabel = formEl.querySelector('.cf-submit-label');
  const statusEl = formEl.querySelector('.cf-status');

  function setState(next, message) {
    formEl.dataset.state = next;
    if (next === 'idle') {
      submitBtn.disabled = false;
      submitLabel.textContent = 'Send note →';
      statusEl.textContent = '';
    } else if (next === 'submitting') {
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      statusEl.textContent = '';
    } else if (next === 'success') {
      fieldsEl.hidden = true;
      resultEl.hidden = false;
      resultEl.className = 'cf-result is-success';
      resultEl.textContent = 'Thanks — got it. I’ll get back to you soon.';
    } else if (next === 'error') {
      submitBtn.disabled = false;
      submitLabel.textContent = 'Try again →';
      statusEl.className = 'cf-status is-error';
      statusEl.textContent = (message || 'Something went wrong.') +
        ' You can also reach me directly at ' + fallbackEmail + '.';
    }
  }

  setState('idle');

  return { formEl, els, setState };
}

/* ---------- styles ---------- */

function injectStyles() {
  if (document.getElementById('contact3d-styles')) return;
  const style = document.createElement('style');
  style.id = 'contact3d-styles';
  style.textContent = `
    .contact3d-stage{position:absolute;inset:0;pointer-events:none;overflow:visible;transform-style:preserve-3d;-webkit-transform-style:preserve-3d}

    /* fixed to the tab's own real size (set inline, once, from
       tabWidthPx/tabHeightPx) with overflow hidden — this box IS the tab's
       silhouette as far as the form is concerned, so centering the form
       inside it can never spill past the tab's true edge. Visibility
       (facing-camera test) is computed in JS, not via CSS
       backface-visibility — see update()'s own comment for why. */
    .contact3d-panel{position:absolute;top:0;left:0;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;will-change:transform}

    /* the actual clip: fixed to the form's real reserved region, overflow
       hidden, no 3D styling of its own (see the comment where this is
       built). Tighter than before — the back face no longer has its own
       extended tab, so this region shares the rest of CARD_HEIGHT with
       the contact info/social row above it (see card.js's BACK_* layout
       constants). */
    .contact3d-clip{box-sizing:border-box;padding:0 20px;overflow:hidden;display:flex;align-items:center;justify-content:center}

    /* belt-and-suspenders: if content still somehow exceeds the clip's
       fixed height (a long wrapped error message, an over-full textarea),
       it scrolls inside its own box instead of visually overflowing it */
    .contact-form{width:230px;max-height:100%;overflow-y:auto;font-family:'DM Mono',monospace}
    .cf-field{margin-bottom:7px}
    .cf-field label{display:block;font-family:'DM Mono',monospace;font-size:7.5px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(28,20,10,0.45);margin-bottom:2px}
    .cf-field input,.cf-field textarea{
      display:block;width:100%;border:none;border-bottom:0.5px solid rgba(28,20,10,0.28);
      background:transparent;font-family:'EB Garamond',serif;font-size:12.5px;color:#1c140a;
      padding:1px 0 2px;outline:none;resize:none;line-height:1.25
    }
    .cf-field input:focus,.cf-field textarea:focus{border-bottom-color:#1c140a}
    .cf-field textarea{min-height:26px}

    .cf-honeypot{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}

    .cf-submit{all:unset;display:inline-block;margin-top:0;font-family:'DM Mono',monospace;font-size:8.5px;letter-spacing:0.1em;text-transform:uppercase;color:#1c140a;cursor:pointer;border-bottom:0.5px solid rgba(28,20,10,0.4);padding-bottom:1px;transition:opacity 0.2s ease}
    .cf-submit:hover{border-color:#1c140a}
    .cf-submit:disabled{cursor:default;opacity:0.5}

    .cf-status{margin-top:5px;font-family:'DM Mono',monospace;font-size:7.5px;letter-spacing:0.03em;line-height:1.4;color:rgba(28,20,10,0.55)}
    .cf-status.is-error{color:#a3402a}
    .cf-status.is-error a,.cf-status a{color:inherit}

    .cf-result{font-family:'EB Garamond',serif;font-size:13px;color:#1c140a;line-height:1.4;max-width:210px}

    /* below this width the CSS-3D projection is skipped entirely — the
       card's on-screen footprint is small and its tilt is disabled on
       touch anyway, so a plain in-flow panel reads far better than a
       shrunken, perspective-warped one. */
    .contact3d-stage.is-mobile{position:static;transform:none !important;perspective:none;opacity:1;pointer-events:auto;margin-top:14px}
    .contact3d-stage.is-mobile:not(.is-visible){display:none}
    .contact3d-stage.is-mobile .contact3d-panel{position:static;transform:none !important}
    .contact3d-stage.is-mobile .contact3d-clip{width:auto !important;height:auto !important;overflow:visible;padding:0}
    .contact3d-stage.is-mobile .contact-form{width:100%;max-width:340px;max-height:none;overflow-y:visible;margin:0 auto;pointer-events:auto}
  `;
  document.head.appendChild(style);
}
