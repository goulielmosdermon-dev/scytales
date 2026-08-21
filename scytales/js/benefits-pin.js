/* Pinned horizontal rail.

   The section grows by exactly the distance the rail has to travel, and its
   inner shell is sticky at the top of the viewport. So the moment the
   section's top reaches the top of the screen it holds there, the page
   scroll drives the track sideways, and as soon as the last block has
   arrived the section releases and the page carries on.

   The scroll position sets the target and the track eases toward it on a
   rAF loop, so a notched mouse wheel glides instead of stepping. A pointer
   drag is folded back into the page scroll, so grabbing the rail and
   scrolling the page move the same one thing. */
(() => {
  /* Phones get a stacked orange list (CSS) — the pin/side-scroll only
     works with a tall scrollport and a pointing device. */
  const mqMobile = window.matchMedia('(max-width: 767px)');

  const wire = (section) => {
    if (mqMobile.matches) return;
    if (section.dataset.pinReady) return;
    const sticky = section.querySelector('.benefits-rail__sticky');
    const track = section.querySelector('[data-benefits-rail]');
    if (!sticky || !track) return;
    section.dataset.pinReady = '1';

    /* The rail also runs inside the product sheet, which is its own
       scrollport — so measure and listen against whichever box actually
       scrolls, not the window. Getting this wrong is what left the sheet
       with a section sized to the viewport that never moved. */
    const scroller = (() => {
      let el = section.parentElement;
      while (el && el !== document.body) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === 'auto' || oy === 'scroll') return el;
        el = el.parentElement;
      }
      return null;
    })();
    const port = () => (scroller || document.scrollingElement || document.documentElement);
    const portHeight = () => (scroller ? scroller.clientHeight : window.innerHeight);
    const portTop = () => (scroller ? scroller.getBoundingClientRect().top : 0);

    let travel = 0;
    let target = 0;      /* where the scroll says the track should be */
    let current = 0;     /* where it actually is, easing toward target */
    let raf = 0;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const measure = () => {
      /* scrollWidth includes the lead inset and the trailing gutter, so the
         last block lands flush against the right edge at full travel. */
      travel = Math.max(0, track.scrollWidth - sticky.clientWidth);
      section.style.setProperty('--pin-travel', `${travel}px`);
      /* Height of the scrollport, not of the window — inside the sheet the
         two differ, and 100vh would overshoot by the sheet's padding. */
      section.style.setProperty('--pin-vh', `${portHeight()}px`);
      apply();
    };

    /* The scroll position is the target; the track eases toward it on a rAF
       loop. That smooths a notched mouse wheel's steps into one continuous
       glide, and the loop stops as soon as the two agree so nothing burns
       frames while the section is idle or off screen. */
    const tick = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.15) {
        current = target;
        raf = 0;
      } else {
        current += delta * 0.12;
        raf = requestAnimationFrame(tick);
      }
      section.style.setProperty('--pin-x', `${current}px`);
    };

    const apply = () => {
      const top = section.getBoundingClientRect().top - portTop();
      target = Math.max(0, Math.min(travel, -top));
      if (prefersReduced) {
        current = target;
        section.style.setProperty('--pin-x', `${current}px`);
        return;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => apply();

    (scroller || window).addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    if (scroller && 'ResizeObserver' in window) new ResizeObserver(measure).observe(scroller);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    measure();

    /* ---- drag the rail = scroll the page ---- */
    let pointerId = null;
    let lastX = 0;
    let moved = 0;

    sticky.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || pointerId !== null || travel <= 0) return;
      pointerId = e.pointerId;
      lastX = e.clientX;
      moved = 0;
      sticky.classList.add('is-dragging');
    });

    sticky.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      if (moved > 4) {
        if (!sticky.hasPointerCapture(pointerId)) sticky.setPointerCapture(pointerId);
        e.preventDefault();
        if (scroller) scroller.scrollTop -= dx;
        else window.scrollBy(0, -dx);
      }
    });

    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      if (sticky.hasPointerCapture(pointerId)) sticky.releasePointerCapture(pointerId);
      pointerId = null;
      sticky.classList.remove('is-dragging');
    };
    sticky.addEventListener('pointerup', end);
    sticky.addEventListener('pointercancel', end);

    sticky.addEventListener('click', (e) => {
      if (moved > 4) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);

    sticky.addEventListener('dragstart', (e) => e.preventDefault());
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-benefits-pin]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.addEventListener('scytales:product-ready', () => init());
  window.ScytalesBenefitsPin = { init };
})();
