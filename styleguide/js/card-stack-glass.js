/* Style-guide only: glass shader controls for stacked cards */
(() => {
  const stack = document.querySelector('[data-card-stack-glass]');
  const panel = document.querySelector('[data-card-stack-panel]');
  if (!stack || !panel) return;

  const cssEl = panel.querySelector('[data-card-stack-css]');
  const copyBtn = panel.querySelector('[data-card-stack-copy]');
  const resetBtn = panel.querySelector('[data-card-stack-reset]');
  const inputs = [...panel.querySelectorAll('[data-cg]')];

  const defaults = Object.fromEntries(
    inputs.map((el) => [el.dataset.cg, el.value])
  );

  const varName = (key) => `--cg-${key}`;

  const format = (key, value) => {
    const n = Number(value);
    if (['saturate', 'contrast', 'frost', 'specular', 'border', 'highlight', 'glow'].includes(key)) {
      return n.toFixed(2);
    }
    return String(Math.round(n));
  };

  function apply() {
    const lines = [];
    inputs.forEach((el) => {
      const key = el.dataset.cg;
      const formatted = format(key, el.value);
      stack.style.setProperty(varName(key), formatted);
      const label = panel.querySelector(`[data-cg-val="${key}"]`);
      if (label) label.textContent = formatted;
      lines.push(`  ${varName(key)}: ${formatted};`);
    });
    if (cssEl) cssEl.textContent = `.card-stack {\n${lines.join('\n')}\n}`;
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
    inputs.forEach((el) => { el.value = defaults[el.dataset.cg]; });
    apply();
  });

  apply();
})();
