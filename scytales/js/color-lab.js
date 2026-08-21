/* Color Lab — frozen Aug 2026.
   Desktop Color Lab palette is baked into shared/tokens.css (and the
   globe defaults in dotted-globe.html). This file re-applies those
   values so a stale mobile localStorage entry cannot diverge, and
   never mounts UI. */
(() => {
  const STORAGE = 'scytales-color-lab';

  const FROZEN = {
    open: false,
    orange: { h: 14, s: -1, l: 0 },
    navy: { h: 14, s: -51, l: -3 },
    line: '',
    text: { ink: '', head: '', accent: '#E7411D', muted: '' },
    earth: {
      tint: '#FFFFFF',
      lightCol: '#4194C8',
      darkCol: '#0B0061',
      glowInner: '',
      glowOuter: '',
      glowBottom: '',
      glowTop: '',
    },
    earthLight: { angle: 319, elev: 0, soft: 101 },
  };

  /* Resolved hexes — same as shared/tokens.css after the freeze. */
  const TOKENS = {
    '--orange-500': '#E7411D',
    '--orange-mark': '#E5701D',
    '--orange-600': '#C26019',
    '--orange-300': '#ECA36F',
    '--orange-100': '#FAE5D6',
    '--rust-700': '#7B470F',
    '--navy-900': '#020206',
    '--navy-800': '#080917',
    '--navy-600': '#323339',
    '--ink': '#080917',
    '--earth-tint': '#FFFFFF',
    '--earth-light': '#4194C8',
    '--earth-dark': '#0B0061',
  };

  const apply = () => {
    const doc = document.documentElement;
    Object.entries(TOKENS).forEach(([token, value]) => {
      doc.style.setProperty(token, value);
    });
    doc.style.removeProperty('--frame-line'); /* falls back to --orange-300 */

    const payload = {
      type: 'globe-tint',
      tint: FROZEN.earth.tint,
      lightCol: FROZEN.earth.lightCol,
      darkCol: FROZEN.earth.darkCol,
      angle: FROZEN.earthLight.angle,
      elev: FROZEN.earthLight.elev,
      soft: FROZEN.earthLight.soft / 100,
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
    /* ignore */
  }

  apply();

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'globe-ready') apply();
  });
  document.querySelectorAll('iframe[src*="dotted-globe"]').forEach((frame) => {
    frame.addEventListener('load', apply);
  });
})();
