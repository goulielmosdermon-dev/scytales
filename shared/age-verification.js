/* Age Verification Connector — mount shared window markup into [data-avc] hosts.
   Markup: ./age-verification.html
   Styles: ./age-verification.css
   Options:
     data-avc-decorative — aria-hidden on root; inert interactive controls
   Live feed: new verification rows + toast notifications every 2s.
*/
(() => {
  const SRC = new URL('./age-verification.html?v=live3', document.currentScript.src).href;
  let cached = null;

  const EVENTS = [
    { client: 'Nordic Retail AB', event: 'Age gate · 18+', result: 'ok', toast: 'Person verified · 18+' },
    { client: 'City Transit', event: 'Identity check', result: 'ok', toast: 'Identity confirmed' },
    { client: 'Harbor Bank', event: 'mDL presentment', result: 'ok', toast: 'mDL accepted' },
    { client: 'EUDI Pilot', event: 'Age gate · 16+', result: 'ok', toast: 'Person verified · 16+' },
    { client: 'QuickMart SE', event: 'Age gate · 18+', result: 'ok', toast: 'Age check passed' },
    { client: 'Airport Gate B2', event: 'Travel credential', result: 'ok', toast: 'Credential verified' },
    { client: 'Club Neon', event: 'Age gate · 21+', result: 'warn', toast: 'Manual review needed' },
    { client: 'Pharma Nordic', event: 'Age gate · 18+', result: 'ok', toast: 'Person verified · 18+' },
    { client: 'Metro Access', event: 'Identity check', result: 'ok', toast: 'Holder authenticated' },
    { client: 'TicketGo', event: 'Age gate · 18+', result: 'ok', toast: 'Verification complete' },
  ];

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  async function loadMarkup() {
    if (cached) return cached;
    const res = await fetch(SRC, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cached = await res.text();
    return cached;
  }

  const fmt = (n) => n.toLocaleString('en-US');

  const pill = (result) =>
    result === 'warn'
      ? '<span class="avc__pill avc__pill--warn">Review</span>'
      : '<span class="avc__pill avc__pill--ok">Passed</span>';

  function startLive(root) {
    const feed = root.querySelector('[data-avc-feed]');
    const toasts = root.querySelector('[data-avc-toasts]');
    const totalEl = root.querySelector('[data-avc-total]');
    if (!feed || !toasts) return;

    let total = Number(String(totalEl?.textContent || '12480').replace(/,/g, '')) || 12480;
    let i = 0;
    let timer = 0;

    const pushToast = (text, result) => {
      const el = document.createElement('div');
      el.className = `avc__toast${result === 'warn' ? ' avc__toast--warn' : ''}`;
      el.innerHTML = `<span class="avc__toast-dot" aria-hidden="true"></span><span>${text}</span>`;
      toasts.prepend(el);
      requestAnimationFrame(() => el.classList.add('is-in'));
      while (toasts.children.length > 3) toasts.lastElementChild?.remove();
      window.setTimeout(() => {
        el.classList.remove('is-in');
        el.classList.add('is-out');
        window.setTimeout(() => el.remove(), 420);
      }, 1600);
    };

    const tick = () => {
      const item = EVENTS[i % EVENTS.length];
      i += 1;
      total += 1;
      if (totalEl) totalEl.textContent = fmt(total);

      const row = document.createElement('tr');
      row.className = 'avc__row--fresh';
      row.innerHTML =
        `<td>${item.client}</td>` +
        `<td>${item.event}</td>` +
        `<td>${pill(item.result)}</td>` +
        `<td>Just now</td>`;
      feed.prepend(row);
      requestAnimationFrame(() => row.classList.add('is-in'));

      [...feed.querySelectorAll('tr')].forEach((tr, idx) => {
        if (idx === 0) return;
        const time = tr.querySelector('td:last-child');
        if (!time) return;
        if (idx === 1) time.textContent = '2s ago';
        else if (idx === 2) time.textContent = '4s ago';
        else if (idx === 3) time.textContent = '6s ago';
      });

      while (feed.children.length > 4) feed.lastElementChild?.remove();
      pushToast(item.toast, item.result);
    };

    const nextDelay = () => (2 + Math.floor(Math.random() * 3)) * 1000; /* 2s, 3s, or 4s */

    const schedule = () => {
      timer = window.setTimeout(() => {
        tick();
        schedule();
      }, nextDelay());
    };

    if (prefersReduced) return;

    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                if (!timer) schedule();
              } else if (timer) {
                window.clearTimeout(timer);
                timer = 0;
              }
            });
          },
          { threshold: 0.2 }
        )
      : null;

    if (io) io.observe(root);
    else schedule();

    /* First event arrives quickly so the demo feels alive. */
    window.setTimeout(tick, 700);
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
    startLive(root);
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
