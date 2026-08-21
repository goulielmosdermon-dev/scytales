/* Style-guide + main-site Earth impact states — maps to “backbone” stats.
   State 1: EU-centered density — existing white land dots recolored orange over Europe only.
   State 2: recolor existing land dots that already sit inside a “10” glyph (no moving).
   State 3: 27 of those dots travel from the “10” to EU member locations across Europe.
   State 4: land gradually washes orange; ~5% random whites remain (#1 ISO mDL).

   Wire any container with [data-earth-demo] + [data-earth-state-btn] buttons + an iframe globe. */
(() => {
  const STATES = {
    1: { num: '450m+', label: 'EU citizens served' },
    2: { num: '10+',   label: 'years of expertise' },
    3: { num: '27',    label: 'EU member states' },
    4: { num: '#1',    label: 'global leader in ISO mDL' },
  };

  document.querySelectorAll('[data-earth-demo]').forEach((demo) => {
    const buttons = [...demo.querySelectorAll('[data-earth-state-btn]')];
    const numEl = demo.querySelector('[data-earth-num]');
    const labelEl = demo.querySelector('[data-earth-label]');
    const iframe = demo.querySelector('.earth-stage__globe, iframe');

    const postState = (id) => {
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage({ type: 'scytales-earth-state', state: Number(id) }, '*');
    };

    const setState = (id) => {
      const state = STATES[id];
      if (!state) return;
      demo.dataset.earthState = String(id);
      buttons.forEach((btn) => {
        const on = btn.getAttribute('data-earth-state-btn') === String(id);
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      if (numEl) numEl.textContent = state.num;
      if (labelEl) labelEl.textContent = state.label;
      postState(id);
      demo.dispatchEvent(new CustomEvent('earth:state', {
        bubbles: true,
        detail: { state: Number(id), ...state },
      }));
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setState(btn.getAttribute('data-earth-state-btn'));
      });
    });

    // Globe posts ready after orange layer is built
    window.addEventListener('message', (e) => {
      if (e.data?.type !== 'scytales-earth-ready') return;
      if (e.source !== iframe?.contentWindow) return;
      postState(demo.dataset.earthState || '1');
    });

    iframe?.addEventListener('load', () => {
      postState(demo.dataset.earthState || '1');
    });

    setState(demo.dataset.earthState || '1');
  });
})();
