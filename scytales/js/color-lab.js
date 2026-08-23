/* Color Lab — live earth + band colour previewer.
   Persists to localStorage. Drives CSS tokens and dotted-globe iframes. */
(() => {
  'use strict';

  const STORAGE = 'scytales-color-lab';

  const DEFAULTS = {
    open: false,
    earth: {
      bandBg: '#000098',
      tint: '#FFFFFF',
      lightCol: '#4194C8',
      darkCol: '#080917',
    },
    earthLight: { angle: 319, elev: 0, soft: 101 },
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return structuredClone(DEFAULTS);
      const saved = JSON.parse(raw);
      return {
        open: !!saved.open,
        earth: { ...DEFAULTS.earth, ...saved.earth },
        earthLight: { ...DEFAULTS.earthLight, ...saved.earthLight },
      };
    } catch {
      return structuredClone(DEFAULTS);
    }
  };

  let state = load();

  const save = () => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  };

  const normHex = (value) => {
    const hex = String(value || '').replace(/^#/, '').trim();
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
    return `#${hex.toUpperCase()}`;
  };

  const apply = () => {
    const doc = document.documentElement;
    const { earth, earthLight } = state;

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

  const syncUi = (root) => {
    root.classList.toggle('is-open', state.open);
    root.querySelector('[data-cl-toggle]')?.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    root.querySelector('[data-cl-panel]')?.toggleAttribute('hidden', !state.open);
  };

  const buildColorRow = (root, { label, get, set, def }) => {
    const row = document.createElement('div');
    row.className = 'color-lab__row';

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'color-lab__swatch';
    swatch.value = get();

    const meta = document.createElement('div');
    meta.className = 'color-lab__row-name';
    meta.innerHTML = `${label}<span class="color-lab__row-hex">${get()}</span>`;

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'color-lab__row-reset';
    reset.setAttribute('aria-label', `Reset ${label}`);
    reset.textContent = '×';

    const refresh = () => {
      const hex = get();
      swatch.value = hex;
      meta.querySelector('.color-lab__row-hex').textContent = hex;
      row.classList.toggle('is-custom', hex.toUpperCase() !== def.toUpperCase());
    };

    swatch.addEventListener('input', () => {
      const hex = normHex(swatch.value);
      if (!hex) return;
      set(hex);
      save();
      apply();
      refresh();
    });

    reset.addEventListener('click', () => {
      set(def);
      save();
      apply();
      refresh();
    });

    row.append(swatch, meta, reset);
    root.appendChild(row);
    refresh();
  };

  const buildSlider = (root, { label, min, max, step, get, set, format }) => {
    const wrap = document.createElement('label');
    wrap.className = 'color-lab__slider';

    const meta = document.createElement('div');
    meta.className = 'color-lab__slider-meta';
    const name = document.createElement('span');
    name.textContent = label;
    const readout = document.createElement('span');
    readout.textContent = format(get());
    meta.append(name, readout);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());

    input.addEventListener('input', () => {
      set(Number(input.value));
      readout.textContent = format(get());
      save();
      apply();
    });

    wrap.append(meta, input);
    root.appendChild(wrap);
  };

  const buildPanel = () => {
    const root = document.createElement('div');
    root.className = 'color-lab';
    root.setAttribute('data-color-lab', '');

    root.innerHTML = `
      <button class="color-lab__toggle" type="button" aria-expanded="false" data-cl-toggle>Color Lab</button>
      <div class="color-lab__panel" data-cl-panel hidden>
        <p class="color-lab__title">Color Lab</p>
        <p class="color-lab__hint">Earth band + globe colours. Saved in this browser.</p>
        <div class="color-lab__section" data-cl-earth></div>
        <div class="color-lab__section" data-cl-light></div>
        <button class="color-lab__reset" type="button" data-cl-reset-earth>Reset earth colours</button>
        <button class="color-lab__reset" type="button" data-cl-reset-all>Reset all</button>
      </div>
    `;

    document.body.appendChild(root);

    root.querySelector('[data-cl-toggle]')?.addEventListener('click', () => {
      state.open = !state.open;
      save();
      syncUi(root);
    });

    const earthSec = root.querySelector('[data-cl-earth]');
    earthSec.innerHTML = '<span class="color-lab__label">Earth band</span>';
    buildColorRow(earthSec, {
      label: 'Section background',
      get: () => state.earth.bandBg,
      set: (v) => { state.earth.bandBg = v; },
      def: DEFAULTS.earth.bandBg,
    });
    buildColorRow(earthSec, {
      label: 'Land dots',
      get: () => state.earth.tint,
      set: (v) => { state.earth.tint = v; },
      def: DEFAULTS.earth.tint,
    });
    buildColorRow(earthSec, {
      label: 'Globe lit side',
      get: () => state.earth.lightCol,
      set: (v) => { state.earth.lightCol = v; },
      def: DEFAULTS.earth.lightCol,
    });
    buildColorRow(earthSec, {
      label: 'Globe shadow',
      get: () => state.earth.darkCol,
      set: (v) => { state.earth.darkCol = v; },
      def: DEFAULTS.earth.darkCol,
    });

    const lightSec = root.querySelector('[data-cl-light]');
    lightSec.innerHTML = '<span class="color-lab__label">Globe light</span>';
    buildSlider(lightSec, {
      label: 'Angle',
      min: 0,
      max: 360,
      step: 1,
      get: () => state.earthLight.angle,
      set: (v) => { state.earthLight.angle = v; },
      format: (v) => `${Math.round(v)}°`,
    });
    buildSlider(lightSec, {
      label: 'Elevation',
      min: 0,
      max: 90,
      step: 1,
      get: () => state.earthLight.elev,
      set: (v) => { state.earthLight.elev = v; },
      format: (v) => `${Math.round(v)}°`,
    });
    buildSlider(lightSec, {
      label: 'Terminator soft',
      min: 20,
      max: 200,
      step: 1,
      get: () => state.earthLight.soft,
      set: (v) => { state.earthLight.soft = v; },
      format: (v) => `${Math.round(v)}%`,
    });

    root.querySelector('[data-cl-reset-earth]')?.addEventListener('click', () => {
      state.earth = structuredClone(DEFAULTS.earth);
      state.earthLight = structuredClone(DEFAULTS.earthLight);
      save();
      apply();
      root.remove();
      buildPanel();
    });

    root.querySelector('[data-cl-reset-all]')?.addEventListener('click', () => {
      state = structuredClone(DEFAULTS);
      save();
      apply();
      root.remove();
      buildPanel();
    });

    syncUi(root);
  };

  apply();
  buildPanel();

  const onGlobeReady = () => apply();
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'scytales-earth-ready' || e.data?.type === 'globe-ready') onGlobeReady();
  });
  document.querySelectorAll('iframe[src*="dotted-globe"]').forEach((frame) => {
    frame.addEventListener('load', onGlobeReady);
  });

  window.ScytalesColorLab = { apply, getState: () => state };
})();
