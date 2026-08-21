/* EUDI line field — each stroke bends like a plucked guitar string under the cursor */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const svgUrl = new URL('../assets/innovation/eudi-lines-bg.svg', document.currentScript.src).href;

  const MAX_BEND = 38;
  const RADIUS = 155;
  const EASE = 0.16;
  const RETURN = 0.1;

  function parseCubic(d) {
    const nums = d.match(/-?\d*\.?\d+/g)?.map(Number);
    if (!nums || nums.length < 8) return null;
    return [
      { x: nums[0], y: nums[1] },
      { x: nums[2], y: nums[3] },
      { x: nums[4], y: nums[5] },
      { x: nums[6], y: nums[7] },
    ];
  }

  function formatCubic(pts) {
    const f = (p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    return `M${f(pts[0])} C${f(pts[1])} ${f(pts[2])} ${f(pts[3])}`;
  }

  function uniqIds(svg, prefix) {
    const ids = [...svg.querySelectorAll('[id]')].map((el) => el.id);
    let html = svg.outerHTML;
    ids.forEach((id) => {
      html = html.replaceAll(`id="${id}"`, `id="${prefix}${id}"`);
      html = html.replaceAll(`url(#${id})`, `url(#${prefix}${id})`);
    });
    return html;
  }

  async function init(host) {
    const mount = host.querySelector('[data-eudi-lines]');
    if (!mount) return;

    let raw;
    try {
      const res = await fetch(svgUrl, { cache: 'force-cache' });
      if (!res.ok) throw new Error(String(res.status));
      raw = await res.text();
    } catch (err) {
      console.warn('[eudi-lines]', err);
      return;
    }

    const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
    const svgIn = doc.querySelector('svg');
    if (!svgIn) return;

    mount.innerHTML = uniqIds(svgIn, 'eudi-');
    const svg = mount.querySelector('svg');
    if (!svg) return;

    const strings = [...svg.querySelectorAll('path')].map((el) => {
      const rest = parseCubic(el.getAttribute('d') || '');
      if (!rest) return null;
      const lx = rest[3].x - rest[0].x;
      const ly = rest[3].y - rest[0].y;
      const llen = Math.hypot(lx, ly) || 1;
      return {
        el,
        rest,
        cur: rest.map((p) => ({ x: p.x, y: p.y })),
        nx: -ly / llen,
        ny: lx / llen,
        ring: 0,
        ringVel: 0,
      };
    }).filter(Boolean);

    const svgPt = svg.createSVGPoint();
    let mx = 300;
    let my = 500;
    let tx = 300;
    let ty = 500;
    let hovering = false;

    function toSvg(clientX, clientY) {
      svgPt.x = clientX;
      svgPt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return svgPt.matrixTransform(ctm.inverse());
    }

    host.addEventListener('pointermove', (e) => {
      const p = toSvg(e.clientX, e.clientY);
      if (!p) return;
      tx = p.x;
      ty = p.y;
      hovering = true;
    });
    host.addEventListener('pointerleave', () => {
      hovering = false;
      strings.forEach((s) => {
        // convert stored bend into ringing along the string normal
        const bend = (s.cur[1].x - s.rest[1].x) * s.nx + (s.cur[1].y - s.rest[1].y) * s.ny;
        s.ring = bend / MAX_BEND;
        s.ringVel = 0;
      });
    });

    function targetOffset(s, t, mouseX, mouseY) {
      const p0 = s.rest[0];
      const p3 = s.rest[3];
      const lx = p3.x - p0.x;
      const ly = p3.y - p0.y;
      const llen = Math.hypot(lx, ly) || 1;
      const ux = lx / llen;
      const uy = ly / llen;
      const { nx, ny } = s;

      const vx = mouseX - p0.x;
      const vy = mouseY - p0.y;
      const along = Math.max(0, Math.min(1, (vx * ux + vy * uy) / llen));
      const cx = p0.x + ux * along * llen;
      const cy = p0.y + uy * along * llen;
      const signed = (mouseX - cx) * nx + (mouseY - cy) * ny;
      const dist = Math.abs(signed);

      const stringFall = Math.exp(-(dist * dist) / (RADIUS * RADIUS));
      const alongDist = (t - along) * llen;
      const waveFall = Math.exp(-(alongDist * alongDist) / ((RADIUS * 0.9) ** 2));
      const endFix = Math.sin(Math.PI * Math.max(0.04, Math.min(0.96, t)));

      if (!hovering) {
        const wobble = s.ring * MAX_BEND * 0.85 * endFix * waveFall;
        return { dx: nx * wobble, dy: ny * wobble };
      }

      const pull = Math.max(-MAX_BEND, Math.min(MAX_BEND, signed * 0.55));
      const mag = pull * stringFall * waveFall * endFix;
      return { dx: nx * mag, dy: ny * mag };
    }

    function tick() {
      const follow = hovering ? 0.18 : 0.1;
      mx += (tx - mx) * follow;
      my += (ty - my) * follow;

      strings.forEach((s) => {
        if (!hovering) {
          s.ringVel += -s.ring * 0.14;
          s.ringVel *= 0.86;
          s.ring += s.ringVel;
          if (Math.abs(s.ring) < 0.001 && Math.abs(s.ringVel) < 0.001) {
            s.ring = 0;
            s.ringVel = 0;
          }
        }

        s.rest.forEach((rp, i) => {
          const { dx, dy } = targetOffset(s, i / 3, mx, my);
          const ease = hovering ? EASE : RETURN;
          s.cur[i].x += (rp.x + dx - s.cur[i].x) * ease;
          s.cur[i].y += (rp.y + dy - s.cur[i].y) * ease;
        });

        s.el.setAttribute('d', formatCubic(s.cur));
      });

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  document.querySelectorAll('.innovation__cell--eudi').forEach((cell) => { init(cell); });
})();
