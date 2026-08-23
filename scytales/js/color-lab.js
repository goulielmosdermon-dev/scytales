/* Color Lab — frozen Aug 2026.
   Earth band + globe colours are baked into shared/tokens.css and
   dotted-globe.html defaults. This file re-applies them on every load
   (so stale localStorage cannot diverge) and never mounts UI. */
(() => {
  'use strict';

  const STORAGE = 'scytales-color-lab';

  /* Snapshot — must stay in step with shared/tokens.css + globe uniforms. */
  const FROZEN = {
    open: false,
    earth: {
      bandBg: '#000098',
      tint: '#FFFFFF',
      lightCol: '#4194C8',
      darkCol: '#003580',
    },
    earthLight: { angle: 319, elev: 0, soft: 101 },
  };

  const apply = () => {
    const doc = document.documentElement;
    const { earth, earthLight } = FROZEN;

    doc.style.setProperty('--earth-band-bg', earth.bandBg);
    doc.style.setProperty('--earth-tint', earth.tint);
    doc.style.setProperty('--earth-light', earth.lightCol);
    doc.style.setProperty('--earth-dark', earth.darkCol);

    const payload = {
      type: 'globe-tint',
      tint: earth.tint,
      lightCol: earth.lightCol,
      darkCol: earth.darkCol,
      angle: earthLight.angle,
      elev: earthLight.elev,
      soft: earthLight.soft / 100,
    };

    document.querySelectorAll('iframe[src*="dotted-globe"]').forEach((frame) => {
      try {
        frame.contentWindow?.postMessage(payload, '*');
      } catch {
        /* frame not ready */
      }
    });
  };

  try {
    localStorage.setItem(STORAGE, JSON.stringify(FROZEN));
  } catch {
    /* ignore quota / private mode */
  }

  apply();

  const onGlobeReady = () => apply();
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'scytales-earth-ready' || e.data?.type === 'globe-ready') onGlobeReady();
  });
  const wireGlobes = () => {
    document.querySelectorAll('iframe[src*="dotted-globe"]').forEach((frame) => {
      frame.addEventListener('load', onGlobeReady);
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireGlobes, { once: true });
  } else {
    wireGlobes();
  }

  window.ScytalesColorLab = { apply, getState: () => structuredClone(FROZEN) };
})();
