/* Scytále rod — built from the cross-section, not from a model file.

   THE PROFILE
   Read off the Blender mesh (16 verts = 8 per end cap), as half-extents
   from the segment's centre. It is an octagon but not a regular one: it is
   wider than it is tall, and its flats and chamfers are all different
   lengths. Approximating it with a regular octagon looks visibly wrong, so
   the eight points are stated here exactly as measured and everything else
   is derived from them.

     overall        2.5008 wide x 2.4314 tall
     top/bottom     0.9822 flat
     front/back     1.6275 flat   <- the face that carries a letter
     chamfers       0.8591

   The rod axis is the segment's length, 2.0 per segment, and in the model
   the segments sit flush at 2.0 spacing. GAP opens the almost negligible
   seam between them.

   WHY THIS RATHER THAN THE GLB
   Nothing has to load, so there is no blank-canvas failure mode; the
   geometry is one array of numbers that can be read and checked; and the
   letters come from the artwork's own vector paths rather than a baked
   texture atlas. The model stays the source of truth — these numbers are
   its measurements — but the runtime has no file to be wrong about.

   COLOUR
   Orange faces, white edges, and the letter in white on the front face.
   The glyph is drawn to a canvas from the artwork's own path, so the
   letterforms are the real ones rather than a font substitute.

   THE CIPHER
   The word starts encrypted. Each face cycles random symbols while its own
   segment is still turning and resolves the instant that segment lands, so
   the rod becomes legible exactly as it becomes still. Hovering a segment
   throws that one letter back into cipher until the pointer leaves. */

import * as THREE from './vendor/three.module.js';

/* Half-extents, measured. Ordered around the section: v is toward the
   viewer, u is vertical. */
const PROFILE = [
  [0.4911, 1.21575],
  [1.2504, 0.81375],
  [1.2504, -0.81375],
  [0.4911, -1.21575],
  [-0.4911, -1.21575],
  [-1.2504, -0.81375],
  [-1.2504, 0.81375],
  [-0.4911, 1.21575],
];

const SEG_LEN = 2.0;   /* one segment along the rod axis */
const GAP = 0.02;      /* "almost negligible" */
const SEGMENTS = 8;
const FACETS = 8;

const DEFAULTS = {
  turns: 2,
  duration: 1200,
  stagger: 110,
  yaw: 0,
  pitch: 0.1,
  white: '#ffffff',
  orange: '#e6411c',
};

const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

/* ---- the artwork's own letterforms ---------------------------------- */

const glyphCache = new Map();
const loadGlyphs = (url) => {
  if (!url) return Promise.resolve([]);
  if (!glyphCache.has(url)) {
    glyphCache.set(
      url,
      fetch(url)
        .then((r) => r.text())
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          /* Measure in a live tree — getBBox needs layout. */
          const probe = doc.documentElement.cloneNode(true);
          probe.style.cssText = 'position:absolute;left:-99999px;width:1000px';
          document.body.appendChild(probe);
          const glyphs = [...probe.querySelectorAll('path')]
            .map((p) => {
              const b = p.getBBox();
              return { d: p.getAttribute('d'), x: b.x, y: b.y, w: b.width, h: b.height };
            })
            .sort((a, b) => a.x - b.x);
          probe.remove();
          return glyphs;
        })
    );
  }
  return glyphCache.get(url);
};

/* A face is a canvas that can redraw itself: either the artwork's own
   letterform, or a random symbol while the message is still encrypted.

   The letter rides its own plane laid on the front flat rather than being
   mapped onto the extrusion. A wall's UVs come from ExtrudeGeometry's own
   generator, which orients them along the extrusion path — which is why the
   glyphs first came out rotated and mirrored. A plane's orientation is ours
   to set, and it also means the canvas can be repainted without touching
   the solid. */

/* Greek capitals, maths operators and box glyphs: unfamiliar enough to read
   as cipher, common enough to exist in any system font. */
const CIPHER = [...'ΔΣΩΨΦΞΛΓΘΠ∑∏∫≡≠≈∞⊕⊗⋈⌘⍟※§¤†‡0123456789'];
const randomSymbol = () => CIPHER[(Math.random() * CIPHER.length) | 0];

class LetterFace {
  constructor(glyph, { white }) {
    this.glyph = glyph;
    this.white = white;
    this.h = 512;
    this.w = Math.round((this.h * SEG_LEN) / (PROFILE[1][1] * 2));

    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    this.ctx = c.getContext('2d');
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;

    this.scrambling = false;
    this.nextFlip = 0;
    this.draw();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /* The real letterform, from the artwork's own path. Fitted on its own
     bounds so every letter is optically the same size whatever its outline
     happens to measure. */
  drawGlyph() {
    const { ctx, glyph, w, h } = this;
    this.clear();
    if (!glyph) return;
    const pad = 0.42;
    const scale = Math.min((w * pad) / glyph.w, (h * pad) / glyph.h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(glyph.x + glyph.w / 2), -(glyph.y + glyph.h / 2));
    ctx.fillStyle = this.white;
    ctx.fill(new Path2D(glyph.d));
    ctx.restore();
  }

  drawSymbol(ch) {
    const { ctx, w, h } = this;
    this.clear();
    ctx.save();
    ctx.fillStyle = this.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(h * 0.44)}px "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(ch, w / 2, h / 2);
    ctx.restore();
  }

