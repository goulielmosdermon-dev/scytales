/* European stars, filled with falling code.

   One canvas does all of it. The twelve stars are drawn as clip paths and
   the rain is drawn through them, so the ring can turn while the characters
   keep falling straight down — which is what you want: rotate the whole
   thing and the rain rotates with it, which reads as a spinning texture
   rather than as code falling inside stars.

   Nothing is on screen until the section arrives. Each column carries its
   own delay, so the fill trickles in rather than appearing whole, and the
   run stops itself once off screen. */

const GLYPHS = [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ΔΣΩΞΛ<>/\\=+*#$%&@'];
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

/* A five-pointed star, points up, as a path on the current context. */
const starPath = (ctx, cx, cy, r) => {
  const inner = r * 0.382; /* the classic ratio — a pentagram's inner radius */
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? inner : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
};

class EuroStars {
  constructor(host) {
    this.host = host;
    const d = host.dataset;
    this.opts = {
      stars: Number(d.stars) || 12,
      /* Ring radius and star radius, as fractions of the shorter side. */
      ring: Number(d.ring) || 0.34,
      star: Number(d.star) || 0.12,
      /* Degrees per second. Slow: it should read as drift, not as a spin. */
      spin: Number(d.spin) || 2.5,
      /* Fall speed in rows per second, and the size of a cell. */
      fall: Number(d.fall) || 9,
      cell: Number(d.cell) || 18,
      opacity: Number(d.opacity) || 0.2,
      colour: d.colour || '#ffffff',
    };

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    host.appendChild(this.canvas);
    host.style.setProperty('--stars-opacity', String(this.opts.opacity));

    this.columns = [];
    this.running = false;
    this.raf = 0;
    this.t0 = 0;

    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
  }

  resize() {
    const { canvas, host } = this;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.buildColumns();
    if (!this.running) this.paint(0);
  }

  /* One column per cell across the width. Each gets its own head position,
     speed jitter and start delay — the delay is what makes the fill trickle
     in from the top instead of arriving as a finished block. */
  buildColumns() {
    const { cell } = this.opts;
    const count = Math.ceil(this.w / cell);
    this.columns = Array.from({ length: count }, (_, i) => ({
      x: i * cell + cell / 2,
      head: 0,
      speed: 0.75 + Math.random() * 0.6,
      delay: Math.random() * 0.9,
      trail: 6 + ((Math.random() * 10) | 0),
      chars: [],
    }));
  }

  reset() {
    this.buildColumns();
    this.t0 = performance.now();
    this.paint(0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (!this.t0) this.t0 = performance.now();
    const frame = () => {
      this.raf = 0;
      if (!this.running) return;
      this.paint((performance.now() - this.t0) / 1000);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  paint(t) {
    const { ctx, w, h, opts } = this;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);
    const ring = base * opts.ring;
    const rStar = base * opts.star;
    const spin = (t * opts.spin * Math.PI) / 180;

    /* Clip to the twelve stars. The ring turns; the stars stay upright, as
       they do on the flag. */
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < opts.stars; i++) {
      const a = spin + (i * Math.PI * 2) / opts.stars - Math.PI / 2;
      starPath(ctx, cx + Math.cos(a) * ring, cy + Math.sin(a) * ring, rStar);
    }
    ctx.clip();

    /* The rain, drawn straight down through that clip. */
    const { cell, fall } = opts;
    ctx.font = `${Math.round(cell * 0.9)}px "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const rows = Math.ceil(h / cell) + 2;
    this.columns.forEach((col) => {
      const local = t - col.delay;
      if (local <= 0) return;
      const head = local * fall * col.speed;
      for (let k = 0; k < col.trail; k++) {
        const row = Math.floor(head) - k;
        if (row < 0) continue;
        const y = (row % rows) * cell + cell / 2;
        /* Only draw the leading edge on the first pass down, so the fill
           arrives as a falling front rather than as a full column. */
        if (head < rows && row > head) continue;
        if (!col.chars[row] || Math.random() < 0.06) col.chars[row] = pick();
        ctx.globalAlpha = k === 0 ? 1 : Math.max(0, 1 - k / col.trail);
        ctx.fillStyle = opts.colour;
        ctx.fillText(col.chars[row], col.x, y);
      }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

const instances = new WeakMap();

export const mount = (host) => {
  if (instances.has(host)) return instances.get(host);
  const stars = new EuroStars(host);
  instances.set(host, stars);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            host.classList.add('is-in');
            stars.reset();
            stars.start();
          } else {
            host.classList.remove('is-in');
            stars.stop();
          }
        }),
      { rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(host);
  } else {
    host.classList.add('is-in');
    stars.reset();
    stars.start();
  }
  return stars;
};

export const init = (scope = document) =>
  [...scope.querySelectorAll('[data-euro-stars]')].map(mount);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init(), { once: true });
} else {
  init();
}

window.EuroStars = { init, mount, get: (host) => instances.get(host) };
window.dispatchEvent(new CustomEvent('euro-stars:ready'));
