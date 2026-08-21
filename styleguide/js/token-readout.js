/* Style guide readouts — every documented value is read from the live tokens
   so this page can never drift from shared/tokens.css.

   [data-token="--x"]  -> prints the computed value of --x
   [data-measure="sel"] -> prints computed type metrics of the first match */
(() => {
  'use strict';

  const root = getComputedStyle(document.documentElement);

  const toHex = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return value.trim();
    const [r, g, b] = m[1].split(',').map((n) => Math.round(parseFloat(n)));
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  };

  /* color-mix() and var() chains only resolve once painted, so read the swatch
     itself rather than the raw custom-property text. */
  document.querySelectorAll('[data-token]').forEach((el) => {
    const token = el.getAttribute('data-token');
    const chip = el.closest('.swatch')?.querySelector('.chip');
    const painted = chip ? getComputedStyle(chip).backgroundColor : '';
    const raw = root.getPropertyValue(token).trim();
    el.textContent = painted ? toHex(painted) : raw || '—';
    el.title = `${token}: ${raw}`;
  });

  document.querySelectorAll('[data-measure]').forEach((el) => {
    const target = document.querySelector(el.getAttribute('data-measure'));
    if (!target) return;
    const cs = getComputedStyle(target);
    const px = (v) => `${Math.round(parseFloat(v) * 10) / 10}px`;
    el.textContent = [
      cs.fontFamily.split(',')[0].replace(/"/g, ''),
      `${px(cs.fontSize)}`,
      `lh ${(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2)}`,
      `ls ${cs.letterSpacing === 'normal' ? '0' : px(cs.letterSpacing)}`,
      `weight ${cs.fontWeight}`,
    ].join(' · ');
  });
})();
