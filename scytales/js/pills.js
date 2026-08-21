/* Capability rows: trickle in on scroll, open one at a time on click.

   The stagger is a CSS transition delayed by each row's index, switched on
   by a single class — no per-row timers, so a long list costs one observer
   and nothing while it sits still. The open/close state is carried by
   aria-expanded, which the CSS keys off, so the accessible state and the
   visual state cannot disagree. */
(() => {
  const wire = (list) => {
    if (list.dataset.pillsReady) return;
    list.dataset.pillsReady = '1';

    /* Trickle down: the whole list is revealed at once and each row's own
       delay staggers it, so the order always follows the markup. */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            list.classList.add('is-in');
            io.disconnect();
          });
        },
        { rootMargin: '0px 0px -12% 0px' }
      );
      io.observe(list);
    } else {
      list.classList.add('is-in');
    }

    list.addEventListener('click', (e) => {
      const row = e.target.closest('.cms-pill__row');
      if (!row || !list.contains(row)) return;
      const open = row.getAttribute('aria-expanded') === 'true';
      /* One at a time — a stack of open panels loses the list. */
      list.querySelectorAll('.cms-pill__row[aria-expanded="true"]').forEach((r) => {
        r.setAttribute('aria-expanded', 'false');
      });
      row.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-pills]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  /* The About page builds its body from the CMS after load. */
  window.addEventListener('scytales:page-ready', () => init());
  window.ScytalesPills = { init };
})();
