/* Self-drawing outline, anywhere on the site.

   Put [data-draw-in-view] on an empty element with data-draw-src pointing
   at an SVG. The file is fetched and injected inline — an <img> cannot
   inherit the page's colour and its paths are unreachable, so it could
   never be animated — then every path is dashed by its own length and
   offset out of sight. When the element scrolls into view the offset runs
   to zero and the shape draws itself.

   Currently used by the footer wordmark; the same hook works for anything
   else that should draw. */
(() => {
  const hosts = [...document.querySelectorAll('[data-draw-in-view]')];
  if (!hosts.length) return;

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const draw = (host) => {
    const paths = [...host.querySelectorAll('path')];
    if (!paths.length) return;

    const duration = Number(host.getAttribute('data-draw-ms')) || 4200;
    /* Spread across the shape rather than per path, so a mark made of
       many strokes does not take proportionally longer. */
    const stagger = 700 / Math.max(1, paths.length);

    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      if (!length) return;
      path.style.strokeDasharray = `${length}`;
      if (prefersReduced) {
        path.style.strokeDashoffset = '0';
        return;
      }
      path.style.strokeDashoffset = `${length}`;
      path.style.transition =
        `stroke-dashoffset ${duration}ms cubic-bezier(.16, .6, .2, 1) ${(i * stagger).toFixed(0)}ms`;
    });

    if (prefersReduced) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          paths.forEach((path) => { path.style.strokeDashoffset = '0'; });
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );
    io.observe(host);
  };

  hosts.forEach(async (host) => {
    const src = host.getAttribute('data-draw-src');
    if (!src) return draw(host);
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`${src}: ${res.status}`);
      host.innerHTML = await res.text();
      draw(host);
    } catch (err) {
      console.error('[draw-in-view]', err);
    }
  });
})();
