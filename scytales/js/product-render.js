/* Shared product CMS renderer — used by sheet + full product pages */
(() => {
  const CONTENT_BASE = 'content/products';
  const INDEX_URL = 'content/products/index.json';
  const TEMPLATE_URL = 'templates/product.html';
  const PHONE_PARTIAL = 'templates/partials/phone-digital-id-wallet.html';
  const AGE_SCENE_PARTIAL = 'templates/partials/age-verification-scene.html';
  const STAGE_PARTIAL = 'templates/partials/products-stage.html';

  /* Same photos as the home page "Browse our product line" stage. */
  const DISCOVER_IMAGES = {
    'digital-id-wallet': 'assets/products/digital-id-wallet.jpg',
    'age-verification': 'assets/products/age-verification.jpg',
    'iso-mvalidator': 'assets/products/iso-mvalidator.jpg',
    'derived-mid': 'assets/products/derived-mid.jpg',
    'mobile-validator': 'assets/products/mobile-validator.jpg',
    'service-manager': 'assets/products/service-manager.jpg',
    'authenticated-readers': 'assets/products/authenticated-readers.jpg',
    'credential-service': 'assets/products/credential-service.jpg',
  };

  const DISCOVER_PASSPORT_SLUGS = new Set([]);

  const DISCOVER_IMAGE_PENDING = new Set([]);

  const cache = new Map();
  let templateHtml = null;
  let phonePartial = null;
  let ageScenePartial = null;
  let productIndex = null;
  let stageEl = null;
  let stagePromise = null;

  const escapeHtml = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const getPath = (obj, path) =>
    path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

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
    if (!phonePartial) phonePartial = await fetchText(PHONE_PARTIAL);
    if (!ageScenePartial) ageScenePartial = await fetchText(AGE_SCENE_PARTIAL);
  };

  const ensureIndex = async () => {
    if (!productIndex) {
      const data = await fetchJson(INDEX_URL);
      productIndex = data.products || [];
    }
    return productIndex;
  };

  // Product showcases clone their interactive mockup from this dedicated,
  // always-hidden copy of the stage partial — never from the live
  // "Browse our product line" stage on the home page, which now shows real
  // photos instead of the mockups and must not be used as a clone source.
  const ensureStage = () => {
    if (!stagePromise) {
      stagePromise = (async () => {
        const el = document.createElement('div');
        el.className = 'products__stage products__stage--source';
        el.setAttribute('data-products-stage-source', '');
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = await fetchText(STAGE_PARTIAL);
        document.body.appendChild(el);
        stageEl = el;
        return el;
      })();
    }
    return stagePromise;
  };

  const restoreHomeStage = () => {
    const stage = document.querySelector('.products [data-products-stage]');
    if (!stage) return;
    stage.hidden = false;
    stage.removeAttribute('aria-hidden');
  };

  const uniquifySymbols = (wrap) => {
    wrap.querySelectorAll('svg symbol[id]').forEach((sym) => {
      const id = sym.getAttribute('id');
      if (!id) return;
      const existing = document.getElementById(id);
      if (!existing || existing === sym) return;
      const next = `sheet-${id}`;
      sym.setAttribute('id', next);
      wrap.querySelectorAll(`use[href="#${id}"]`).forEach((use) => {
        use.setAttribute('href', `#${next}`);
      });
    });
  };

  const fillPhoneSlot = (slot, product) => {
    const mode = product.showcase?.phone || 'none';
    slot.innerHTML = '';
    slot.classList.remove('is-empty', 'wallet-showcase__phone--age');

    if (mode === 'interactive-wallet') {
      slot.innerHTML = phonePartial;
      uniquifySymbols(slot);
      return;
    }

    if (mode === 'age-scene') {
      slot.classList.add('wallet-showcase__phone--age');
      slot.innerHTML = ageScenePartial;
      return;
    }

    if (mode === 'image' && product.showcase?.phoneImage) {
      const img = document.createElement('img');
      img.className = 'wallet-showcase__phone-image';
      img.src = product.showcase.phoneImage;
      img.alt = product.name || '';
      slot.appendChild(img);
      return;
    }

    if (mode && mode !== 'none') {
      const source = stageEl?.querySelector(`[data-phone="${mode}"]`);
      if (source) {
        const clone = source.cloneNode(true);
        clone.hidden = false;
        clone.removeAttribute('hidden');
        clone.querySelectorAll('[data-mvalid-tabs], [data-mvalid-nfc-timer], .passport').forEach((el) => {
          delete el.dataset.mvalidReady;
          delete el.dataset.mrzReady;
        });
        slot.appendChild(clone);
        return;
      }
    }

    slot.classList.add('is-empty');
  };

  const pickDiscoverEntries = (currentSlug, count = 3) => {
    if (!productIndex?.length) return [];
    const idx = Math.max(0, productIndex.findIndex((p) => p.slug === currentSlug));
    const picks = [];
    for (let i = 1; i <= productIndex.length && picks.length < count; i++) {
      const entry = productIndex[(idx + i) % productIndex.length];
      if (!entry || entry.slug === currentSlug || entry.hasPage === false) continue;
      picks.push(entry);
    }
    return picks;
  };

  const loadProduct = async (slug) => {
    if (cache.has(slug)) return cache.get(slug);
    const product = await fetchJson(`${CONTENT_BASE}/${slug}.json`);
    cache.set(slug, product);
    return product;
  };

  const renderProduct = (product, { wrapClass = 'product-sheet__content' } = {}) => {
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const frag = document.createDocumentFragment();
    [...doc.body.children].forEach((node) => frag.appendChild(node));

    const wrap = document.createElement('div');
    wrap.className = wrapClass;
    wrap.dataset.productSlug = product.slug;
    wrap.appendChild(frag);

    wrap.querySelectorAll('[data-bind]').forEach((el) => {
      const val = getPath(product, el.getAttribute('data-bind'));
      if (val == null) return;
      el.textContent = val;
    });

    wrap.querySelectorAll('[data-bind-href]').forEach((el) => {
      const val = getPath(product, el.getAttribute('data-bind-href'));
      if (val != null) el.setAttribute('href', val);
    });

    wrap.querySelectorAll('[data-bind-aria-label]').forEach((el) => {
      const val = getPath(product, el.getAttribute('data-bind-aria-label'));
      if (val != null) el.setAttribute('aria-label', val);
    });

    const bullets = wrap.querySelector('[data-bind-list="hero.bullets"]');
    if (bullets) {
      bullets.innerHTML = (product.hero?.bullets || [])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');
    }

    /* Same copy as the bullets above, rendered as the signature orange grid.
       Was hard-coded markup, so every product showed the wallet's four. */
    const pillars = wrap.querySelector('[data-bind-pillars]');
    const pillarItems = product.hero?.bullets || [];
    if (pillars && pillarItems.length) {
      pillars.innerHTML = pillarItems
        .map(
          (item) =>
            `<div class="wallet-pillars__cell"><p class="wallet-pillars__text">${escapeHtml(item)}</p></div>`
        )
        .join('');
    }

    /* Benefits rail — one orange block per benefit, numbered. Falls back to
       `features` for products that have not been rewritten yet, so the two
       sections can be migrated one product at a time. */
    const benefits = wrap.querySelector('[data-benefits-rail]');
    if (benefits) {
      const items = (product.benefits || product.features || []).map((b) =>
        typeof b === 'string' ? { body: b } : b
      );
      benefits.insertAdjacentHTML(
        'beforeend',
        items
          .map((b, i) => {
            const tags = (b.tags || [])
              .map((t) => `<li class="benefits-rail__tag">${escapeHtml(t)}</li>`)
              .join('');
            return `<article class="benefits-rail__block">
              ${b.title ? `<p class="benefits-rail__heading">${escapeHtml(b.title)}</p>` : ''}
              <p class="benefits-rail__body">${escapeHtml(b.body || '')}</p>
              ${tags ? `<ul class="benefits-rail__tags">${tags}</ul>` : ''}
              <span class="benefits-rail__mark" aria-hidden="true">${i + 1}</span>
            </article>`;
          })
          .join('')
      );
    }

    /* Flow diagram — product-scoped, so it appears only where the JSON
       declares it. Icons are inline so they take currentColor and need no
       extra request. */
    const FLOW_ICONS = {
      devices:
        '<rect x="2" y="4" width="18" height="12" rx="1.5"/><path d="M1 19h16"/>' +
        '<rect x="17" y="9" width="6" height="11" rx="1.5"/>',
      shield:
        '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"/>' +
        '<circle cx="12" cy="9" r="1.6"/><path d="M12 10.6 8.6 14.4M12 10.6l3.4 3.8M8.6 14.4h6.8"/>',
      phone:
        '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10.5 5.2h3"/>' +
        '<circle cx="12" cy="18.6" r="1"/>',
      check:
        '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 9h4M7 13h4M7 17h2"/>' +
        '<path d="M14 13.5 16 15.5 20 11"/>',
      lock:
        '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"/>' +
        '<circle cx="12" cy="10.5" r="1.8"/><path d="M12 12.3v3"/>',
      privacy:
        '<rect x="4" y="10" width="16" height="11" rx="2"/>' +
        '<path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M10.5 15.5h3"/>',
    };
    /* The card icons sit on a solid orange field, where a stroke reads
       heavier than the same weight does on cream — so they take a lighter
       one. The class carries it, not the attribute, so it stays adjustable
       from CSS. */
    const flowIcon = (name, cls = '') =>
      `<svg class="product-flow__icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" ` +
      `fill="none" stroke="currentColor" stroke-linecap="round" ` +
      `stroke-linejoin="round" aria-hidden="true">` +
      `${FLOW_ICONS[name] || FLOW_ICONS.shield}</svg>`;

    const flowEl = wrap.querySelector('[data-bind-flow]');
    if (flowEl) {
      const flow = product.flow;
      if (!flow) {
        flowEl.remove();
      } else {
        flowEl.hidden = false;
        const heading = flowEl.querySelector('[data-flow-heading]');
        if (heading) heading.textContent = flow.heading || 'How it works';

        flowEl.querySelector('[data-flow-nodes]').innerHTML = (flow.nodes || [])
          .map(
            (n, i) => `<article class="product-flow__node product-flow__node--${escapeHtml(
              n.tone || 'navy'
            )}">
              ${flowIcon(n.icon)}
              <p class="product-flow__node-title">${escapeHtml(n.title)}</p>
              <p class="product-flow__node-sub">${escapeHtml(n.sub || '')}</p>
            </article>`
          )
          .join('');

        /* The bracket is built as a grid rather than one stretched SVG.
           A stretched viewBox scales X and Y by different amounts, which
           skews the arrowheads and pulls them off their own stem — the
           rule and the ticks survive it, the arrows do not. Here each tick
           is its own cell, so nothing is scaled and every arrow sits dead
           on its line at any width. */
        const steps = flow.steps || [];
        const bracket = flowEl.querySelector('[data-flow-bracket]');
        if (bracket && steps.length) {
          bracket.style.setProperty('--cols', String(steps.length));
          bracket.innerHTML = steps
            .map(
              () =>
                '<span class="product-flow__tick">' +
                '<svg viewBox="0 0 12 8" fill="none" stroke="currentColor" ' +
                'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
                'aria-hidden="true"><path d="M1 1 6 6.5 11 1"/></svg>' +
                '</span>'
            )
            .join('');
        }

        flowEl.querySelector('[data-flow-steps]').innerHTML = steps
          .map(
            (st, i) => `<li class="product-flow__step">
              <span class="product-flow__step-num" aria-hidden="true">${i + 1}</span>
              <div class="product-flow__step-copy">
                <p class="product-flow__step-title">${escapeHtml(st.title)}</p>
                <p class="product-flow__step-body">${escapeHtml(st.body)}</p>
              </div>
            </li>`
          )
          .join('');

        flowEl.querySelector('[data-flow-cards]').innerHTML = (flow.cards || [])
          .map(
            (c) => `<li class="product-flow__card">
              ${flowIcon(c.icon, 'product-flow__icon--card')}
              <div>
                <p class="product-flow__card-title">${escapeHtml(c.title)}</p>
                <p class="product-flow__card-body">${escapeHtml(c.body)}</p>
              </div>
            </li>`
          )
          .join('');
      }
    }

    /* The band under the showcase is the proof row: a few hard numbers.
       Products still on the old shape fall back to their numbered claims,
       so nothing renders empty. */
    const features = wrap.querySelector('[data-bind-features]');
    if (features) {
      if (product.featureList) {
        /* A titled block with plain bullets — no numbering, because these
           are a set rather than a sequence. */
        const fl = product.featureList;
        features.classList.add('wallet-features__grid--list');
        features.innerHTML = `<div class="wallet-list">
          <h2 class="h-2 wallet-list__title">${escapeHtml(fl.title || '')}</h2>
          <div class="wallet-list__copy">
            ${fl.body ? `<p class="wallet-list__body">${escapeHtml(fl.body)}</p>` : ''}
            <ul class="wallet-list__items">${(fl.items || [])
              .map((i) => `<li>${escapeHtml(i)}</li>`)
              .join('')}</ul>
          </div>
        </div>`;
      } else if (product.stats?.length) {
        features.classList.add('wallet-features__grid--stats');
        features.innerHTML = product.stats
          .map(
            (s) => `<article class="wallet-stat">
              <p class="wallet-stat__value">${escapeHtml(s.value)}</p>
              <p class="wallet-stat__label">${escapeHtml(s.label)}</p>
            </article>`
          )
          .join('');
      } else if (product.features?.length) {
        features.innerHTML = product.features
          .map(
            (f, i) => `<article class="wallet-feature">
              <span class="wallet-feature__number" aria-hidden="true">${i + 1}</span>
              <p class="wallet-feature__body">${escapeHtml(f.body)}</p>
            </article>`
          )
          .join('');
      } else {
        /* Nothing to say in this band — drop the whole section rather than
           leave an empty one holding its padding open. */
        features.closest('section')?.remove();
      }
    }

    const phoneSlot = wrap.querySelector('[data-phone-slot]');
    if (phoneSlot) fillPhoneSlot(phoneSlot, product);

    if (!product.showcase?.showActivity) {
      wrap.querySelectorAll('[data-show-if="showcase.showActivity"]').forEach((el) => {
        el.remove();
      });
      wrap.querySelector('.wallet-showcase__side')?.classList.add('is-stat-only');
    } else {
      const activityEl = wrap.querySelector('[data-wallet-activity]');
      const activity = product.showcase?.activity;
      if (activityEl && activity) {
        activityEl.setAttribute('data-wa-config', JSON.stringify(activity));
      }
    }

    const title = wrap.querySelector('#product-sheet-title, .wallet-hero__title');
    if (title && !title.id) title.id = 'product-sheet-title';

    if (wrapClass === 'product-page__content' && title) {
      title.classList.add('display-1');
    }

    if (product.title) document.title = product.title;

    const meta = document.querySelector('meta[name="description"]');
    if (meta && product.description) meta.setAttribute('content', product.description);

    return wrap;
  };

  /* Card markup for the "More to discover" strip. Shared so the solution
     pages can render the identical thing from their own product list. */
  const buildDiscoverCards = async (entries, linkFor) => {
    const discoverMediaFor = async (entry, name) => {
      if (DISCOVER_PASSPORT_SLUGS.has(entry.slug)) {
        await ensureStage();
        const source = stageEl?.querySelector('[data-phone="passport"]');
        if (source) {
          const clone = source.cloneNode(true);
          clone.hidden = false;
          clone.removeAttribute('hidden');
          clone.removeAttribute('data-phone');
          delete clone.dataset.mrzReady;
          return `<div class="wallet-discover__media wallet-discover__media--passport" aria-hidden="true">${clone.outerHTML}</div>`;
        }
      }

      /* Grey placeholder for every card — real photos land later. Restore
         the image by returning the <img> markup below again; the lookup
         chain (DISCOVER_IMAGES → product.discover[0].image → fallback)
         still stands, and js/discover-drop.js can still drop one in. */
      return `<div class="wallet-discover__media is-empty" aria-hidden="true"></div>`;
    };

    const cards = await Promise.all(
      entries.map(async (entry) => {
        const full = await loadProduct(entry.slug);
        const name = full.name || entry.name || entry.slug;
        const copy = full.description || full.hero?.sub || '';
        const media = await discoverMediaFor(entry, name);
        return `<a class="wallet-discover__card" href="${escapeHtml(linkFor(entry.slug))}">
          ${media}
          <p class="wallet-discover__copy">${escapeHtml(copy)}</p>
          <span class="wallet-discover__link">${escapeHtml(name)}</span>
        </a>`;
      })
    );
    return cards.join('');
  };

  const fillDiscover = async (wrap, currentSlug, { hrefForSlug } = {}) => {
    const grid = wrap.querySelector('[data-bind-discover]');
    if (!grid) return;
    await ensureIndex();
    const linkFor = hrefForSlug || ((slug) => `#product/${slug}`);
    grid.innerHTML = await buildDiscoverCards(pickDiscoverEntries(currentSlug, 3), linkFor);
  };

  /* Render the same cards into any grid, from an explicit list of slugs. */
  const renderDiscoverInto = async (grid, slugs, { hrefForSlug } = {}) => {
    if (!grid || !slugs?.length) return;
    await ensureIndex();
    const linkFor = hrefForSlug || ((slug) => `./product.html?slug=${encodeURIComponent(slug)}`);
    const entries = slugs.map((slug) => ({ slug }));
    grid.innerHTML = await buildDiscoverCards(entries, linkFor);
  };

  const mountWidgets = (scope) => {
    window.ScytalesPhone?.init(scope);
    window.ScytalesWalletActivity?.init(scope);
    window.ScytalesCursorStroke?.init(scope);
    window.ScytalesMvalidUi?.init(scope);
    window.ScytalesDisplay1Reveal?.init(scope);
    window.ScytalesAgeVerification?.init(scope);
    window.ScytalesPos?.init(scope);
    window.ScytalesProductCards?.init(scope);
    window.ScytalesDragScroll?.init(scope);
    window.ScytalesBenefitsPin?.init(scope);
  };

  const renderInto = async (container, slug, options = {}) => {
    const {
      wrapClass = 'product-sheet__content',
      hrefForSlug,
      loadingHtml = '<p class="product-sheet__loading">Loading…</p>',
    } = options;

    container.innerHTML = loadingHtml;
    await ensureStage();
    await ensureAssets();
    const product = await loadProduct(slug);
    const wrap = renderProduct(product, { wrapClass });
    await fillDiscover(wrap, slug, { hrefForSlug });
    container.innerHTML = '';
    container.appendChild(wrap);
    mountWidgets(wrap);
    return wrap;
  };

  window.ScytalesProductRender = {
    ensureAssets,
    ensureIndex,
    ensureStage,
    restoreHomeStage,
    loadProduct,
    renderProduct,
    fillDiscover,
    renderDiscoverInto,
    mountWidgets,
    renderInto,
    escapeHtml,
  };
})();
