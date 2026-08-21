/* Innovation dial — the backdrop graphic behind each node.

   The three maps are fetched and injected inline rather than used as
   <img>: an external image cannot inherit the page's colour (their stroke
   is currentColor, which inside an <img> resolves to the SVG's own black
   and vanished against the dark band) and, more importantly, its paths are
   unreachable, so nothing could animate them.

   Inline, every path is dashed by its own length and offset out of sight;
   when its node becomes current the offset runs to zero and the shape
   draws itself. Leaving the node winds it back, so it draws again on the
   way past.

   The fingerprint plate is mounted by shared/fingerprint.js, which injects
   its SVG asynchronously — it is picked up when it lands.

   js/innovation-dial.js calls show(index); nothing here listens to scroll.
*/
(() => {
  const arts = [...document.querySelectorAll('[data-dial-bg]')];
  if (!arts.length) return;

  const DURATION = 4200;   /* ms for a shape to finish drawing */
  /* Total stagger across a shape, not per path — the fingerprint is made
     of dozens of strokes and a fixed per-path delay would run for half a
     minute. */
  const STAGGER_TOTAL = 900;

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const paths = new Map();   /* art element -> its paths, once prepared */

  const prepare = (art) => {
    const list = [...art.querySelectorAll('path')];
    if (!list.length) return false;

    const stagger = STAGGER_TOTAL / Math.max(1, list.length);

    list.forEach((path, i) => {
      const length = path.getTotalLength();
      if (!length) return;
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = prefersReduced ? '0' : `${length}`;
      path.style.transition = prefersReduced
        ? 'none'
        : `stroke-dashoffset ${DURATION}ms cubic-bezier(.16, .6, .2, 1) ${(i * stagger).toFixed(0)}ms`;
    });
    paths.set(art, list);
    return true;
  };

  const setDrawn = (art, drawn) => {
    const list = paths.get(art);
    if (!list) return;
    list.forEach((path) => {
      path.style.strokeDashoffset = drawn
        ? '0'
        : path.style.strokeDasharray || '0';
    });
  };

  /* ---- Mounting ------------------------------------------------------ */
  const mountSvg = async (art) => {
    const src = art.getAttribute('data-bg-src');
    if (!src) return;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`${src}: ${res.status}`);
      art.innerHTML = await res.text();
      prepare(art);
      if (art.classList.contains('is-on')) setDrawn(art, true);
    } catch (err) {
      console.error('[dial-backdrop]', err);
    }
  };

  /* shared/fingerprint.js fills its host when the points file arrives. */
  const watchFingerprint = (art) => {
    if (prepare(art)) return;
    const io = new MutationObserver(() => {
      if (!prepare(art)) return;
      io.disconnect();
      if (art.classList.contains('is-on')) setDrawn(art, true);
    });
    io.observe(art, { childList: true, subtree: true });
  };

  arts.forEach((art) => {
    if (art.hasAttribute('data-bg-src')) mountSvg(art);
    else watchFingerprint(art);
  });

  /* Nothing draws until the band is actually on screen. The dial sets
     index 0 at boot, and without this gate Europe would finish drawing
     long before the section scrolls into view — arriving already complete,
     which is exactly what it should not do. */
  let visible = false;
  let current = 0;

  const apply = () => {
    arts.forEach((art) => {
      const on = Number(art.getAttribute('data-dial-bg')) === current;
      art.classList.toggle('is-on', on && visible);
      setDrawn(art, on && visible);
    });
  };

  const section = arts[0].closest('.innovation') || arts[0].parentElement;
  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
        apply();
      });
    },
    { threshold: 0.15 }
  ).observe(section);

  const show = (index) => {
    current = index;
    apply();
  };

  window.ScytalesDialBackdrop = { show };
})();
