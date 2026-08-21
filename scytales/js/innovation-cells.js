/* Cursor-lit navy stroke — shared by innovation cells + wallet showcase cards */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCALE_IDLE = 1;
  const SCALE_HOVER = 1.02;
  const SCALE_EASE = 0.085;
  const SPOT_EASE = 0.18;
  const SPOT_FADE = 0.12;

  function bind(el) {
    if (el.dataset.cursorStrokeReady) return;
    el.dataset.cursorStrokeReady = '1';
    const doScale = el.hasAttribute('data-cursor-stroke') && !reduce;
    let hovering = false;
    let scale = SCALE_IDLE;
    let targetScale = SCALE_IDLE;
    let spotX = 0.5;
    let spotY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let spotOpacity = 0;
    let targetOpacity = 0;
    let raf = 0;

    const setSpot = (clientX, clientY) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      targetX = (clientX - r.left) / r.width;
      targetY = (clientY - r.top) / r.height;
    };

    const tick = () => {
      raf = 0;
      let alive = false;

      if (doScale) {
        const next = scale + (targetScale - scale) * SCALE_EASE;
        if (Math.abs(next - scale) > 0.00015 || Math.abs(targetScale - scale) > 0.00015) {
          scale = next;
          el.style.setProperty('--cell-scale', scale.toFixed(5));
          alive = true;
        } else if (scale !== targetScale) {
          scale = targetScale;
          el.style.setProperty('--cell-scale', String(targetScale));
        }
      }

      spotX += (targetX - spotX) * SPOT_EASE;
      spotY += (targetY - spotY) * SPOT_EASE;
      spotOpacity += (targetOpacity - spotOpacity) * SPOT_FADE;

      el.style.setProperty('--spot-x', `${(spotX * 100).toFixed(2)}%`);
      el.style.setProperty('--spot-y', `${(spotY * 100).toFixed(2)}%`);
      el.style.setProperty('--spot-opacity', spotOpacity.toFixed(3));

      if (
        Math.abs(targetX - spotX) > 0.001 ||
        Math.abs(targetY - spotY) > 0.001 ||
        Math.abs(targetOpacity - spotOpacity) > 0.002 ||
        alive
      ) {
        raf = requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    el.addEventListener('pointerenter', (e) => {
      hovering = true;
      targetOpacity = 1;
      if (doScale) targetScale = SCALE_HOVER;
      setSpot(e.clientX, e.clientY);
      spotX = targetX;
      spotY = targetY;
      kick();
    });

    el.addEventListener('pointermove', (e) => {
      if (!hovering) return;
      setSpot(e.clientX, e.clientY);
      kick();
    });

    el.addEventListener('pointerleave', () => {
      hovering = false;
      targetOpacity = 0;
      if (doScale) targetScale = SCALE_IDLE;
      kick();
    });

    if (doScale) el.style.setProperty('--cell-scale', '1');
    el.style.setProperty('--spot-x', '50%');
    el.style.setProperty('--spot-y', '50%');
    el.style.setProperty('--spot-opacity', '0');
  }

  function init(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    [
      ...root.querySelectorAll('.innovation__cell'),
      ...root.querySelectorAll('[data-cursor-stroke]'),
    ].forEach(bind);
  }

  window.ScytalesCursorStroke = { init };
  init(document);
})();