  draw(ch) {
    if (ch) this.drawSymbol(ch);
    else this.drawGlyph();
    this.texture.needsUpdate = true;
  }

  /* Returns true if it repainted, so the caller knows a frame is needed. */
  step(now, interval = 55) {
    if (!this.scrambling) return false;
    if (now < this.nextFlip) return false;
    this.nextFlip = now + interval;
    this.draw(randomSymbol());
    return true;
  }

  settle() {
    this.scrambling = false;
    this.draw();
  }

  scramble() {
    this.scrambling = true;
    this.nextFlip = 0;
  }
}

/* ---- geometry -------------------------------------------------------- */

/* One segment. A single material now — the letter is a separate plane, so
   there is no need to split the walls by normal. */
const segmentGeometry = () => {
  const shape = new THREE.Shape();
  PROFILE.forEach(([v, u], i) => (i ? shape.lineTo(v, u) : shape.moveTo(v, u)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: SEG_LEN - GAP,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
};

/* The plane the letter sits on: the front flat, a hair proud of the face so
   it cannot z-fight with it. */
const FACE_V = PROFILE[1][0];          /* 1.2504 — front flat, from the profile */
const FACE_H = PROFILE[1][1] * 2;      /* 1.6275 — its height */

class ScytaleRod {
  constructor(host) {
    this.host = host;
    this.opts = { ...DEFAULTS };
    ['turns', 'duration', 'stagger'].forEach((k) => {
      const v = Number(host.dataset[k]);
      if (Number.isFinite(v) && v !== 0) this.opts[k] = v;
    });
    this.segments = [];
    this.faces = [];
    this.pickable = [];
    this.playing = false;
    this.hovered = -1;
    this.raf = 0;
  }

  async init() {
    const { host, opts } = this;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    /* Orthographic, not perspective: the mark is drawn flat, so parallel
       edges have to stay parallel. Under perspective the far segments taper
       and the rod reads as a photographed object rather than as the mark.
       The frustum is set in resize(), from the model's own bounds. */
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

    /* Flat enough to keep every face the same orange, with a soft key so
       the chamfers still separate. Any harder and it reads as a rendered
       prop rather than as the mark. */
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(-3, 5, 8);
    this.scene.add(key);

    const glyphs = await loadGlyphs(host.dataset.rodGlyphs);

    /* Every face orange; the edges are what draw the form. */
    const body = new THREE.MeshStandardMaterial({
      color: opts.orange,
      roughness: 0.95,
      metalness: 0,
    });

    const geo = segmentGeometry();

    this.rod = new THREE.Group();
    this.align = new THREE.Group();
    /* The section is built facing +v; laying the extrusion along screen X
       puts that face toward the camera. */
    this.align.rotation.y = -Math.PI / 2;
    this.rod.add(this.align);

    for (let i = 0; i < SEGMENTS; i++) {
      const mesh = new THREE.Mesh(geo, body);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 15),
        new THREE.LineBasicMaterial({ color: opts.white })
      );
      mesh.add(edges);

      /* The letter, on its own plane against the front flat. Rotated to
         face +v, which is the face turned toward the camera at rest. */
      const face = new LetterFace(glyphs[i], opts);
      this.faces.push(face);
      const letter = new THREE.Mesh(
        new THREE.PlaneGeometry(SEG_LEN, FACE_H),
        new THREE.MeshBasicMaterial({
          map: face.texture,
          transparent: true,
          depthWrite: false,
        })
      );
      letter.rotation.y = Math.PI / 2;
      letter.position.x = FACE_V + 0.004;
      mesh.add(letter);

      /* One pivot per segment, on the rod's own axis — so it turns like a
         slice of one rod, not like its own object. The geometry is already
         centred, so the pivot is only its place along the rod. */
      const pivot = new THREE.Group();
      /* Negated: laying the rod across the screen maps +Z to the left, so
         without this the word reads backwards. */
      pivot.position.z = -(i - (SEGMENTS - 1) / 2) * SEG_LEN;
      pivot.add(mesh);
      this.align.add(pivot);
      this.segments.push(pivot);
      /* Picked against the solid, not the letter plane: the whole segment
         is the hover target. */
      mesh.userData.index = i;
      this.pickable.push(mesh);
    }

    this.scene.add(this.rod);
    this.setView(opts.yaw, opts.pitch);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);

    this.bindPointer();
    this.reset();
    host.dataset.rodReady = '1';
    return this;
  }

  resize() {
    const { host, camera, renderer } = this;
    const w = host.clientWidth || 1;
    const h = host.clientHeight || Math.round(w / 5.4);
    renderer.setSize(w, h, false);

    /* Fit the frustum to the rod rather than moving the camera: with no
       perspective, distance changes nothing about the size on screen, only
       the near/far planes. Measured off the model's own bounds and padded,
       and the tighter of the two fits wins so the rod is never cropped —
       whichever way the viewport is shaped. */
    this.rod.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.rod);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());

    const pad = 1.06;
    const halfW = (size.x / 2) * pad;
    const halfH = (size.y / 2) * pad;
    const viewH = Math.max(halfH, halfW / (w / h));
    const viewW = viewH * (w / h);

    camera.left = -viewW;
    camera.right = viewW;
    camera.top = viewH;
    camera.bottom = -viewH;
    /* Far enough back to clear the rod's own depth, whatever the view
       angle; with an orthographic camera this only sets the clip planes. */
    const depth = Math.max(size.x, size.y, size.z) * 2 + 10;
    camera.near = 0.1;
    camera.far = depth * 2;
    camera.position.set(centre.x, centre.y, centre.z + depth);
    camera.lookAt(centre);
    camera.updateProjectionMatrix();
    this.render();
  }

  reset() {
    const step = (Math.PI * 2) / FACETS;
    this.segments.forEach((seg, i) => {
      const dir = i % 2 ? -1 : 1;
      seg.userData.from = dir * this.opts.turns * step;
      seg.userData.settled = false;
      seg.rotation.z = seg.userData.from;
    });
    /* The message starts encrypted; each letter resolves as its own segment
       comes to rest, so the word is legible exactly when the rod is. */
    this.faces.forEach((f) => f.scramble());
    this.render();
  }

  play() {
    this.reset();
    this.playing = true;
    this.start = performance.now();
    this.run();
  }

  /* One loop for both concerns. It runs while a segment is still turning or
     any letter is still cipher, and stops itself otherwise — a rod at rest
     with nothing hovered costs nothing. */
  run() {
    if (this.raf) return;
    const frame = () => {
      this.raf = 0;
      const now = performance.now();
      let live = false;

      if (this.playing) {
        const { duration, stagger } = this.opts;
        const t0 = now - this.start;
        let done = true;
        this.segments.forEach((seg, i) => {
          const t = Math.min(1, Math.max(0, (t0 - i * stagger) / duration));
          if (t < 1) done = false;
          seg.rotation.z = seg.userData.from * (1 - easeOutQuint(t));
          /* Resolve this letter the moment its own segment lands. */
          if (t >= 1 && !seg.userData.settled) {
            seg.userData.settled = true;
            if (i !== this.hovered) this.faces[i].settle();
          }
        });
        if (done) this.playing = false;
        else live = true;
      }

      this.faces.forEach((f) => {
        if (f.step(now)) live = true;
        else if (f.scrambling) live = true;
      });

      this.render();
      if (live) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /* Hovering a segment throws that letter back into cipher; leaving it lets
     it resolve again. */
  hover(index) {
    if (index === this.hovered) return;
    if (this.hovered >= 0 && this.faces[this.hovered]) {
      const seg = this.segments[this.hovered];
      if (!this.playing || seg.userData.settled) this.faces[this.hovered].settle();
    }
    this.hovered = index;
    if (index >= 0) {
      this.faces[index].scramble();
      this.run();
    }
    this.host.style.cursor = index >= 0 ? 'crosshair' : '';
  }

  bindPointer() {
    const ray = new THREE.Raycaster();
    const pt = new THREE.Vector2();
    const el = this.renderer.domElement;

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      pt.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pt.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pt, this.camera);
      const hit = ray.intersectObjects(this.pickable, false)[0];
      this.hover(hit ? hit.object.userData.index : -1);
    });
    el.addEventListener('pointerleave', () => this.hover(-1));
  }

  setAngle(i, radians) {
    this.playing = false;
    if (this.segments[i]) this.segments[i].rotation.z = radians;
    this.render();
  }

  setView(yaw, pitch) {
    this.rod.rotation.y = yaw;
    this.rod.rotation.x = pitch;
    this.rod.updateMatrixWorld(true);
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

const instances = new WeakMap();

export const mount = async (host) => {
  if (instances.has(host)) return instances.get(host);
  const rod = new ScytaleRod(host);
  instances.set(host, rod);
  try {
    await rod.init();
  } catch (err) {
    /* Say so on the page — a silent WebGL failure looks exactly like a
       layout bug, which is an expensive thing to chase. */
    console.error('[scytale-rod]', err);
    host.innerHTML = `<p style="font:14px system-ui;color:#e6411c;padding:1rem">Rod failed: ${
      err && err.message ? err.message : err
    }</p>`;
    instances.delete(host);
    return null;
  }

  const replayable = host.hasAttribute('data-rod-replay');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          rod.play();
          if (!replayable) io.disconnect();
        }),
      { rootMargin: '0px 0px -15% 0px' }
    );
    io.observe(host);
  } else {
    rod.play();
  }
  return rod;
};

export const init = async (scope = document) =>
  Promise.all([...scope.querySelectorAll('[data-scytale-rod]')].map(mount));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init(), { once: true });
} else {
  init();
}

window.ScytaleRod = { init, mount, get: (host) => instances.get(host) };
/* Modules evaluate after classic scripts, so anything that builds a host
   from a classic script needs to know when this is available. */
window.dispatchEvent(new CustomEvent('scytale-rod:ready'));
