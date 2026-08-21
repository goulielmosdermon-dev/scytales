/* Newsroom listing — CMS-driven grid + filters */
(() => {
  const root = document.querySelector('[data-newsroom]');
  if (!root) return;

  const filtersEl = root.querySelector('[data-newsroom-filters]');
  const gridEl = root.querySelector('[data-newsroom-grid]');
  const emptyEl = root.querySelector('[data-newsroom-empty]');
  const searchEl = root.querySelector('[data-newsroom-search]');
  if (!filtersEl || !gridEl) return;

  const INDEX_URL = 'content/articles/index.json?v=perm1';
  const Images = () => window.ScytalesArticleImages;

  let categories = [];
  let articles = [];
  let activeCategory = 'all';
  let query = '';

  const articleHref = (slug) => `article.html?slug=${encodeURIComponent(slug)}`;

  const cardHtml = (a) => `
    <li>
      <article class="newsroom__card">
        <a class="newsroom__card-media${a.image ? '' : ' is-empty'}"
           href="${articleHref(a.slug)}"
           data-cms-image="${(a.image || '').replace(/"/g, '&quot;')}"
           aria-hidden="${a.image ? 'true' : 'false'}"
           tabindex="-1"></a>
        <a class="newsroom__card-body" href="${articleHref(a.slug)}">
          <p class="newsroom__card-tag">${a.categoryLabel || ''}</p>
          <h2 class="newsroom__card-title">${a.title}</h2>
          <p class="newsroom__card-date">${a.dateLabel || a.date || ''}</p>
        </a>
      </article>
    </li>`;

  const matches = (a) => {
    if (activeCategory !== 'all' && a.category !== activeCategory) return false;
    if (!query) return true;
    const hay = `${a.title} ${a.excerpt || ''} ${a.categoryLabel || ''} ${(a.topics || []).join(' ')}`.toLowerCase();
    return hay.includes(query);
  };

  const renderFilters = () => {
    filtersEl.innerHTML = categories.map((c) => `
      <button class="newsroom__filter${c.id === activeCategory ? ' is-active' : ''}"
              type="button"
              role="tab"
              aria-selected="${c.id === activeCategory}"
              data-category="${c.id}">${c.label}</button>
    `).join('');
  };

  const paintMedia = () => {
    const api = Images();
    if (!api) return;
    gridEl.querySelectorAll('.newsroom__card-media').forEach((el) => {
      api.paint(el);
    });
  };

  const renderGrid = () => {
    const list = articles.filter(matches);
    gridEl.innerHTML = list.map(cardHtml).join('');
    if (emptyEl) emptyEl.hidden = list.length > 0;
    paintMedia();
  };

  filtersEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-category]');
    if (!btn) return;
    activeCategory = btn.getAttribute('data-category') || 'all';
    renderFilters();
    renderGrid();
  });

  searchEl?.addEventListener('input', () => {
    query = (searchEl.value || '').trim().toLowerCase();
    renderGrid();
  });

  const params = new URLSearchParams(location.search);
  const initialQ = params.get('q');
  if (initialQ && searchEl) {
    searchEl.value = initialQ;
    query = initialQ.trim().toLowerCase();
  }

  fetch(INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error('Failed to load articles');
      return r.json();
    })
    .then((data) => {
      categories = data.categories || [];
      articles = data.articles || [];
      renderFilters();
      renderGrid();
    })
    .catch((err) => {
      console.error(err);
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = 'Unable to load articles.';
      }
    });
})();
