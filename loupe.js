import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const DEFAULT_SIZE = 260;
const DEFAULT_MAGNIFICATION = 1.5;
const FOLLOW_LAG = 0.18;
const DEFAULT_OFFSET_X = 48;
const DEFAULT_OFFSET_Y = -48;

/**
 * Loupe renders a cursor-following circular glass lens over `target`.
 * Self-contained: owns its DOM overlay, an offscreen 2D sampling canvas,
 * and a Three.js scene (MeshPhysicalMaterial glass disc, optionally a
 * metallic torus rim) whose built-in transmission pass magnifies/refracts
 * whatever real DOM image is under the cursor. Clicks pass straight through
 * to the frame beneath (the overlay is pointer-events:none).
 *
 * options:
 *   size          px diameter of the lens (default 260)
 *   magnification default 1.5
 *   rim           show the metallic torus rim (default true)
 *   fit           'cover' | 'contain' — how the target image(s) are fitted,
 *                 must match the DOM's own object-fit (default 'cover')
 *   resolveImage  (x, y) => imgElement|null — finds which <img> is under the
 *                 cursor. Defaults to walking up to the nearest .cs-frame
 *                 and reading its <img>; pass a custom resolver when the
 *                 target isn't a contact-sheet grid (e.g. a single image).
 *   material      overrides merged onto the glass MeshPhysicalMaterial params
 *   offsetX/offsetY  px the lens is held offset from the cursor (default 48, -48)
 */
export class Loupe {
  constructor(target, options = {}) {
    this.target = target;
    this.size = options.size || DEFAULT_SIZE;
    this.magnification = options.magnification || DEFAULT_MAGNIFICATION;
    this.hasRim = options.rim !== false;
    this.fit = options.fit || 'cover';
    this.resolveImage = options.resolveImage || this._defaultResolveImage.bind(this);
    this.materialOverrides = options.material || {};
    this.offsetX = options.offsetX ?? DEFAULT_OFFSET_X;
    this.offsetY = options.offsetY ?? DEFAULT_OFFSET_Y;
    this.destroyed = false;
    this.hovering = false;
    this.visible = false;
    this.mouse = { x: 0, y: 0 };
    this.pos = { x: 0, y: 0 };

    this._buildDom();
    this._buildSampleCanvas();
    this._buildScene();
    this._bindEvents();

    this._tick = this._tick.bind(this);
    this._raf = requestAnimationFrame(this._tick);
  }

  _buildDom() {
    this.root = document.createElement('div');
    this.root.className = 'loupe-root';
    this.root.style.width = this.size + 'px';
    this.root.style.height = this.size + 'px';

    this.canvas = document.createElement('canvas');
    this.root.appendChild(this.canvas);
    document.body.appendChild(this.root);
  }

  _buildSampleCanvas() {
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 320;
    this.sampleCanvas.height = 320;
    this.sampleCtx = this.sampleCanvas.getContext('2d');
  }

  _buildScene() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.size, this.size, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
    this.camera.position.set(0, 0, 3.2);

    const envMap = this._buildEnvMap();
    this.envMap = envMap;
    this.scene.environment = envMap;

    // background plane: textured with a live 2D-canvas sample of the DOM content
    // under the cursor (already magnified there); the glass in front of it
    // refracts/blurs it via Three's built-in transmission render pass.
    this.sampleTexture = new THREE.CanvasTexture(this.sampleCanvas);
    this.sampleTexture.colorSpace = THREE.SRGBColorSpace;
    const bgGeo = new THREE.PlaneGeometry(3, 3);
    const bgMat = new THREE.MeshBasicMaterial({ map: this.sampleTexture, toneMapped: false });
    this.bgPlane = new THREE.Mesh(bgGeo, bgMat);
    this.bgPlane.position.z = -0.6;
    this.scene.add(this.bgPlane);

