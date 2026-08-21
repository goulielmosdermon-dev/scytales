/* Innovation sheet — CMS collection renderer for Innovating EUDI Wallet & Age Verification */
(() => {
  const CONTENT_BASE = 'content/innovation';
  const TEMPLATE_URL = 'templates/innovation.html';

  const root = document.querySelector('[data-innovation-sheet]');
  if (!root) return;

  const backdrop = root.querySelector('[data-innovation-sheet-backdrop]');
  const dialog = root.querySelector('[data-innovation-sheet-dialog]');
  const body = root.querySelector('[data-innovation-sheet-body]');
  const closeBtn = root.querySelector('[data-innovation-sheet-close]');
  if (!backdrop || !dialog || !body || !closeBtn) return;

  const cache = new Map();
  let templateHtml = null;
  let lastFocus = null;
  let open = false;
  let currentSlug = null;
  let loading = null;

  const escapeHtml = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const getPath = (obj, path) =>
    path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

  const slugFromHash = () => {
    const hash = window.location.hash || '';
    const m = hash.match(/^#innovation\/([a-z0-9-]+)$/i);
    return m ? m[1] : null;
  };

  const hashForSlug = (slug) => `#innovation/${slug}`;

  const lockScroll = (on) => {
    document.documentElement.classList.toggle('product-sheet-open', on);
    document.body.classList.toggle('product-sheet-open', on);
  };

  const setHash = (slug) => {
    const { pathname, search } = window.location;
    const next = hashForSlug(slug);
    if (window.location.hash !== next) {
      history.pushState({ innovationSheet: true, slug }, '', `${pathname}${search}${next}`);
    }
  };

  const clearHash = () => {
    const { pathname, search } = window.location;
    if (slugFromHash()) {
      history.replaceState(null, '', `${pathname}${search}`);
    }
  };

  const fetchText = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.text();
  };

  const fetchJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  };

  const ensureAssets = async () => {
    if (!templateHtml) templateHtml = await fetchText(TEMPLATE_URL);
  };

  const renderSections = (sections) =>
    (sections || [])
      .map((section) => {
        const heading = escapeHtml(section.heading || '');
        if (section.type === 'points') {
          const points = (section.points || [])
            .map(
              (p) => `<li>
              <h3 class="eudi__point-title">${escapeHtml(p.title || '')}</h3>
              <p>${escapeHtml(p.body || '')}</p>
            </li>`
            )
            .join('');
          return `<section class="eudi__block">
            <h2 class="eudi__heading">${heading}</h2>
            <ul class="eudi__points">${points}</ul>
          </section>`;
        }
        if (section.type === 'cta') {
          const label = escapeHtml(section.cta?.label || '');
          const href = escapeHtml(section.cta?.href || '#contact');
          return `<section class="eudi__block eudi__block--last">
            <h2 class="eudi__heading">${heading}</h2>
            <p class="eudi__lead">${escapeHtml(section.lead || '')}</p>
            <a class="btn btn-primary eudi__btn" href="${href}">${label}</a>
          </section>`;
        }
        const paragraphs = (section.paragraphs || [])
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('');
        return `<section class="eudi__block">
          <h2 class="eudi__heading">${heading}</h2>
          <div class="eudi__prose">${paragraphs}</div>
        </section>`;
      })
      .join('');

  const renderTopic = (topic) => {
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const frag = document.createDocumentFragment();
    [...doc.body.children].forEach((node) => frag.appendChild(node));

    const wrap = document.createElement('div');
    wrap.className = 'product-sheet__content';
    wrap.dataset.innovationSlug = topic.slug;
    wrap.appendChild(frag);

    wrap.querySelectorAll('[data-bind]').forEach((el) => {
      const val = getPath(topic, el.getAttribute('data-bind'));
      if (val == null) return;
      el.textContent = val;
    });

    wrap.querySelectorAll('[data-bind-href]').forEach((el) => {
      const val = getPath(topic, el.getAttribute('data-bind-href'));
      if (val != null) el.setAttribute('href', val);
    });

    const sectionsHost = wrap.querySelector('[data-bind-sections]');
    if (sectionsHost) sectionsHost.outerHTML = renderSections(topic.sections);

    const title = wrap.querySelector('#innovation-sheet-title');
    if (title) dialog.setAttribute('aria-labelledby', title.id);
    dialog.setAttribute('aria-label', topic.name || 'Innovation');

    return wrap;
  };

  const loadTopic = async (slug) => {
    if (cache.has(slug)) return cache.get(slug);
    const topic = await fetchJson(`${CONTENT_BASE}/${slug}.json`);
    cache.set(slug, topic);
    return topic;
  };

  const renderIntoSheet = async (slug) => {
    body.innerHTML = '<p class="product-sheet__loading">Loading…</p>';
    await ensureAssets();
    const topic = await loadTopic(slug);
    const wrap = renderTopic(topic);
    body.innerHTML = '';
    body.appendChild(wrap);
    currentSlug = slug;
  };

  const openSheet = async (slug, { updateHash = true } = {}) => {
    if (!slug) return;
    lastFocus = document.activeElement;

    if (window.ScytalesProductSheet?.isOpen?.()) {
      window.ScytalesProductSheet.close({ updateHash: false });
    }

    if (!open) {
      open = true;
      root.hidden = false;
      root.removeAttribute('inert');
      lockScroll(true);
      root.scrollTop = 0;
      requestAnimationFrame(() => root.classList.add('is-open'));
    } else {
      root.scrollTop = 0;
    }

    if (updateHash) setHash(slug);

    if (loading) await loading;
    loading = renderIntoSheet(slug)
      .catch((err) => {
        console.error(err);
        body.innerHTML = `<p class="product-sheet__loading">Couldn’t load details.</p>`;
      })
      .finally(() => {
        loading = null;
      });
    await loading;
    closeBtn.focus({ preventScroll: true });
  };

  const closeSheet = ({ updateHash = true } = {}) => {
    if (!open) return;
    open = false;
    currentSlug = null;
    root.classList.remove('is-open');
    lockScroll(false);

    const finish = () => {
      if (open) return;
      root.hidden = true;
      root.setAttribute('inert', '');
      if (updateHash) clearHash();
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      }
    };

    root.addEventListener('transitionend', finish, { once: true });
    window.setTimeout(finish, 360);
  };

  const onOpenClick = (event) => {
    const trigger = event.target.closest('[data-innovation-open]');
    if (!trigger) return;
    event.preventDefault();
    const slug = trigger.getAttribute('data-innovation-open');
    openSheet(slug);
  };

  const onInSheetNav = (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !body.contains(link)) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    closeSheet({ updateHash: true });
    window.setTimeout(() => {
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  document.addEventListener('click', onOpenClick);
  body.addEventListener('click', onInSheetNav);
  backdrop.addEventListener('click', () => closeSheet());
  closeBtn.addEventListener('click', () => closeSheet());

  document.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSheet();
    }
  });

  window.addEventListener('popstate', () => {
    const slug = slugFromHash();
    if (slug) openSheet(slug, { updateHash: false });
    else if (open) closeSheet({ updateHash: false });
  });

  const bootSlug = slugFromHash();
  if (bootSlug) openSheet(bootSlug, { updateHash: false });

  window.ScytalesInnovationSheet = {
    open: openSheet,
    close: closeSheet,
    isOpen: () => open,
    currentSlug: () => currentSlug,
  };
})();
