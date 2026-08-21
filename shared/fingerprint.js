/* Fingerprint — render traced ink points as connected line segments.
   Points come from skeletonizing the source drawing; each consecutive
   pair on a chain is joined with a straight line (thousands of points).
   Optional: data-fp-draw animates a self-draw when the stage enters view. */
(() => {
  const DEFAULT_SRC = new URL('./fingerprint-points.json', document.currentScript?.src || window.location.href).href;
  const DRAW_MS = 2400;
  const PATH_DRAW_MS = 520;
  /* Skeletonization leaves hundreds of 1–3 unit stubs that bridge nearby
     ridges into blobby “connection points” when stroked. Drop those; keep
     the real ridge chains (almost all the ink lives on paths ≥ this). */
  const MIN_PATH_LEN = 10;
  /* Point chains are pixel-step polylines — drawn as L segments they read
     as a million bumps. RDP thins them, then Catmull–Rom → cubic Béziers
     make each ridge a smooth stroke. */
  const RDP_EPSILON = 1.75;

  function pathLength(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return len;
  }

  function pointLineDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-8) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function ramerDouglasPeucker(pts, epsilon) {
    if (pts.length < 3) return pts.slice();
    let maxDist = 0;
    let maxIdx = 0;
    const first = pts[0];
    const last = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = pointLineDist(pts[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilon) {
      const left = ramerDouglasPeucker(pts.slice(0, maxIdx + 1), epsilon);
      const right = ramerDouglasPeucker(pts.slice(maxIdx), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [first, last];
  }

  /* Uniform Catmull–Rom → cubic Bézier. Keeps the ridge shape without
     the stairstep of the original dense polyline. */
  function pointsToSmoothPath(raw) {
    /* Dense pixel chains first — every 3rd sample — then RDP. Keeps the
       curve true without multi-thousand-point recursion on one ridge. */
    let sampled = raw;
    if (raw.length > 200) {
      const step = raw.length > 2000 ? 4 : 3;
      sampled = [raw[0]];
      for (let i = step; i < raw.length - 1; i += step) sampled.push(raw[i]);
      sampled.push(raw[raw.length - 1]);
    }
    const pts = ramerDouglasPeucker(sampled, RDP_EPSILON);
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
    if (pts.length === 2) {
      return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
    }
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${+c1x.toFixed(2)},${+c1y.toFixed(2)} ${+c2x.toFixed(2)},${+c2y.toFixed(2)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  function buildSVGFromPoints(data, gradId = 'fpInkGrad') {
    const [vx, vy, vw, vh] = data.viewBox;
    const paths = (data.paths || []).filter(
      (pts) => pts.length >= 2 && pathLength(pts) >= MIN_PATH_LEN
    );
    const body = paths.map((pts) => {
      const d = pointsToSmoothPath(pts);
      return d ? `    <path d="${d}"/>` : '';
    }).filter(Boolean).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="Fingerprint">
  <defs>
    <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${vx}" y1="${vy}" x2="${vx + vw}" y2="${vy + vh}">
      <stop offset="0" stop-color="var(--orange-300)"/>
      <stop offset=".28" stop-color="var(--orange-500)"/>
      <stop offset=".55" stop-color="var(--orange-500)"/>
      <stop offset=".78" stop-color="var(--navy-600)"/>
      <stop offset="1" stop-color="var(--navy-800)"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#${gradId})" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round">
${body}
  </g>
</svg>`;
  }

  function bindGradientHover(stage) {
    const svg = stage.querySelector('svg');
    const grad = svg?.querySelector('linearGradient');
    if (!svg || !grad) return () => {};
    const base = {
      x1: +grad.getAttribute('x1'), y1: +grad.getAttribute('y1'),
      x2: +grad.getAttribute('x2'), y2: +grad.getAttribute('y2'),
    };
    let target = { ...base }, cur = { ...base }, raf = 0, alive = true;
    const svgPt = svg.createSVGPoint();

    function toSvg(clientX, clientY) {
      svgPt.x = clientX; svgPt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return svgPt.matrixTransform(ctm.inverse());
    }
    function onMove(e) {
      const p = toSvg(e.clientX, e.clientY);
      if (!p) return;
      const mx = (base.x1 + base.x2) * 0.5, my = (base.y1 + base.y2) * 0.5;
      const dx = (p.x - mx) * 0.45, dy = (p.y - my) * 0.45;
      target = { x1: base.x1 + dx, y1: base.y1 + dy, x2: base.x2 + dx, y2: base.y2 + dy };
    }
    function onLeave() { target = { ...base }; }
    function tick() {
      if (!alive) return;
      const k = 0.08;
      cur.x1 += (target.x1 - cur.x1) * k;
      cur.y1 += (target.y1 - cur.y1) * k;
      cur.x2 += (target.x2 - cur.x2) * k;
      cur.y2 += (target.y2 - cur.y2) * k;
      grad.setAttribute('x1', cur.x1.toFixed(2));
      grad.setAttribute('y1', cur.y1.toFixed(2));
      grad.setAttribute('x2', cur.x2.toFixed(2));
      grad.setAttribute('y2', cur.y2.toFixed(2));
      raf = requestAnimationFrame(tick);
    }
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
    };
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Hide strokes and return paths sorted center-out for draw order. */
  function armDraw(svg) {
    const vb = svg.viewBox.baseVal;
    const ox = vb.x + vb.width * 0.5;
    const oy = vb.y + vb.height * 0.42;
    const nodes = Array.from(svg.querySelectorAll('g path'));
    const prepared = nodes.map((el) => {
      const len = el.getTotalLength();
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      const pt = el.getPointAtLength(0);
      const dx = pt.x - ox;
      const dy = pt.y - oy;
      return { el, len, dist: dx * dx + dy * dy };
    });
    prepared.sort((a, b) => a.dist - b.dist || a.len - b.len);
    return prepared;
  }

  function playDraw(prepared) {
    const n = prepared.length;
    if (!n) return;
    const span = Math.max(0, DRAW_MS - PATH_DRAW_MS);
    // Two-phase: set transitions, then reveal — forces one layout pass
    prepared.forEach((p, i) => {
      const delay = n === 1 ? 0 : (i / (n - 1)) * span;
      p.el.style.transition = `stroke-dashoffset ${PATH_DRAW_MS}ms cubic-bezier(.4,0,.2,1) ${delay}ms`;
    });
    requestAnimationFrame(() => {
      prepared.forEach((p) => {
        p.el.style.strokeDashoffset = '0';
      });
    });
  }

  function bindDrawOnView(stage, svg) {
    if (prefersReducedMotion()) return;

    // Avoid a one-frame flash of the fully drawn print before dash offsets apply
    svg.style.visibility = 'hidden';

    let prepared = null;
    let playing = false;

    function arm() {
      if (prepared) return prepared;
      prepared = armDraw(svg);
      svg.style.visibility = '';
      stage.classList.add('fp-draw-armed');
      return prepared;
    }

    function start() {
      if (playing) return;
      playing = true;
      const items = arm();
      stage.classList.add('fp-draw-playing');
      playDraw(items);
      window.setTimeout(() => {
        stage.classList.remove('fp-draw-armed', 'fp-draw-playing');
        stage.classList.add('fp-draw-done');
        items.forEach((p) => {
          p.el.style.transition = '';
          p.el.style.strokeDasharray = '';
          p.el.style.strokeDashoffset = '';
        });
      }, DRAW_MS + 80);
    }

    // Prefetch lengths while off-screen so scroll-in stays smooth
    const warm = () => { try { arm(); } catch (_) { /* ignore */ } };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(warm, { timeout: 1200 });
    } else {
      window.setTimeout(warm, 120);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.18);
        if (!hit) return;
        io.disconnect();
        start();
      },
      { threshold: [0, 0.18, 0.35], rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(stage);
  }

  async function initRoot(root, index) {
    const stage = root.matches('[data-fp-stage]') ? root : root.querySelector('[data-fp-stage]');
    if (!stage) return;

    const src = root.getAttribute('data-fp-src') || stage.getAttribute('data-fp-src') || DEFAULT_SRC;
    const wantDraw = root.hasAttribute('data-fp-draw') || stage.hasAttribute('data-fp-draw');
    const metaEl = root.querySelector('[data-fp-meta]');
    const panel = root.querySelector('[data-fp-panel]');
    const gradId = `fpInkGrad-${index + 1}`;
    let current = '';
    let data = null;

    try {
      const res = await fetch(src, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      current = buildSVGFromPoints(data, gradId);
      stage.innerHTML = current;
      const svg = stage.querySelector('svg');
      if (wantDraw && svg) bindDrawOnView(stage, svg);
      bindGradientHover(stage);
      if (metaEl) {
        metaEl.textContent = `${data.pointCount.toLocaleString()} points · ${data.pathCount || data.paths.length} chains · ${data.method || 'traced'}`;
      }
    } catch (err) {
      stage.innerHTML = `<p class="body-sm" style="color:var(--neutral-500)">Could not load fingerprint points.</p>`;
      console.warn('[fingerprint]', err);
      return;
    }

    panel?.querySelector('[data-fp-download-svg]')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([current], { type: 'image/svg+xml' }));
      Object.assign(document.createElement('a'), { href: url, download: 'fingerprint.svg' }).click();
      URL.revokeObjectURL(url);
    });
    panel?.querySelector('[data-fp-download-points]')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: 'fingerprint-points.json' }).click();
      URL.revokeObjectURL(url);
    });
  }

  document.querySelectorAll('[data-fingerprint]').forEach((root, i) => { initRoot(root, i); });
})();
