/* ============================================================
   SCYTÁLES — PAGE TRANSITION
   Full-screen white cover on leave; reveal on enter.
   ============================================================ */
(() => {
  'use strict';

  const DURATION = 520;
  const FLAG = 'scytales-page-transition';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const ensureOverlay = () => {
    let el = document.querySelector('[data-page-transition]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'page-transition';
    el.setAttribute('data-page-transition', '');
    el.setAttribute('aria-hidden', 'true');
    document.body.prepend(el);
    return el;
  };

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const cover = async (overlay) => {
    overlay.classList.add('is-covering');
    overlay.classList.remove('is-revealed');
    if (reduceMotion.matches) return;
    await wait(DURATION);
  };

  const reveal = async (overlay) => {
    // Force paint in covered state before revealing
    void overlay.offsetWidth;
    requestAnimationFrame(() => {
      overlay.classList.add('is-revealed');
      overlay.classList.remove('is-covering');
    });
  };

  const sameDocument = (url) => {
    try {
      const next = new URL(url, location.href);
      return (
        next.origin === location.origin &&
        next.pathname === location.pathname &&
        next.search === location.search
      );
    } catch (_) {
      return true;
    }
  };

  const shouldTransition = (a) => {
    if (!a) return false;
    if (a.hasAttribute('download')) return false;
    if (a.target && a.target !== '_self') return false;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return false;
    }
    let url;
    try {
      url = new URL(href, location.href);
    } catch (_) {
      return false;
    }
    if (url.origin !== location.origin) return false;
    // Hash-only / same-page anchors stay instant
    if (sameDocument(url.href) && url.hash) return false;
    if (sameDocument(url.href) && !url.hash) return false;
    return true;
  };

  const go = async (href) => {
    const overlay = ensureOverlay();
    document.documentElement.classList.add('is-page-leaving');
    sessionStorage.setItem(FLAG, '1');
    await cover(overlay);
    location.href = href;
  };

  const boot = () => {
    const overlay = ensureOverlay();
    const fromTransition = sessionStorage.getItem(FLAG) === '1';
    sessionStorage.removeItem(FLAG);

    if (fromTransition || !reduceMotion.matches) {
      overlay.classList.add('is-covering');
      overlay.classList.remove('is-revealed');
      // Reveal after first paint so the white screen is visible briefly
      requestAnimationFrame(() => {
        requestAnimationFrame(() => reveal(overlay));
      });
    } else {
      overlay.classList.add('is-revealed');
      overlay.classList.remove('is-covering');
    }

    document.documentElement.classList.add('is-page-ready');
    document.documentElement.classList.remove('is-page-leaving');
  };

  document.addEventListener(
    'click',
    (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target.closest('a[href]');
      if (!shouldTransition(a)) return;
      event.preventDefault();
      go(a.href);
    },
    true
  );

  window.addEventListener('pageshow', (event) => {
    // Back/forward cache: ensure we never stay stuck on white
    if (event.persisted) {
      const overlay = ensureOverlay();
      overlay.classList.add('is-revealed');
      overlay.classList.remove('is-covering');
      document.documentElement.classList.remove('is-page-leaving');
      sessionStorage.removeItem(FLAG);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
