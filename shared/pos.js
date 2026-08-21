/* POS — traced geometry with product shading (white shell, black bezel,
   dark navy slot). Background is stage chrome, not part of the product. */
(() => {
  const DEFAULT_SRC = new URL('./pos-points.json', document.currentScript?.src || window.location.href).href;
  const DEFAULT_SCREEN_SRC = new URL('./assets/pos-nfc.jpg', document.currentScript?.src || window.location.href).href;

  function pathD(pts) {
    if (!pts.length) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]},${pts[i][1]}`;
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5) d += 'Z';
    return d;
  }

  function bounds(pts) {
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
      if (i < pts.length - 1) {
        area += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
      }
    }
    return { xmin, xmax, ymin, ymax, area: Math.abs(area) / 2, n: pts.length };
  }

  function asPath(pts) {
    return { pts, d: pathD(pts), ...bounds(pts) };
  }

  function classify(paths) {
    // Tracer emits longest-first:
    // 0 outer shell · 1 shell inner lip · 2 screen · 3 bezel outer
    // 4–5 base cradle · 6 slot · 7 speaker · 8 camera
    const ranked = paths.map(asPath);

    // Prefer fixed indices for the known potrace set (stable + matches the product photo).
    if (ranked.length >= 9 && ranked[0].n > 5000 && ranked[2].n > 5000 && ranked[6].n > 1000) {
      return {
        shell: ranked[0],
        screen: ranked[2],
        bezelOuter: ranked[3],
        speaker: ranked[7],
        camera: ranked[8],
        slot: ranked[6],
        baseLines: [ranked[4], ranked[5]],
      };
    }

    const byLen = [...ranked].sort((a, b) => b.n - a.n);
    const shell = byLen[0];
    const screen = byLen.find((p) =>
      p !== shell &&
      p.xmin > shell.xmin + 40 &&
      p.xmax < shell.xmax - 40 &&
      p.ymin > shell.ymin + 30 &&
      p.ymax < shell.ymax - 150 &&
      p.n > 2000
    ) || byLen[2];

    const bezelOuter = byLen
      .filter((p) =>
        p !== shell &&
        p !== screen &&
        p.n > 2000 &&
        p.xmin < screen.xmin &&
        p.xmax > screen.xmax &&
        p.ymin < screen.ymin &&
        p.ymax > screen.ymax &&
        p.xmin > shell.xmin + 8
      )
      .sort((a, b) => a.area - b.area)[0] || byLen[3];

    const small = byLen.filter((p) => p.n < 800);
    const speaker = small.find((p) => (p.xmax - p.xmin) > (p.ymax - p.ymin) * 2) || small[0];
    const camera = small.find((p) => p !== speaker) || small[1];

    const base = byLen.filter((p) => p.ymin > shell.ymax * 0.85 && p.n < 4000);
    const slot = [...base].sort((a, b) => a.area - b.area)[0];
    const baseLines = base.filter((p) => p !== slot);

    return { shell, screen, bezelOuter, speaker, camera, slot, baseLines };
  }

  function buildSVGFromPoints(data, screenSrc) {
    const [vx, vy, vw, vh] = data.viewBox;
    const c = classify(data.paths || []);
    const uid = `pos${Math.random().toString(36).slice(2, 8)}`;

    const bezelParts = [c.bezelOuter, c.screen, c.speaker, c.camera]
      .filter(Boolean)
      .map((p) => p.d)
      .join(' ');

    const slot = c.slot;
    const screen = c.screen;
    const sw = screen.xmax - screen.xmin;
    const sh = screen.ymax - screen.ymin;
    // Landscape NFC art centered on the tall screen
    const maxW = sw * 0.72;
    const maxH = sh * 0.38;
    const aspect = 900 / 566;
    let iw = maxW;
    let ih = iw / aspect;
    if (ih > maxH) {
      ih = maxH;
      iw = ih * aspect;
    }
    const ix = screen.xmin + (sw - iw) / 2;
    const iy = screen.ymin + (sh - ih) / 2;
    const imgHref = screenSrc || DEFAULT_SCREEN_SRC;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="POS terminal" class="pos-device">
  <defs>
    <linearGradient id="${uid}-shell" x1="12%" y1="0%" x2="92%" y2="100%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".38" stop-color="#fafafa"/>
      <stop offset=".72" stop-color="#f2f2f4"/>
      <stop offset="1" stop-color="#e8e8ec"/>
    </linearGradient>
    <linearGradient id="${uid}-sheen" x1="0%" y1="0%" x2="70%" y2="55%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset=".4" stop-color="#ffffff" stop-opacity=".4"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${uid}-bezel" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0" stop-color="#2c2c30"/>
      <stop offset=".5" stop-color="#111113"/>
      <stop offset="1" stop-color="#050506"/>
    </linearGradient>
    <linearGradient id="${uid}-screen" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0" stop-color="#fcfcfd"/>
      <stop offset="1" stop-color="#f4f4f6"/>
    </linearGradient>
    <linearGradient id="${uid}-slot" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0" stop-color="#3a6a94"/>
      <stop offset=".35" stop-color="#1c4c77"/>
      <stop offset=".7" stop-color="#103154"/>
      <stop offset="1" stop-color="#0d2743"/>
    </linearGradient>
    <clipPath id="${uid}-screen-clip">
      <path d="${screen.d}"/>
    </clipPath>
  </defs>

  <g>
    <!-- Matte white chassis -->
    <path class="pos__shell" d="${c.shell.d}" fill="url(#${uid}-shell)"/>
    <path d="${c.shell.d}" fill="url(#${uid}-sheen)" opacity=".9"/>
    <path d="${c.shell.d}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="${c.shell.d}" fill="none" stroke="rgba(16,49,84,.07)" stroke-width="1.15" stroke-linejoin="round"/>

    <!-- Charcoal bezel -->
    <path class="pos__bezel" d="${bezelParts}" fill="url(#${uid}-bezel)" fill-rule="evenodd"/>
    <path d="${c.bezelOuter.d}" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="${c.bezelOuter.d}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.1" stroke-linejoin="round" opacity=".65"/>

    <!-- Screen + NFC art (multiply so white jpeg canvas dissolves into the screen) -->
    <g class="pos__screen-layer">
      <path class="pos__screen" d="${screen.d}" fill="url(#${uid}-screen)"/>
      <image
        class="pos__nfc"
        href="${imgHref}"
        xlink:href="${imgHref}"
        x="${ix.toFixed(1)}"
        y="${iy.toFixed(1)}"
        width="${iw.toFixed(1)}"
        height="${ih.toFixed(1)}"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#${uid}-screen-clip)"
        style="mix-blend-mode:multiply"
      />
    </g>

    <!-- Thin navy recess (no blur bloom — keep it a crisp slot, not a blob) -->
    ${slot ? `<path class="pos__slot" d="${slot.d}" fill="url(#${uid}-slot)"/>` : ''}
    ${slot ? `<path d="${slot.d}" fill="none" stroke="rgba(13,39,67,.55)" stroke-width="1.2" stroke-linejoin="round"/>` : ''}

    <!-- Base cradle outlines on white chin -->
    ${c.baseLines.map((p) => `<path d="${p.d}" fill="none" stroke="rgba(40,36,55,.22)" stroke-width="1.9" stroke-linejoin="round"/>`).join('\n    ')}
  </g>
</svg>`;
  }

  function enableDragScale(el, handle) {
    const grip = handle || el;
    el.classList.add('is-draggable');
    grip.style.cursor = 'grab';
    grip.style.touchAction = 'none';
    grip.style.userSelect = 'none';
    el.style.transformOrigin = 'center center';

    let x = 0;
    let y = 0;
    let scale = 1;
    let pid = null;
    let ox = 0;
    let oy = 0;
    let startX = 0;
    let startY = 0;
    const MIN = 0.45;
    const MAX = 2.4;

    function apply() {
      el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    function onMove(e) {
      if (pid == null || e.pointerId !== pid) return;
      x = ox + (e.clientX - startX);
      y = oy + (e.clientY - startY);
      apply();
    }

    function onUp(e) {
      if (pid == null || e.pointerId !== pid) return;
      pid = null;
      el.classList.remove('is-dragging');
      grip.style.cursor = 'grab';
      try { grip.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }

    grip.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      pid = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      ox = x;
      oy = y;
      el.classList.add('is-dragging');
      grip.style.cursor = 'grabbing';
      try { grip.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      e.preventDefault();
    });

    // Pinch / ctrl+wheel (trackpad pinch often arrives as ctrl+wheel); plain wheel also scales when over the POS
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025);
      scale = Math.min(MAX, Math.max(MIN, scale * (1 + delta)));
      apply();
    }, { passive: false });
  }

  async function initRoot(root) {
    const stage = root.matches('[data-pos-stage]') ? root : root.querySelector('[data-pos-stage]');
    if (!stage) return;

    const src = root.getAttribute('data-pos-src') || stage.getAttribute('data-pos-src') || DEFAULT_SRC;
    const screenSrc = root.getAttribute('data-pos-screen') || stage.getAttribute('data-pos-screen') || DEFAULT_SCREEN_SRC;
    const metaEl = root.querySelector('[data-pos-meta]');
    const panel = root.querySelector('[data-pos-panel]');
    let current = '';
    let data = null;

    try {
      const bust = src.includes('?') ? '&' : '?';
      const res = await fetch(`${src}${bust}v=822`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      current = buildSVGFromPoints(data, screenSrc);
      stage.innerHTML = current;
      if (metaEl) {
        metaEl.textContent = `${data.pointCount.toLocaleString()} points · ${data.pathCount || data.paths.length} chains · shaded · ${data.method || 'traced'}`;
      }
    } catch (err) {
      stage.innerHTML = `<p class="body-sm" style="color:var(--neutral-500)">Could not load POS points.</p>`;
      console.warn('[pos]', err);
      return;
    }

    if (root.hasAttribute('data-pos-drag')) {
      enableDragScale(root, root);
    }

    panel?.querySelector('[data-pos-download-svg]')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([current], { type: 'image/svg+xml' }));
      Object.assign(document.createElement('a'), { href: url, download: 'pos.svg' }).click();
      URL.revokeObjectURL(url);
    });
    panel?.querySelector('[data-pos-download-points]')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: 'pos-points.json' }).click();
      URL.revokeObjectURL(url);
    });
  }

  const init = (scope = document) => {
    scope.querySelectorAll('[data-pos]').forEach((root) => {
      if (root.dataset.posReady === '1') return;
      root.dataset.posReady = '1';
      initRoot(root);
    });
  };

  window.ScytalesPos = { init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }
})();
