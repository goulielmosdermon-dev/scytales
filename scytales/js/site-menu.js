/* Slide-in menu.

   The bar carries one control: a square that turns into an X. Clicking it
   slides the panel in from the right. Four labels on the left; hovering one
   trickles that section's links down in a fixed right column — the labels
   never reflow. Choosing a link closes the menu and lets js/page-transition.js
   carry the page out.

   Hover is the desktop affordance and click is the universal one, so both
   open a row — a touch device has no hover and would otherwise be stuck.

   The nav partial is fetched at runtime, so this binds on the
   scytales:nav-ready event as well as at load. */
(() => {
  const ROW_SELECTOR = '[data-menu-row]';

  const wire = (scope = document) => {
    const nav = scope.querySelector('[data-nav]');
    if (!nav || nav.dataset.menuWired === '1') return;

    const menu = nav.querySelector('[data-menu]');
    const toggle = nav.querySelector('[data-menu-toggle]');
    if (!menu || !toggle) return;
    nav.dataset.menuWired = '1';

    const body = menu.querySelector('[data-menu-body]');
    const rows = [...menu.querySelectorAll(ROW_SELECTOR)];
    const drawers = [...menu.querySelectorAll('[data-menu-drawer]')];
    const canHover = window.matchMedia('(hover: hover)').matches;

    const drawerFor = (row) => {
      const id = row?.querySelector('[data-menu-trigger]')?.getAttribute('aria-controls');
      return id ? menu.querySelector(`#${CSS.escape(id)}`) : null;
    };

    const positionDrawer = (row, drawer) => {
      if (!row || !drawer) return;
      drawer.style.top = `${row.offsetTop}px`;
    };

    const replayTrickle = (drawer) => {
      drawer.querySelectorAll('.menu__list li').forEach((item) => {
        item.style.animation = 'none';
        item.offsetHeight;
        item.style.animation = '';
      });
    };

    const openRow = (row) => {
      rows.forEach((other) => {
        const on = other === row;
        other.classList.toggle('is-open', on);
        other.querySelector('[data-menu-trigger]')
          ?.setAttribute('aria-expanded', on ? 'true' : 'false');
      });

      drawers.forEach((drawer) => {
        const active = row && drawer === drawerFor(row);
        drawer.classList.toggle('is-open', !!active);
        drawer.hidden = !active;
        if (active) {
          positionDrawer(row, drawer);
          replayTrickle(drawer);
        }
      });
    };

    const closeRows = () => openRow(null);

    /* ---- Open / close the panel -------------------------------------- */
    let lastFocus = null;

    const setOpen = (open) => {
      if (open) {
        lastFocus = document.activeElement;
        menu.hidden = false;
        /* One frame between unhiding and animating, or the panel appears
           in place instead of sliding. */
        requestAnimationFrame(() => nav.classList.add('is-menu-open'));
      } else {
        nav.classList.remove('is-menu-open');
        closeRows();
        /* Kept in the tree until the slide-out has finished. */
        setTimeout(() => {
          if (!nav.classList.contains('is-menu-open')) menu.hidden = true;
        }, 520);
      }
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('is-menu-open', open);
      if (!open && lastFocus?.isConnected) lastFocus.focus();
    };

    toggle.addEventListener('click', () => {
      setOpen(!nav.classList.contains('is-menu-open'));
    });

    menu.querySelector('[data-menu-close]')?.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!nav.classList.contains('is-menu-open')) return;
      setOpen(false);
    });

    /* ---- Rows -------------------------------------------------------- */
    rows.forEach((row) => {
      const trigger = row.querySelector('[data-menu-trigger]');

      if (canHover) {
        row.addEventListener('pointerenter', () => openRow(row));
      }

      trigger?.addEventListener('click', () => {
        openRow(row.classList.contains('is-open') ? null : row);
      });

      /* Keyboard: the open row follows focus, so tabbing through reveals
         each section in turn. */
      trigger?.addEventListener('focus', () => openRow(row));
    });

    if (canHover) {
      body?.addEventListener('pointerleave', closeRows);
    }

    window.addEventListener('resize', () => {
      const open = rows.find((row) => row.classList.contains('is-open'));
      if (!open) return;
      positionDrawer(open, drawerFor(open));
    });

    /* A chosen link closes the menu; the page transition does the rest. */
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) setOpen(false);
    });
  };

  wire();
  window.addEventListener('scytales:nav-ready', () => wire());
})();
