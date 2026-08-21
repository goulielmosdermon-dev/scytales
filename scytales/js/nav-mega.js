/* Nav mega menus — hover opens after a short intent delay, and the panel
   that opens is resolved from where the pointer actually is when the delay
   expires, not from the trigger that started the clock. A pointer sweeping
   the bar therefore opens what it lands on and nothing it merely crossed.
   The slide between panels and the close are unchanged. */
(() => {
  const api = (window.ScytalesNav = window.ScytalesNav || {});

  api.initMega = () => {
    const menus = [...document.querySelectorAll('[data-nav-mega]')];
    const mobileToggle = document.querySelector('.nav__toggle');
    const mobileMenu = document.getElementById('nav-menu');
    const nav = document.querySelector('.nav');
    if (!menus.length || !nav) return;

    if (nav.dataset.megaReady === '1') return;
    nav.dataset.megaReady = '1';

    const mqDesktop = window.matchMedia('(min-width: 768px)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const SLIDE_MS = 560;
    /* Long enough that a pointer crossing a trigger on its way somewhere
       else never opens it, short enough to feel like hover, not click. */
    const OPEN_DELAY_MS = 140;

    let active = -1;
    let closeTimer = 0;
    let slideTimer = 0;
    let openTimer = 0;
    /* Where the pointer was last seen, so a firing timer can ask "is this
       still the trigger being pointed at?" rather than assume it. */
    let pointerX = 0;
    let pointerY = 0;

    const panelOf = (root) => root.querySelector('[data-nav-mega-panel]');
    const triggerOf = (root) => root.querySelector('[data-nav-mega-trigger]');

    const clearLeaveClasses = (panel) => {
      panel.classList.remove(
        'is-from-left',
        'is-from-right',
        'is-to-left',
        'is-to-right'
      );
    };

    const setTrigger = (root, open) => {
      root.classList.toggle('is-open', open);
      triggerOf(root)?.setAttribute('aria-expanded', String(open));
    };

    const lockPanel = (panel, locked) => {
      if (locked) panel.setAttribute('inert', '');
      else panel.removeAttribute('inert');
    };

    const closeImmediate = () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(slideTimer);
      window.clearTimeout(openTimer);
      menus.forEach((root) => {
        const panel = panelOf(root);
        const surface = panel.querySelector('.nav-mega__panel');
        setTrigger(root, false);
        clearLeaveClasses(panel);
        if (surface) {
          surface.style.transition = '';
          surface.style.transform = '';
        }
        panel.hidden = true;
        lockPanel(panel, true);
      });
      active = -1;
      nav.classList.remove('nav--mega-open');
    };

    const close = () => {
      closeImmediate();
    };

    const closeSoon = () => {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(close, 160);
    };

    const cancelClose = () => {
      window.clearTimeout(closeTimer);
    };

    const cancelOpen = () => {
      window.clearTimeout(openTimer);
    };

    /* Which mega root, if any, sits under a point. Hit-testing beats the
       enter event's own index: by the time the delay expires the pointer has
       often moved on, and opening the trigger it left behind is exactly the
       skip this guards against. */
    const indexAtPoint = (x, y) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return -1;
      const root = el.closest?.('[data-nav-mega]');
      return root ? menus.indexOf(root) : -1;
    };

    /* Hover intent: the pointer has to settle before a panel is asked for,
       and what opens is whatever it settled on. */
    const openSoon = () => {
      cancelClose();
      cancelOpen();
      openTimer = window.setTimeout(() => {
        const index = indexAtPoint(pointerX, pointerY);
        /* Pointer has left the bar, or is already on the open panel's
           trigger — either way there is nothing to switch to. */
        if (index < 0 || index === active) return;
        openAt(index);
      }, OPEN_DELAY_MS);
    };

    const openAt = (index) => {
      cancelClose();
      cancelOpen();
      window.clearTimeout(slideTimer);

      if (index === active) return;

      const nextRoot = menus[index];
      const nextPanel = panelOf(nextRoot);
      const prev = active;

      nav.classList.add('nav--mega-open');

      if (prev < 0) {
        menus.forEach((root, i) => {
          if (i === index) return;
          const panel = panelOf(root);
          setTrigger(root, false);
          panel.hidden = true;
          clearLeaveClasses(panel);
          lockPanel(panel, true);
        });

        nextPanel.hidden = false;
        clearLeaveClasses(nextPanel);
        lockPanel(nextPanel, false);
        setTrigger(nextRoot, true);
        active = index;
        return;
      }

      const prevRoot = menus[prev];
      const prevPanel = panelOf(prevRoot);
      const dir = index > prev ? 1 : -1;

      menus.forEach((root, i) => {
        if (i === index || i === prev) return;
        const panel = panelOf(root);
        const surface = panel.querySelector('.nav-mega__panel');
        setTrigger(root, false);
        panel.hidden = true;
        clearLeaveClasses(panel);
        if (surface) {
          surface.style.transition = '';
          surface.style.transform = '';
        }
        lockPanel(panel, true);
      });

      setTrigger(prevRoot, false);
      setTrigger(nextRoot, true);

      if (reduceMotion.matches || !mqDesktop.matches) {
        prevPanel.hidden = true;
        clearLeaveClasses(prevPanel);
        lockPanel(prevPanel, true);
        nextPanel.hidden = false;
        clearLeaveClasses(nextPanel);
        lockPanel(nextPanel, false);
        active = index;
        return;
      }

      const prevSurface = prevPanel.querySelector('.nav-mega__panel');
      const nextSurface = nextPanel.querySelector('.nav-mega__panel');
      const ease = 'transform .55s cubic-bezier(.33, 0, .12, 1)';
      const from = dir > 0 ? 'translate3d(100%, 0, 0)' : 'translate3d(-100%, 0, 0)';
      const away = dir > 0 ? 'translate3d(-100%, 0, 0)' : 'translate3d(100%, 0, 0)';

      clearLeaveClasses(prevPanel);
      clearLeaveClasses(nextPanel);

      nextPanel.hidden = false;
      lockPanel(nextPanel, false);
      lockPanel(prevPanel, true);

      prevSurface.style.transition = 'none';
      nextSurface.style.transition = 'none';
      prevSurface.style.transform = 'translate3d(0, 0, 0)';
      nextSurface.style.transform = from;
      void nextSurface.offsetWidth;

      requestAnimationFrame(() => {
        prevSurface.style.transition = ease;
        nextSurface.style.transition = ease;
        prevSurface.style.transform = away;
        nextSurface.style.transform = 'translate3d(0, 0, 0)';
      });

      active = index;

      slideTimer = window.setTimeout(() => {
        if (active !== index) return;
        prevPanel.hidden = true;
        prevSurface.style.transition = '';
        prevSurface.style.transform = '';
        nextSurface.style.transition = '';
        nextSurface.style.transform = '';
        clearLeaveClasses(prevPanel);
      }, SLIDE_MS);
    };

    menus.forEach((root, index) => {
      const trigger = triggerOf(root);
      const panel = panelOf(root);
      if (!trigger || !panel) return;

      lockPanel(panel, true);

      /* A click is a decision, not a sweep — it opens without the wait. */
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        if (active === index) closeImmediate();
        else openAt(index);
      });

      root.addEventListener('pointerenter', (event) => {
        if (!mqDesktop.matches) return;
        /* Seed the coordinates from the enter itself — a pointer can arrive
           on a trigger before any pointermove lands on the bar. */
        pointerX = event.clientX;
        pointerY = event.clientY;
        openSoon();
      });

      root.addEventListener('pointerleave', () => {
        if (mqDesktop.matches) {
          cancelOpen();
          closeSoon();
        }
      });

      panel.addEventListener('pointerenter', () => {
        if (mqDesktop.matches) {
          cancelClose();
          openAt(index);
        }
      });

      panel.addEventListener('pointerleave', () => {
        if (mqDesktop.matches) {
          cancelOpen();
          closeSoon();
        }
      });

      panel.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        closeImmediate();
        if (mobileMenu?.classList.contains('is-open')) {
          mobileMenu.classList.remove('is-open');
          mobileToggle?.setAttribute('aria-expanded', 'false');
        }
      });
    });

    /* One listener for the bar, not one per item: the coordinates are what
       the open timer reads, and they have to stay fresh while the pointer is
       between triggers as much as on them. */
    nav.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || active < 0) return;
      const trigger = triggerOf(menus[active]);
      closeImmediate();
      trigger?.focus();
    });

    document.addEventListener('pointerdown', (event) => {
      if (active < 0) return;
      const root = menus[active];
      const panel = panelOf(root);
      if (root.contains(event.target) || panel.contains(event.target)) return;
      if (event.target.closest?.('[data-nav-mega]')) return;
      closeImmediate();
    });

    mqDesktop.addEventListener('change', closeImmediate);

    mobileToggle?.addEventListener('click', () => {
      if (!mobileMenu) return;
      const open = mobileMenu.classList.toggle('is-open');
      mobileToggle.classList.toggle('is-active', open);
      mobileToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (!open) closeImmediate();
    });
  };
})();
