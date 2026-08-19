/**
 * initContactForm(opts) builds and runs the "leave a note" contact form
 * that lives inside the résumé-style tab behind the card's BACK face.
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
 * Deliberately NOT built on Three's `.project(camera)` (an earlier version
 * was): that reads camera.projectionMatrix, which only gets refreshed
 * inside card.js's handleResize() — a separate callback (ResizeObserver)
 * that isn't guaranteed to run before the frame that reads it. Mid-resize
 * that gap let this panel's computed position visibly disagree with the
 * card's own on-screen box, which just follows CSS and is never stale.
 * canvasEl.getBoundingClientRect() is that same always-current CSS truth,
 * so building position from it directly — plus the scene's one fixed
 * pixelsPerWorldUnit constant, never anything read off the mutable camera
 * — makes the panel's screen position provably unable to drift from the
 * canvas it's meant to track, instead of merely being re-synced often
 * enough in practice.
 *
 * opts:
 *   THREE           - the Three.js module card.js already imported
 *   canvasEl        - the WebGL renderer's own <canvas> element
 *                     (renderer.domElement) — getBoundingClientRect() on
 *                     this is the ground truth for where the card is on
 *                     screen, right now, no matter what the camera object
 *                     itself is mid-updating to
 *   pixelsPerWorldUnit - card.js's one fixed world-units-to-CSS-px
 *                     constant (never viewport-dependent by construction)
 *   invTanHalfFov   - 1/tan(FOV/2) for the scene's camera; combined with
 *                     canvasEl's own current height, reproduces the CSS
 *                     `perspective` distance the camera's FOV implies,
 *                     again without reading anything off the camera itself
 *   anchor          - a THREE.Object3D positioned/scaled by card.js at the
 *                     exact spot (and 1/PIXELS_PER_WORLD_UNIT scale) the
 *                     form's visual center should sit; parented under the
 *                     same group that slides/mirrors the back tab, so it
 *                     automatically inherits the tab's open/close slide,
 *                     the back-face mirroring, and (further up the chain)
 *                     the card's drag/tilt/flip/lift transforms.
 *   hostEl          - element to mount the CSS-3D stage into (card.js
 *                     passes interactionRoot, the same element the WebGL
 *                     canvas is absolutely positioned inside)
 *   fallbackEmail   - shown in the error state so a failed submit is
 *                     never a dead end
 *   progress()      - card.js's own 0..1 open/close progress for the note
 *                     tab (0 whenever the back face isn't actually the one
 *                     showing, e.g. mid-flip or while the front is up).
 *                     Driving opacity from this directly, every frame,
 *                     instead of toggling visibility off a fixed threshold
 *                     with its own separate CSS fade, is what keeps the
 *                     form disappearing in exact lockstep with the tab
 *                     sliding shut rather than lagging behind it.
 *   isCardSettled() - true when the card isn't mid drag/tween/flip;
 *                     gates submit so Enter can't fire mid-animation
 *   onFocusChange(hasFocus) - called when any field gains/loses focus, so
 *                     card.js can suspend/resume ambient sway, hover
 *                     tilt, and drag-initiation while someone is typing
 *   tabWidthPx,
 *   tabHeightPx     - the note tab's own real width/height (its world-unit
 *                     size run through card.js's fixed
 *                     pixels-per-world-unit constant). The panel's CSS box
 *                     is set to exactly this size, once, with overflow
 *                     hidden — pegging the clip region itself to the tab's
 *                     true geometry so the form can never render past the
 *                     tab's own edge into the card above, no matter what
 *                     its content does or what point in an animation it's
 *                     caught at.
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
    THREE, canvasEl, pixelsPerWorldUnit, invTanHalfFov, anchor, hostEl,
    fallbackEmail,
    progress,
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
  // Position and orientation are handled separately:
  //   - position comes from canvasEl's own current getBoundingClientRect()
  //     (always-correct CSS truth) plus the anchor's world XY times the
  //     fixed pixelsPerWorldUnit constant — see the module doc comment for
  //     why this reads nothing off the mutable camera object.
  //   - orientation (so the panel visibly tilts with the card) comes from
  //     just the anchor's rotation, isolated from its position/scale via
  //     Matrix4.extractRotation(), applied through a `perspective` whose
  //     origin is kept pinned to that same screen position every frame
  const worldPos = new THREE.Vector3();
  const rotationOnly = new THREE.Matrix4();
  let lastW = 0, lastH = 0;

  function epsilon(v) { return Math.abs(v) < 1e-10 ? 0 : v; }

  // conjugates the rotation by a Y-axis reflection (F·R·F): Three's local
  // object space is Y-up, CSS's local element box is Y-down, so the
  // rotation has to be expressed in the flipped basis to look right once
  // CSS applies it "downhill". Only components straddling the Y axis
  // (exactly one of row/col == 1) change sign.
  function rotationCSSMatrix(m) {
    const e = m.elements;
    return 'matrix3d(' +
      epsilon(e[0]) + ',' + epsilon(-e[1]) + ',' + epsilon(e[2]) + ',0,' +
      epsilon(-e[4]) + ',' + epsilon(e[5]) + ',' + epsilon(-e[6]) + ',0,' +
      epsilon(e[8]) + ',' + epsilon(-e[9]) + ',' + epsilon(e[10]) + ',0,' +
      '0,0,0,1)';
  }

  let interactive = false;

  function update() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;

    const mobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    stage.classList.toggle('is-mobile', mobile);

    const p = progress();
    // Opacity tracks the tab's own open/close progress directly, frame by
    // frame — no separate threshold-plus-CSS-transition of its own to lag
    // behind (or race ahead of) the tab actually sliding shut. But the
    // form's own size is fixed while the tab is still only partway out,
    // so showing it from p=0 would have it visibly poking up into the
    // card above before there's room for it — REVEAL_START is the
    // fraction of the slide (empirically, comfortably past where the
    // panel's own height first clears the card's bottom edge) after
    // which it's safe to start fading in; it ramps the rest of the way
    // to fully open. Closing still starts fading out immediately from
    // p=1, since the same math run in reverse only ever *hides* early,
    // never re-exposes a clipping problem.
    const REVEAL_START = 0.85;
    const opacity = Math.max(0, (p - REVEAL_START) / (1 - REVEAL_START));
    stage.style.opacity = mobile ? '' : opacity;
    stage.classList.toggle('is-visible', p > 0.02); // mobile's display toggle only

    const nextInteractive = p > 0.9;
    if (nextInteractive !== interactive) {
      interactive = nextInteractive;
      panel.style.pointerEvents = interactive ? 'auto' : 'none';
      if (!interactive) blurActive();
    }

    if (p <= 0.02 || mobile) return;

    if (w !== lastW || h !== lastH) {
      stage.style.width = w + 'px';
      stage.style.height = h + 'px';
      lastW = w; lastH = h;
    }

    // canvasRect is the one source of truth for "where is the card on
    // screen right now" — pure DOM layout, updated by the browser the
    // instant CSS reflows, never dependent on the camera/renderer's own
    // (separately-timed) bookkeeping catching up to a resize.
    const canvasRect = canvasEl.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const canvasCenterX = canvasRect.left - stageRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top - stageRect.top + canvasRect.height / 2;

    anchor.updateMatrixWorld(true);
    anchor.getWorldPosition(worldPos);
    // valid because the camera only ever dollies straight down Z looking
    // at the world origin — for anything at the card's own (~zero) depth,
    // that makes world-XY-to-screen-px a fixed affine scale by
    // pixelsPerWorldUnit, not a depth-dependent perspective divide
    const screenX = canvasCenterX + worldPos.x * pixelsPerWorldUnit;
    const screenY = canvasCenterY - worldPos.y * pixelsPerWorldUnit;

    stage.style.perspectiveOrigin = screenX + 'px ' + screenY + 'px';
    stage.style.perspective = (invTanHalfFov * (canvasRect.height / 2)) + 'px';

    rotationOnly.extractRotation(anchor.matrixWorld);
    panel.style.left = screenX + 'px';
    panel.style.top = screenY + 'px';
    panel.style.transform = 'translate(-50%,-50%) ' + rotationCSSMatrix(rotationOnly);
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
    .contact3d-stage{position:absolute;inset:0;pointer-events:none;overflow:visible;opacity:0;transform-style:preserve-3d;-webkit-transform-style:preserve-3d}

    /* fixed to the tab's own real size (set inline, once, from
       tabWidthPx/tabHeightPx) with overflow hidden — this box IS the tab's
       silhouette as far as the form is concerned, so centering the form
       inside it can never spill past the tab's true edge */
    .contact3d-panel{position:absolute;top:0;left:0;transform-style:preserve-3d;-webkit-transform-style:preserve-3d}

    /* the actual clip: fixed to the tab's real size, overflow hidden, no
       3D styling of its own (see the comment where this is built) */
    .contact3d-clip{box-sizing:border-box;padding:0 28px;overflow:hidden;display:flex;align-items:center;justify-content:center}

    /* belt-and-suspenders: if content still somehow exceeds the clip's
       fixed height (a long wrapped error message, an over-full textarea),
       it scrolls inside its own box instead of visually overflowing it */
    .contact-form{width:260px;max-height:100%;overflow-y:auto;font-family:'DM Mono',monospace}
    .cf-field{margin-bottom:13px}
    .cf-field label{display:block;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(28,20,10,0.45);margin-bottom:4px}
    .cf-field input,.cf-field textarea{
      display:block;width:100%;border:none;border-bottom:0.5px solid rgba(28,20,10,0.28);
      background:transparent;font-family:'EB Garamond',serif;font-size:15px;color:#1c140a;
      padding:1px 0 5px;outline:none;resize:none;line-height:1.35
    }
    .cf-field input:focus,.cf-field textarea:focus{border-bottom-color:#1c140a}
    .cf-field textarea{min-height:44px}

    .cf-honeypot{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}

    .cf-submit{all:unset;display:inline-block;margin-top:2px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#1c140a;cursor:pointer;border-bottom:0.5px solid rgba(28,20,10,0.4);padding-bottom:2px;transition:opacity 0.2s ease}
    .cf-submit:hover{border-color:#1c140a}
    .cf-submit:disabled{cursor:default;opacity:0.5}

    .cf-status{margin-top:10px;font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:0.03em;line-height:1.6;color:rgba(28,20,10,0.55)}
    .cf-status.is-error{color:#a3402a}
    .cf-status.is-error a,.cf-status a{color:inherit}

    .cf-result{font-family:'EB Garamond',serif;font-size:16px;color:#1c140a;line-height:1.5;max-width:240px}

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
