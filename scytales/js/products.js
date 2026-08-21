/* Products list — driven by content/products/index.json.
   Every [data-product-list] is wired to the [data-products-stage] inside the
   same section, so a section can be duplicated to trial a different layout. */
(() => {
  const INDEX_URL = 'content/products/index.json?v=pos1';
  const sections = [...document.querySelectorAll('[data-product-list]')]
    .map((productList) => {
      const scope = productList.closest('.products') || document;
      const productStage = scope.querySelector('[data-products-stage]');
      return productStage ? { productList, productStage, scope } : null;
    })
    .filter(Boolean);
  if (!sections.length) return;

  const showPreview = (productStage, preview) => {
    const mode = preview && preview !== 'blank' ? preview : 'digital-id-wallet';
    productStage.querySelectorAll('[data-phone]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-phone') !== mode;
    });
  };

  const activeItem = (productList) => productList.querySelector('.list-item.is-active');
  const activePreview = (productList) =>
    activeItem(productList)?.getAttribute('data-list-preview') || null;

  const wire = ({ productList, productStage }) => {
    if (productList.closest('.products--alt')) {
      // Each row carries its own image; no shared stage to drive.
      productList.addEventListener('click', (event) => {
        const item = event.target.closest('.list-item');
        if (!item || !productList.contains(item)) return;
        if (item.getAttribute('data-has-page') !== '0') {
          window.ScytalesProductSheet?.open(item.getAttribute('data-product'));
        }
      });
      return;
    }

    productList.addEventListener('pointerover', (event) => {
      const item = event.target.closest('.list-item');
      if (!item || !productList.contains(item)) return;
      showPreview(productStage, item.getAttribute('data-list-preview'));
    });

    productList.addEventListener('pointerleave', () => {
      showPreview(productStage, activePreview(productList));
    });

    productList.addEventListener('click', (event) => {
      const item = event.target.closest('.list-item');
      if (!item || !productList.contains(item)) return;
      productList.querySelectorAll('.list-item.is-active').forEach((el) => {
        el.classList.remove('is-active');
      });
      item.classList.add('is-active');
      showPreview(productStage, item.getAttribute('data-list-preview'));
      if (item.getAttribute('data-has-page') !== '0') {
        window.ScytalesProductSheet?.open(item.getAttribute('data-product'));
      }
    });
  };

  /* Alt take:each product is its own row — blurb + index, image, big title. */
  const altRow = (p, i, blurb) => {
    const hasPage = p.hasPage !== false;
    const index = `/0.${i + 1}`;
    return `<li>
      <button class="list-item palt__row" type="button"
              data-product="${p.slug}"
              data-list-preview="${p.listPreview || 'blank'}"
              data-has-page="${hasPage ? '1' : '0'}">
        <span class="palt__copy">
          <span class="palt__desc">${blurb}</span>
          <span class="palt__index">${index}</span>
        </span>
        <span class="palt__media" aria-hidden="true"></span>
        <span class="palt__name">${p.name}</span>
      </button>
    </li>`;
  };

  const fillAlt = async (productList, products) => {
    const blurbs = await Promise.all(
      products.map(async (p) => {
        try {
          const full = await window.ScytalesProductRender?.loadProduct(p.slug);
          return full?.hero?.sub || full?.description || '';
        } catch {
          return '';
        }
      })
    );
    productList.innerHTML = products.map((p, i) => altRow(p, i, blurbs[i])).join('');
  };

  const fill = (products) => {
    sections.forEach(({ productList, productStage, scope }) => {
      if (scope.classList?.contains('products--alt')) {
        fillAlt(productList, products);
        return;
      }
      productList.innerHTML = products
        .map((p, i) => {
          const active = i === 0 ? ' is-active' : '';
          const preview = p.listPreview || 'blank';
          const hasPage = p.hasPage !== false;
          return `<li><button class="list-item${active}" type="button" data-product="${p.slug}" data-list-preview="${preview}" data-has-page="${hasPage ? '1' : '0'}">${p.name}</button></li>`;
        })
        .join('');
      showPreview(productStage, activePreview(productList));
    });

    // Footer products (optional sync)
    const footerList = document.querySelector('[data-footer-products]');
    if (footerList) {
      footerList.innerHTML = products
        .map((p) => {
          const href =
            p.hasPage === false
              ? './products.html'
              : `./product.html?slug=${encodeURIComponent(p.slug)}`;
          return `<li><a href="${href}">${p.name}</a></li>`;
        })
        .join('');
    }
  };

  sections.forEach(wire);

  fetch(INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load products index');
      return res.json();
    })
    .then((data) => fill(data.products || []))
    .catch((err) => {
      console.error(err);
      sections.forEach(({ productList, productStage }) =>
        showPreview(productStage, activePreview(productList) || 'digital-id-wallet')
      );
    });

  /* ---- Alt section: gentle scroll magnetism ------------------
     Snapping is switched on only while the alt section is on screen, so the
     rest of the page keeps its normal free scroll. "proximity" nudges toward
     the nearest product rather than locking to it. */
  const alt = document.querySelector('.products--alt');
  if (alt && 'IntersectionObserver' in window) {
    const root = document.documentElement;
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => root.classList.toggle('is-product-snap', entry.isIntersecting));
      },
      { threshold: 0.12 }
    ).observe(alt);
  }
})();
