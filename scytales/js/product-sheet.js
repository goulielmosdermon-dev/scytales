/* Product sheet — CMS collection renderer (JSON + shared template) */
(() => {
  const LEGACY_HASH = '#digital-id-wallet';
  const root = document.querySelector('[data-product-sheet]');
  if (!root) return;

  const backdrop = root.querySelector('[data-product-sheet-backdrop]');
  const dialog = root.querySelector('[data-product-sheet-dialog]');
  const body = root.querySelector('[data-product-sheet-body]');
  const closeBtn = root.querySelector('[data-product-sheet-close]');
  if (!backdrop || !dialog || !body || !closeBtn) return;

  /* Prefer a list that is actually on the page — the original section can be
     hidden in favour of the alt take. */
  const productList =
    [...document.querySelectorAll('[data-product-list]')].find((el) => el.offsetParent !== null) ||
    document.querySelector('[data-product-list]');
  const render = () => window.ScytalesProductRender;
  let lastFocus = null;
  let open = false;
  let currentSlug = null;
  let loading = null;

  const slugFromHash = () => {
    const hash = window.location.hash || '';
    if (hash === LEGACY_HASH) return 'digital-id-wallet';
    const m = hash.match(/^#product\/([a-z0-9-]+)$/i);
    return m ? m[1] : null;
  };

  const hashForSlug = (slug) => `#product/${slug}`;

  const focusables = () =>
    [...dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

  const lockScroll = (on) => {
    document.documentElement.classList.toggle('product-sheet-open', on);
    document.body.classList.toggle('product-sheet-open', on);
  };

  const setHash = (slug) => {
    const { pathname, search } = window.location;
    const next = hashForSlug(slug);
    if (window.location.hash !== next) {
      history.pushState({ productSheet: true, slug }, '', `${pathname}${search}${next}`);
    }
  };

  const clearHash = () => {
    const { pathname, search } = window.location;
    if (slugFromHash()) {
      history.replaceState(null, '', `${pathname}${search}`);
    }
  };

  const markListActive = (slug) => {
    if (!productList) return;
    productList.querySelectorAll('.list-item.is-active').forEach((el) => {
      el.classList.remove('is-active');
    });
    const item = productList.querySelector(`[data-product="${slug}"]`);
    if (item) item.classList.add('is-active');
  };

  const renderIntoSheet = async (slug) => {
    /* Same wrapper class as the full product page, so the popup inherits
       that page's layout wholesale instead of keeping a second, drifting
       set of sheet-only rules. */
    const wrap = await render().renderInto(body, slug, {
      wrapClass: 'product-page__content',
      hrefForSlug: (s) => hashForSlug(s),
    });
    const title = wrap.querySelector('#product-sheet-title, .wallet-hero__title');
    if (title) dialog.setAttribute('aria-labelledby', title.id);
    dialog.setAttribute('aria-label', wrap.dataset.productSlug || 'Product');
    markListActive(slug);
    currentSlug = slug;
  };

  const openSheet = async (slug, { updateHash = true } = {}) => {
    if (!slug) return;
    lastFocus = document.activeElement;

    if (window.ScytalesInnovationSheet?.isOpen?.()) {
      window.ScytalesInnovationSheet.close({ updateHash: false });
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
        body.innerHTML = `<p class="product-sheet__loading">Couldn’t load product details.</p>`;
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
      window.ScytalesProductRender?.restoreHomeStage?.();
      if (updateHash) clearHash();
      const restore =
        lastFocus && document.contains(lastFocus)
          ? lastFocus
          : productList?.querySelector('.list-item.is-active');
      restore?.focus?.({ preventScroll: true });
    };

    const onEnd = (e) => {
      if (e.target !== dialog) return;
      dialog.removeEventListener('transitionend', onEnd);
      finish();
    };
    dialog.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, 400);
  };

  window.ScytalesProductSheet = {
    open: (slug = 'digital-id-wallet') => openSheet(slug, { updateHash: true }),
    close: (opts) => closeSheet(opts || { updateHash: true }),
    isOpen: () => open,
    currentSlug: () => currentSlug,
  };

  closeBtn.addEventListener('click', () => closeSheet());
  backdrop.addEventListener('click', () => closeSheet());

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSheet();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  const syncFromHash = () => {
    const slug = slugFromHash();
    if (slug) openSheet(slug, { updateHash: false });
    else if (open) closeSheet({ updateHash: false });
  };

  window.addEventListener('popstate', syncFromHash);
  window.addEventListener('hashchange', syncFromHash);

  if (slugFromHash()) syncFromHash();
})();
