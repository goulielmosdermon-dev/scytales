/* Style-guide only: live glass controls for .phone-device */
(() => {
  const phone = document.querySelector('[data-phone-glass]');
  const panel = document.querySelector('[data-phone-glass-panel]');
  if (!phone || !panel) return;

  const cssEl = panel.querySelector('[data-phone-glass-css]');
  const copyBtn = panel.querySelector('[data-phone-glass-copy]');
  const resetBtn = panel.querySelector('[data-phone-glass-reset]');
  const inputs = [...panel.querySelectorAll('[data-glass]')];

  const defaults = Object.fromEntries(
    inputs.map((el) => [el.dataset.glass, el.value])
  );

  const varName = (key) => `--glass-${key}`;

  const format = (key, value) => {
    const n = Number(value);
    if (key === 'saturate') return n.toFixed(2);
    if (['white', 'peach', 'border', 'specular', 'inset-a', 'highlight'].includes(key)) {
      return n.toFixed(2);
    }
    return String(Math.round(n));
  };

  function apply() {
    const lines = [];
    inputs.forEach((el) => {
      const key = el.dataset.glass;
      const formatted = format(key, el.value);
      phone.style.setProperty(varName(key), formatted);
      const label = panel.querySelector(`[data-glass-val="${key}"]`);
      if (label) label.textContent = formatted;
      lines.push(`  ${varName(key)}: ${formatted};`);
    });
    if (cssEl) {
      cssEl.textContent = `.phone-device {\n${lines.join('\n')}\n}`;
    }
  }

  inputs.forEach((el) => el.addEventListener('input', apply));

  copyBtn?.addEventListener('click', async () => {
    apply();
    try {
      await navigator.clipboard.writeText(cssEl?.textContent || '');
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy CSS'; }, 1400);
    } catch (_) {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy CSS'; }, 1400);
    }
  });

  resetBtn?.addEventListener('click', () => {
    inputs.forEach((el) => {
      el.value = defaults[el.dataset.glass];
    });
    Object.keys(defaults).forEach((key) => {
      phone.style.removeProperty(varName(key));
    });
    // Re-apply so readout matches defaults without forcing inline if we cleared —
    // keep inline for live preview consistency after reset.
    apply();
  });

  apply();
})();
