/* Product detail — full page CMS renderer */
(() => {
  const root = document.querySelector('[data-product-page]');
  const body = root?.querySelector('[data-product-page-body]');
  if (!root || !body) return;

  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  if (!slug && location.hash.startsWith('#product/')) {
    slug = location.hash.slice('#product/'.length).split(/[/?#]/)[0];
  }
  if (!slug) slug = 'digital-id-wallet';

  const hrefForSlug = (s) => `./product.html?slug=${encodeURIComponent(s)}`;

  window.ScytalesProductRender.renderInto(body, slug, {
    wrapClass: 'product-page__content',
    hrefForSlug,
  }).catch((err) => {
    console.error(err);
    body.innerHTML = `<p class="product-sheet__loading">Couldn’t load product details.</p>`;
  });
})();