    // domed lens surface, not a flat disc: normals point straight at the
    // camera near the center and tilt increasingly toward the rim, so the
    // transmission refraction (Snell's law against those normals) stays
    // clean in the middle and warps more strongly toward the outer edge —
    // like a real plano-convex loupe rather than a flat pane of glass.
    const lensRadius = 0.62;
    const domeHeight = 0.16;
    const glassGeo = new THREE.CircleGeometry(lensRadius, 96);
    const posAttr = glassGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const r = Math.min(1, Math.sqrt(px * px + py * py) / lensRadius);
      posAttr.setZ(i, domeHeight * (1 - r * r));
    }
    glassGeo.computeVertexNormals();

    const glassMat = new THREE.MeshPhysicalMaterial(Object.assign({
      transmission: 1,
      thickness: 0.8,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      specularIntensity: 1.2,
      ior: 1.5,
      envMap,
      envMapIntensity: 1.7,
      color: 0xffffff,
      metalness: 0
    }, this.materialOverrides, { envMap }));
    this.glass = new THREE.Mesh(glassGeo, glassMat);
    this.scene.add(this.glass);

    if (this.hasRim) {
      const rimGeo = new THREE.TorusGeometry(lensRadius, 0.034, 24, 96);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xc9a15a,
        metalness: 1,
        roughness: 0.3,
        envMap,
        envMapIntensity: 1.4
      });
      this.rim = new THREE.Mesh(rimGeo, rimMat);
      this.scene.add(this.rim);
    }

    const key = new THREE.DirectionalLight(0xfff4e0, 1.1);
    key.position.set(1.2, 1.6, 2.4);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  }

  // procedural equirect environment (warm studio gradient + a soft highlight) —
  // avoids needing an external HDRI asset while still giving the transmission/
  // clearcoat material something believable to reflect.
  _buildEnvMap() {
    const w = 256, h = 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fdf6e6');
    grad.addColorStop(0.45, '#cabfa6');
    grad.addColorStop(0.55, '#453a2c');
    grad.addColorStop(1, '#0f0c08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const hi = ctx.createRadialGradient(w * 0.72, h * 0.26, 1, w * 0.72, h * 0.26, h * 0.42);
    hi.addColorStop(0, 'rgba(255,252,244,1)');
    hi.addColorStop(0.5, 'rgba(255,248,232,0.55)');
    hi.addColorStop(1, 'rgba(255,248,232,0)');
    ctx.fillStyle = hi;
    ctx.fillRect(0, 0, w, h);

    const hi2 = ctx.createRadialGradient(w * 0.22, h * 0.7, 1, w * 0.22, h * 0.7, h * 0.3);
    hi2.addColorStop(0, 'rgba(255,255,255,0.6)');
    hi2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi2;
    ctx.fillRect(0, 0, w, h);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const renderTarget = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();
    return renderTarget.texture;
  }

  _bindEvents() {
    this._onMove = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.hovering = true;
    };
    this._onLeave = () => {
      this.hovering = false;
    };
    this.target.addEventListener('mousemove', this._onMove);
    this.target.addEventListener('mouseleave', this._onLeave);
  }

  _setVisible(v) {
    if (v === this.visible) return;
    this.visible = v;
    this.root.classList.toggle('is-visible', v);
  }

  _defaultResolveImage(x, y) {
    const el = document.elementFromPoint(x, y);
    const frame = el && el.closest ? el.closest('.cs-frame') : null;
    return frame ? frame.querySelector('img') : null;
  }

  // samples the real DOM image under (x, y) into the 2D canvas, magnified by
  // this.magnification, respecting the image's object-fit (cover or contain).
  _sampleUnderCursor(x, y) {
    const img = this.resolveImage(x, y);
    if (!img || !img.complete || !img.naturalWidth) return false;

    const rect = img.getBoundingClientRect();
    const scale = this.fit === 'contain'
      ? Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
      : Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const offsetX = (drawW - rect.width) / 2;
    const offsetY = (drawH - rect.height) / 2;

    const localX = x - rect.left;
    const localY = y - rect.top;

    // contain fit letterboxes/pillarboxes the image within rect — reject
    // cursor positions that fall in the empty bars rather than the pixels
    if (this.fit === 'contain') {
      const padX = Math.max(0, -offsetX);
      const padY = Math.max(0, -offsetY);
      if (localX < padX || localX > rect.width - padX || localY < padY || localY > rect.height - padY) {
        return false;
      }
    }

    const sampleSize = this.size / this.magnification;
    const half = sampleSize / 2;

    const sx = (localX - half + offsetX) / scale;
    const sy = (localY - half + offsetY) / scale;
    const sSize = sampleSize / scale;

    const ctx = this.sampleCtx;
    const cw = this.sampleCanvas.width;
    const ch = this.sampleCanvas.height;
    ctx.clearRect(0, 0, cw, ch);
    try {
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, cw, ch);
    } catch (err) {
      return false;
    }
    this.sampleTexture.needsUpdate = true;
    return true;
  }

  _tick() {
    if (this.destroyed) return;

    this.pos.x += (this.mouse.x - this.pos.x) * FOLLOW_LAG;
    this.pos.y += (this.mouse.y - this.pos.y) * FOLLOW_LAG;
    const renderX = this.pos.x + this.offsetX;
    const renderY = this.pos.y + this.offsetY;
    this.root.style.transform = `translate(${renderX - this.size / 2}px, ${renderY - this.size / 2}px)`;

    if (this.hovering) {
      const hasContent = this._sampleUnderCursor(renderX, renderY);
      this._setVisible(hasContent);
      if (hasContent) this.renderer.render(this.scene, this.camera);
    } else {
      this._setVisible(false);
    }

    this._raf = requestAnimationFrame(this._tick);
  }

  /** Tears down the render loop, GPU resources, listeners, and DOM overlay. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    this.target.removeEventListener('mousemove', this._onMove);
    this.target.removeEventListener('mouseleave', this._onLeave);

    this.glass.geometry.dispose();
    this.glass.material.dispose();
    if (this.rim) {
      this.rim.geometry.dispose();
      this.rim.material.dispose();
    }
    this.bgPlane.geometry.dispose();
    this.bgPlane.material.dispose();
    this.sampleTexture.dispose();
    if (this.envMap) this.envMap.dispose();
    this.renderer.dispose();

    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
