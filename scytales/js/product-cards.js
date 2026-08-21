/* Product claims rail — dots follow the scroll, and clicking one moves it.

   The rail is a real scroll container, so the wheel, a trackpad swipe, a
   drag and the keyboard all work without help; this only mirrors the
   position into the dots and moves the rail when a dot is used. */
(() => {
  const wire = (root) => {
    const rail = root.querySelector('[data-pillars-rail]');
    const dotWrap = root.querySelector('[data-pillars-dots]');
    const cards = [...root.querySelectorAll('[data-pillars-rail] > li')];
    if (!rail || !dotWrap || !cards.length) return;

    dotWrap.innerHTML = cards
      .map((_, i) => `<button class="wallet-pillars__dot" type="button" aria-label="Card ${i + 1}"></button>`)
      .join('');
    const dots = [...dotWrap.querySelectorAll('.wallet-pillars__dot')];

    const sync = () => {
      /* Whichever card's left edge is nearest the rail's is the current
         one — the same rule the snap points use. */
      const railLeft = rail.getBoundingClientRect().left;
      let nearest = 0;
      let best = Infinity;
      cards.forEach((card, i) => {
        const delta = Math.abs(card.getBoundingClientRect().left - railLeft);
        if (delta < best) { best = delta; nearest = i; }
      });
      dots.forEach((dot, i) => dot.classList.toggle('is-on', i === nearest));
    };

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        rail.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
      });
    });

    let raf = 0;
    rail.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; sync(); });
    }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-pillars]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  /* Product pages build their body from a template after load. */
  window.addEventListener('scytales:product-ready', () => init());
  window.ScytalesProductCards = { init };
})();
