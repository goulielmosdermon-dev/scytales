/* ============================================================
   SCYTÁLES — SITE NAV (shared component)
   Loads partials/nav.html into [data-site-nav] once, then boots
   mega menus + latest-news hydration so every page shares one nav.
   ============================================================ */
(() => {
  const mount = document.querySelector('[data-site-nav]');
  if (!mount) return;

  const PARTIAL = 'partials/nav.html?v=16';

  const boot = () => {
    window.ScytalesNav?.initMega?.();
    window.ScytalesNav?.initLatestNews?.();
    window.dispatchEvent(new CustomEvent('scytales:nav-ready'));
  };

  fetch(PARTIAL)
    .then((r) => {
      if (!r.ok) throw new Error(`Nav partial failed: ${r.status}`);
      return r.text();
    })
    .then((html) => {
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const nav = tpl.content.firstElementChild;
      if (!nav) throw new Error('Nav partial is empty');
      mount.replaceWith(nav);
      boot();
    })
    .catch((err) => {
      console.error('[site-nav]', err);
      mount.removeAttribute('aria-busy');
      mount.innerHTML = `<p class="body-sm" style="padding:1rem">Navigation failed to load.</p>`;
    });
})();
