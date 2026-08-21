/* Products catalog — classic grid listing */
(() => {
  const grid = document.querySelector('[data-products-catalog]');
  if (!grid) return;

  const render = () => window.ScytalesProductRender;
  const INDEX_URL = 'content/products/index.json';

  const escapeHtml = (str) => render().escapeHtml(str);

  fetch(INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load products index');
      return res.json();
    })
    .then(async (data) => {
      const products = (data.products || []).filter((p) => p.hasPage !== false);
      const cards = await Promise.all(
        products.map(async (entry) => {
          let excerpt = '';
          try {
            const full = await render().loadProduct(entry.slug);
            excerpt = full.description || full.hero?.sub || '';
          } catch {
            excerpt = '';
          }
          return `<li>
            <a class="products-catalog__cell" href="./product.html?slug=${encodeURIComponent(entry.slug)}">
              <span class="products-catalog__media">
                <img src="assets/products/${escapeHtml(entry.slug)}.jpg" alt="" loading="lazy">
              </span>
              <h3 class="products-catalog__name">${escapeHtml(entry.name || entry.slug)}</h3>
              ${excerpt ? `<p class="products-catalog__excerpt body-md">${escapeHtml(excerpt)}</p>` : ''}
              <span class="products-catalog__cta">View product</span>
            </a>
          </li>`;
        })
      );
      grid.innerHTML = cards.join('');

      const footerList = document.querySelector('[data-footer-products]');
      if (footerList) {
        footerList.innerHTML = products
          .map(
            (p) =>
              `<li><a href="./product.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.name || p.slug)}</a></li>`
          )
          .join('');
      }
    })
    .catch((err) => {
      console.error(err);
      grid.innerHTML = '<li><p class="products-catalog__error">Couldn’t load products.</p></li>';
    });
})();
