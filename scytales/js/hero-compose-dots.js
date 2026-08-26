/* Orange dot field behind the hero product compose.
   Soft pulse + cursor proximity scale (smooth, low-gain falloff). */
(() => {
  const stage = document.querySelector('[data-compose-reveal]');
  if (!stage) return;

  const canvas = stage.querySelector('[data-compose-dots]');
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const GAP = 14;
  const BASE_R = 0.7;
  const MAX_R = 2.15;
  const INFLUENCE = 190;
  const FOLLOW = 0.055;       /* cursor lerp — lower = softer trail */
  const HOVER_FADE = 0.04;    /* how fast proximity strength eases in/out */
  const PULSE_HZ = 0.28;      /* breath cycle */
  const PULSE_AMP = 0.55;     /* stronger size / opacity swing */

  let dpr = 1;
  let w = 0;
  let h = 0;
  let dots = [];
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let hover = 0;              /* 0..1 — 0 when pointer left */
  let hoverTarget = 0;
  let running = false;
  let visible = false;
  let raf = 0;
  let t0 = performance.now();

  const readOrange = () => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--orange-500')
      .trim();
    return raw || '#E6411C';
  };

  let orange = readOrange();

  const rebuild = () => {
    const rect = stage.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    const cols = Math.ceil(w / GAP) + 1;
    const rows = Math.ceil(h / GAP) + 1;
    const ox = (w - (cols - 1) * GAP) / 2;
    const oy = (h - (rows - 1) * GAP) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = ox + col * GAP;
        const y = oy + row * GAP;
        /* Spatial phase so the pulse ripples across the field. */
        dots.push({
          x,
          y,
          phase: (x * 0.017 + y * 0.013) % (Math.PI * 2),
        });
      }
    }

    if (mx === 0 && my === 0) {
      mx = w * 0.5;
      my = h * 0.5;
      tx = mx;
      ty = my;
    }
  };

  const draw = (now) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = orange;

    const time = (now - t0) / 1000;
    const pulseAngle = time * PULSE_HZ * Math.PI * 2;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const pulse = prefersReduced
        ? 0
        : Math.sin(pulseAngle + d.phase) * PULSE_AMP;

      let r = BASE_R * (1 + pulse);
      let a = 0.26 * (1 + pulse * 0.85);

      if (!prefersReduced && hover > 0.01) {
        const dx = d.x - mx;
        const dy = d.y - my;
        const dist = Math.hypot(dx, dy);
        /* Soft gaussian falloff — wider, gentler than a hard rim. */
        const g = Math.exp(-(dist * dist) / (2 * INFLUENCE * INFLUENCE));
        const prox = g * hover;
        r = BASE_R * (1 + pulse) + (MAX_R - BASE_R) * prox;
        a = 0.22 * (1 + pulse * 0.75) + 0.42 * prox;
      }

      ctx.globalAlpha = Math.max(0.1, Math.min(0.92, a));
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0.4, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const tick = (now) => {
    if (!running) return;
    if (!prefersReduced) {
      mx += (tx - mx) * FOLLOW;
      my += (ty - my) * FOLLOW;
      hover += (hoverTarget - hover) * HOVER_FADE;
    }
    draw(now);
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running || !visible) return;
    running = true;
    raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const onMove = (e) => {
    const rect = stage.getBoundingClientRect();
    tx = e.clientX - rect.left;
    ty = e.clientY - rect.top;
    hoverTarget = 1;
    if (prefersReduced) {
      mx = tx;
      my = ty;
      hover = 1;
      draw(performance.now());
    }
  };

  const onLeave = () => {
    hoverTarget = 0;
  };

  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerleave', onLeave, { passive: true });

  const ro = new ResizeObserver(() => {
    rebuild();
    draw(performance.now());
  });
  ro.observe(stage);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        });
      },
      { threshold: 0.05 }
    ).observe(stage);
  } else {
    visible = true;
    start();
  }

  rebuild();
  draw(performance.now());
  if (!prefersReduced) start();

  window.addEventListener(
    'scytales:tokens',
    () => {
      orange = readOrange();
      draw(performance.now());
    },
    { passive: true }
  );
})();
