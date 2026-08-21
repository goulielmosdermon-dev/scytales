/* Line-by-line reveal — the sibling of display1-reveal.js, which enters
   word by word. Any [data-line-reveal] whose children are .statement__line
   (or any element carrying --line-i) plays when it scrolls into view.
   Mark the same element [data-display1-skip] so the word splitter leaves
   it alone; the two would otherwise fight over the same children. */
(() => {
  const READY_CLASS = 'is-revealed';
  const LINE_SELECTOR = '.statement__line';

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  /* The breaks are authored and must not wrap, so the type is set as large
     as the widest line allows: start from the Display 1 size, measure the
     widest line at that size, and scale down only if it overflows. Runs
     again on resize and whenever the Font Lab swaps a family, since a
     wider face needs a smaller size to hold the same breaks. */
  const fit = (el) => {
    const lines = [...el.querySelectorAll(LINE_SELECTOR)];
    if (!lines.length) return;

    /* Back to the size the stylesheet asks for, and read it from the
       element itself. Reading --fs-display-1 off :root does not work: a
       custom property computes to its unresolved token text ("calc(44 *
       …)"), so parseFloat picked up 44 rather than the rendered size. */
    el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(el).fontSize);
    const available = el.clientWidth;
    if (!base || !available) return;

    /* A Range measures the text itself. scrollWidth cannot be trusted
       here: the lines are display:block with overflow visible, so the
       browser reports the box width, not the content that spills past it —
       which is why an over-long line was never detected. */
    const range = document.createRange();
    const widestAt = () => {
      let widest = 0;
      lines.forEach((line) => {
        range.selectNodeContents(line);
        widest = Math.max(widest, range.getBoundingClientRect().width);
      });
      return widest;
    };

    let size = base;
    /* Two passes: the first sets the size, and re-measuring the scramble's
       character boxes against it can shift the width by a hair, so the
       second settles it. */
    for (let pass = 0; pass < 2; pass++) {
      const widest = widestAt();
      if (!widest) return;
      if (widest <= available) break;
      size = Math.floor(size * (available / widest) * 100) / 100;
      el.style.fontSize = `${size}px`;
      window.ScytalesTextScramble?.remeasure?.();
    }
  };

  const fitAll = () => {
    document.querySelectorAll('[data-line-reveal]').forEach(fit);
  };

  const prepare = (el) => {
    [...el.querySelectorAll(LINE_SELECTOR)].forEach((line, i) => {
      line.style.setProperty('--line-i', String(i));
    });
  };

  const play = (el) => {
    el.classList.add(READY_CLASS);
  };

  const observe = (el) => {
    prepare(el);
    if (document.fonts?.ready) document.fonts.ready.then(() => fit(el));
    else fit(el);

    if (prefersReduced) {
      play(el);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          play(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-line-reveal]').forEach(observe);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 120);
  });
  window.addEventListener('scytales:fonts-changed', fitAll);

  window.ScytalesLineReveal = { init, observe, fit: fitAll };
})();
