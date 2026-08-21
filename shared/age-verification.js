/* Age Verification Connector — mount shared window markup into [data-avc] hosts.
   Markup: ./age-verification.html
   Styles: ./age-verification.css
   Options:
     data-avc-decorative — aria-hidden on root; inert interactive controls
*/
(() => {
  const SRC = new URL('./age-verification.html', document.currentScript.src).href;
  let cached = null;

  async function loadMarkup() {
    if (cached) return cached;
    const res = await fetch(SRC, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cached = await res.text();
    return cached;
  }

  function mount(host, html) {
    const decorative = host.hasAttribute('data-avc-decorative');
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const root = wrap.firstElementChild;
    if (!root) return;

    if (decorative) {
      root.setAttribute('aria-hidden', 'true');
      root.removeAttribute('role');
      root.removeAttribute('aria-label');
      root.querySelectorAll('button, a, input, select, textarea').forEach((el) => {
        el.setAttribute('tabindex', '-1');
      });
    }

    host.replaceWith(root);
  }

  async function init(scope = document) {
    const hosts = [...scope.querySelectorAll('[data-avc]')];
    if (!hosts.length) return;
    try {
      const html = await loadMarkup();
      hosts.forEach((host) => mount(host, html));
    } catch (err) {
      console.warn('[age-verification]', err);
      hosts.forEach((host) => {
        host.innerHTML = '<p class="body-sm" style="color:var(--neutral-500)">Could not load Age Verification window.</p>';
      });
    }
  }

  window.ScytalesAgeVerification = { init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }
})();
