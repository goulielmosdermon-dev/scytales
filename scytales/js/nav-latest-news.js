/* Hydrate Latest News mega-menu cards from articles CMS */
(() => {
  const api = (window.ScytalesNav = window.ScytalesNav || {});

  /* Pinned card. Falls back to the newest article when the slug is missing,
     so the index's own order still governs the newsroom listing. */
  const FEATURED_SLUG = 'mobile-driving-licence-standard-approved-and-published';

  api.initLatestNews = () => {
    const cards = [...document.querySelectorAll('[data-nav-latest-news]')];
    if (!cards.length) return;

    fetch('content/articles/index.json?v=perm1')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load articles');
        return r.json();
      })
      .then(async (data) => {
        const list = data.articles || [];
        const latest = list.find((a) => a.slug === FEATURED_SLUG) || list[0];
        if (!latest) return;
        const href = `article.html?slug=${encodeURIComponent(latest.slug)}`;
        const image = await window.ScytalesArticleImages?.resolve(latest);
        cards.forEach((card) => {
          card.setAttribute('href', href);
          const media = card.querySelector('[data-nav-latest-media]');
          const tag = card.querySelector('[data-nav-latest-tag]');
          const title = card.querySelector('[data-nav-latest-title]');
          const time = card.querySelector('[data-nav-latest-date]');
          if (media) {
            if (image) {
              media.style.backgroundImage = `url('${image}')`;
              media.classList.add('has-image');
            } else {
              media.style.backgroundImage = '';
              media.classList.remove('has-image');
            }
          }
          if (tag) tag.textContent = latest.categoryLabel || 'Articles';
          if (title) title.textContent = latest.title;
          if (time) {
            time.textContent = latest.dateLabel || latest.date || '';
            if (latest.date) time.setAttribute('datetime', latest.date);
          }
        });
      })
      .catch((err) => console.error(err));
  };
})();
