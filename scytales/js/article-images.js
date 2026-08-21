/* Article cover images — CMS paths only (display, not editable) */
(() => {
  const resolve = async (articleOrSlug, fallbackImage) => {
    if (typeof articleOrSlug === 'string') return fallbackImage || null;
    return articleOrSlug?.image || fallbackImage || null;
  };

  const applyMedia = (el, url) => {
    if (!el) return;
    if (url) {
      el.style.backgroundImage = `url("${String(url).replace(/"/g, '%22')}")`;
      el.classList.add('has-image');
      el.classList.remove('is-empty');
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('has-image');
      el.classList.add('is-empty');
    }
  };

  const paint = (el, url) => {
    if (!el) return;
    const src = url || el.getAttribute('data-cms-image') || null;
    applyMedia(el, src);
  };

  window.ScytalesArticleImages = {
    resolve,
    applyMedia,
    paint,
  };
})();
