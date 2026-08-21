/* Self-drawing outlines for the Graphic Elements plates.

   Every path inside a [data-ge-plate] is dashed with its own length and
   offset by it, which hides it completely; scrolling the plate into view
   animates the offset back to zero, so the line appears to be drawn. The
   dash values are per-path, so a long coastline and a short state border
   take the same time rather than the same speed.

   The fingerprint plate is left alone — shared/fingerprint.js draws itself
   already (data-fp-draw) and this would fight it. */
(() => {
  const plates = [...document.querySelectorAll('[data-ge-plate]')];
  if (!plates.length) return;

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const DURATION = 3600;   /* ms for a plate to finish drawing */
  const STAGGER = 120;     /* ms between one path starting and the next */

  const arm = (plate) => {
    /* Skip the fingerprint: it owns its own draw. */
    if (plate.querySelector('[data-fingerprint]')) return null;

    const paths = [...plate.querySelectorAll('path')];
    if (!paths.length) return null;

    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      if (!length) return;
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.transition =
        `stroke-dashoffset ${DURATION}ms cubic-bezier(.33, 0, .12, 1) ${i * STAGGER}ms`;
    });
    return paths;
  };

  const draw = (paths) => {
    paths.forEach((path) => { path.style.strokeDashoffset = '0'; });
  };

  const armed = new Map();

  plates.forEach((plate) => {
    const paths = arm(plate);
    if (paths) armed.set(plate, paths);
  });

  if (prefersReduced) {
    armed.forEach(draw);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const paths = armed.get(entry.target);
        if (paths) draw(paths);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  armed.forEach((_, plate) => io.observe(plate));
})();
