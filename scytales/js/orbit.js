/* Orbit — steps the sphere through its four traced states.

   All the geometry lives in CSS: each state is a set of custom properties
   on .orb selected by [data-orb-state], and the rings transition their
   width, height and rotation between them. So this only has to advance a
   number from 1 to 4 and keep the tag's index and label in step — which
   also means a state can be retuned in the style guide without touching a
   line of script.

   There are always four states; the label list wraps around them, so a
   section with fewer labels than states still turns through all four. */
(() => {
  const STEP_MS = 3200;
  const STATES = 4;

  const wire = (el) => {
    if (el.dataset.orbReady) return;
    el.dataset.orbReady = '1';

    let labels = [];
    try {
      labels = JSON.parse(el.dataset.orbStates || '[]');
    } catch {
      labels = [];
    }
    if (!labels.length) return;

    const indexEl = el.querySelector('[data-orb-index]');
    const labelEl = el.querySelector('[data-orb-label]');
    let i = 0;
    let timer = 0;

    const show = () => {
      el.dataset.orbState = String((i % STATES) + 1);
      if (indexEl) indexEl.textContent = String(i + 1);
      if (labelEl) labelEl.textContent = labels[i];
    };

    const advance = () => {
      i = (i + 1) % labels.length;
      show();
    };

    show();

    /* Only run while it is on screen — an off-screen timer just burns
       frames and forces layout for nothing. */
    const start = () => { if (!timer) timer = setInterval(advance, STEP_MS); };
    const stop = () => { clearInterval(timer); timer = 0; };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      }, { rootMargin: '0px 0px -10% 0px' }).observe(el);
    } else {
      start();
    }
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-orb]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.ScytalesOrbit = { init };
})();
