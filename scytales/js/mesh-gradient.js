/* Interactive aurora mesh — soft blob positions follow the cursor */
(() => {
  document.querySelectorAll('[data-mesh-gradient]').forEach((mesh) => {
    const host = mesh.closest('.innovation__cell') || mesh.parentElement;
    const spots = [...mesh.querySelectorAll('.innovation__mesh-spot')];
    if (!host || !spots.length) return;

    const bases = spots.map((el) => ({
      x: parseFloat(el.style.getPropertyValue('--x')) || 50,
      y: parseFloat(el.style.getPropertyValue('--y')) || 50,
      // parallax depth — farther spots drift less
      depth: 0.35 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    }));

    let tx = 0.5, ty = 0.5;
    let cx = 0.5, cy = 0.5;
    let hovering = false;
    let t = 0;

    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top) / r.height;
      hovering = true;
    });
    host.addEventListener('pointerleave', () => {
      hovering = false;
      tx = 0.5;
      ty = 0.5;
    });

    function tick() {
      t += 0.008;
      const ease = hovering ? 0.07 : 0.045;
      cx += (tx - cx) * ease;
      cy += (ty - cy) * ease;

      spots.forEach((el, i) => {
        const b = bases[i];
        const driftX = Math.sin(t * 0.7 + b.phase) * 2;
        const driftY = Math.cos(t * 0.55 + b.phase) * 1.6;
        /* Prefer horizontal pull; keep vertical band (white→orange→blue) */
        const pullX = (cx - 0.5) * 26 * b.depth;
        const pullY = (cy - 0.5) * 10 * b.depth;
        const x = b.x + pullX + driftX;
        const y = b.y + pullY + driftY;
        el.style.setProperty('--x', `${x.toFixed(2)}%`);
        el.style.setProperty('--y', `${y.toFixed(2)}%`);
      });

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
})();
