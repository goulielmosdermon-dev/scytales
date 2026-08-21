/* Grab-and-drag plus wheel-over-the-section scrolling for any horizontal
   scroll container marked [data-drag-scroll].

   The wheel handler turns a vertical wheel into horizontal travel and eases
   toward the target on rAF, so a notched mouse wheel glides instead of
   stepping. It only takes the event while the rail still has room in that
   direction — at either end the page scrolls on as normal. */
(() => {
  const wire = (rail) => {
    if (rail.dataset.dragScrollReady) return;
    rail.dataset.dragScrollReady = '1';

    let pointerId = null;
    let startX = 0;
    let startLeft = 0;
    let moved = 0;

    /* ---- smooth wheel ---- */
    let target = rail.scrollLeft;
    let gliding = false;

    const maxLeft = () => rail.scrollWidth - rail.clientWidth;

    const glide = () => {
      const delta = target - rail.scrollLeft;
      if (Math.abs(delta) < 0.5) {
        rail.scrollLeft = target;
        gliding = false;
        return;
      }
      rail.scrollLeft += delta * 0.18;
      requestAnimationFrame(glide);
    };

    rail.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      /* A trackpad's own horizontal gesture is already the right axis. */
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!raw) return;
      const step = e.deltaMode === 1 ? raw * 16 : raw;
      const limit = maxLeft();
      if (limit <= 0) return;
      /* Let the page take over once the rail is against an end. */
      const atStart = rail.scrollLeft <= 0.5 && step < 0;
      const atEnd = rail.scrollLeft >= limit - 0.5 && step > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      if (!gliding) target = rail.scrollLeft;
      target = Math.max(0, Math.min(limit, target + step));
      if (!gliding) {
        gliding = true;
        requestAnimationFrame(glide);
      }
    }, { passive: false });

    rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || pointerId !== null) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      moved = 0;
      gliding = false;            /* a grab wins over an in-flight glide */
      target = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });

    rail.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > moved) moved = Math.abs(dx);
      /* Only capture once it is clearly a drag, so a plain click still
         reaches whatever is inside the rail. */
      if (moved > 4 && !rail.hasPointerCapture(pointerId)) {
        rail.setPointerCapture(pointerId);
      }
      if (moved > 4) {
        e.preventDefault();
        rail.scrollLeft = startLeft - dx;
        target = rail.scrollLeft;
      }
    });

    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      if (rail.hasPointerCapture(pointerId)) rail.releasePointerCapture(pointerId);
      pointerId = null;
      rail.classList.remove('is-dragging');
    };
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointercancel', end);

    rail.addEventListener('click', (e) => {
      if (moved > 4) {
        e.preventDefault();
        e.stopPropagation();
        moved = 0;
      }
    }, true);

    rail.addEventListener('dragstart', (e) => e.preventDefault());
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-drag-scroll]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.addEventListener('scytales:product-ready', () => init());
  window.ScytalesDragScroll = { init };
})();
