/* Article page — loads CMS entry by ?slug= and related topics */
(() => {
  const root = document.querySelector('[data-article-page]');
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const hashSlug = location.hash.replace(/^#\/?/, '');
  const slug = params.get('slug') || hashSlug;
  if (!slug) {
    location.replace('./newsroom.html');
    return;
  }

  const titleEl = root.querySelector('[data-article-title]');
  const excerptEl = root.querySelector('[data-article-excerpt]');
  const catEl = root.querySelector('[data-article-category]');
  const dateEl = root.querySelector('[data-article-date]');
  const mediaEl = root.querySelector('[data-article-media]');
  const bodyEl = root.querySelector('[data-article-body]');
  const topicsEl = root.querySelector('[data-article-topics]');
  const relatedEl = root.querySelector('[data-article-related]');

  const articleHref = (s) => `article.html?slug=${encodeURIComponent(s)}`;
  const Images = () => window.ScytalesArticleImages;

  const escapeText = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const renderBlock = (block) => {
    if (typeof block === 'string') {
      return `<p>${escapeText(block)}</p>`;
    }
    if (!block || typeof block !== 'object') return '';

    switch (block.type) {
      case 'h2':
        return `<h2 class="article-page__heading">${escapeText(block.text)}</h2>`;
      case 'h3':
        return `<h3 class="article-page__subheading">${escapeText(block.text)}</h3>`;
      case 'ul':
        return `<ul class="article-page__list">${(block.items || [])
          .map((item) => {
            if (block.htmlItems) return `<li>${item}</li>`;
            return `<li>${escapeText(item)}</li>`;
          })
          .join('')}</ul>`;
      case 'blockquote':
        return `<blockquote class="article-page__quote">${
          block.html || escapeText(block.text || '')
        }</blockquote>`;
      case 'h4':
        return `<h4 class="article-page__subheading article-page__subheading--sm">${escapeText(block.text)}</h4>`;
      case 'figure': {
        const caption = escapeText(block.caption || '');
        const src = block.image || block.src || '';
        return `
          <figure class="article-page__figure">
            <div class="article-page__figure-media${src ? '' : ' is-empty'}"
                 data-article-figure
                 data-cms-image="${escapeText(src)}"
                 aria-hidden="true"></div>
            ${block.caption ? `<figcaption>${caption}</figcaption>` : ''}
          </figure>`;
      }
      case 'compare-table': {
        const cols = block.columns || [];
        const rows = block.rows || [];
        const renderCell = (cell) => {
          if (!cell) return '';
          if (cell.rating) {
            return `<div class="auth-compare__cell"><strong>${escapeText(cell.rating)}</strong>${
              cell.detail ? `<span>${escapeText(cell.detail)}</span>` : ''
            }</div>`;
          }
          return `<div class="auth-compare__cell"><strong>${escapeText(cell.text || '')}</strong></div>`;
        };
        const head = `
          <div class="auth-compare__row" data-auth-row style="--r:0">
            ${cols
              .map((label, i) => {
                const cls = i === 0 ? 'auth-compare__head auth-compare__head--feature' : 'auth-compare__head';
                return `<div class="${cls}" role="columnheader">${escapeText(label)}</div>`;
              })
              .join('')}
          </div>`;
        const body = rows
          .map((row, i) => `
            <div class="auth-compare__row" data-auth-row style="--r:${i + 1}">
              <div class="auth-compare__feature" role="rowheader">${escapeText(row.feature)}</div>
              ${(row.cells || []).map((cell) => renderCell(cell)).join('')}
            </div>`)
          .join('');
        return `
          <div class="auth-compare" data-auth-compare role="table" aria-label="${escapeText(block.caption || 'Comparison table')}">
            <div class="auth-compare__grid">
              ${head}
              ${body}
            </div>
          </div>`;
      }
      case 'roi-flowchart':
        return `<div class="roi-flow" data-roi-flow aria-label="ROI evaluation flowchart"></div>`;
      case 'p':
      default:
        if (block.html) return `<p>${block.html}</p>`;
        return `<p>${escapeText(block.text || '')}</p>`;
    }
  };

  Promise.all([
    fetch(`content/articles/${encodeURIComponent(slug)}.json?v=img2`).then((r) => {
      if (!r.ok) throw new Error('Article not found');
      return r.json();
    }),
    fetch('content/articles/index.json?v=perm1').then((r) => r.json()),
  ])
    .then(async ([article, index]) => {
      document.title = article.seoTitle || `${article.title} | Scytáles`;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && article.description) desc.setAttribute('content', article.description);

      if (titleEl) titleEl.textContent = article.title;
      if (excerptEl) excerptEl.textContent = article.excerpt || article.description || '';
      if (catEl) catEl.textContent = article.categoryLabel || '';
      if (dateEl) {
        dateEl.textContent = article.dateLabel || article.date || '';
        if (article.date) dateEl.setAttribute('datetime', article.date);
      }
      if (mediaEl) {
        mediaEl.removeAttribute('role');
        mediaEl.removeAttribute('tabindex');
        mediaEl.setAttribute('aria-hidden', 'true');
        // "imageFit": "contain" for covers that must not be cropped
        mediaEl.classList.toggle('is-contain', article.imageFit === 'contain');
        Images()?.paint(mediaEl, article.image || null);
      }
      if (bodyEl) {
        bodyEl.innerHTML = (article.body || []).map(renderBlock).join('');
        bodyEl.querySelectorAll('[data-article-figure]').forEach((el) => {
          Images()?.paint(el);
        });

        const revealOnScroll = (el) => {
          if (!el) return;
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduceMotion) {
            el.classList.add('is-drawn');
            return;
          }
          const io = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                el.classList.add('is-drawn');
                io.disconnect();
              });
            },
            { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
          );
          io.observe(el);
        };

        revealOnScroll(bodyEl.querySelector('[data-auth-compare]'));

        const roiSlot = bodyEl.querySelector('[data-roi-flow]');
        if (roiSlot) {
          window.ScytalesRoiFlow?.mount(roiSlot);
        }
      }

      const topics = article.topics || [];
      if (topicsEl) {
        topicsEl.innerHTML = topics
          .map((t) => `<li><a class="article-related__chip" href="./newsroom.html?q=${encodeURIComponent(t)}">${t}</a></li>`)
          .join('');
      }

      const related = (index.articles || [])
        .filter((a) => a.slug !== article.slug)
        .filter((a) => {
          const shared = (a.topics || []).some((t) => topics.includes(t));
          return shared || a.category === article.category;
        })
        .slice(0, 3);

      if (relatedEl) {
        relatedEl.innerHTML = related
          .map((a) => `
            <li>
              <article class="newsroom__card">
                <a class="newsroom__card-media${a.image ? '' : ' is-empty'}"
                   href="${articleHref(a.slug)}"
                   data-cms-image="${(a.image || '').replace(/"/g, '&quot;')}"
                   aria-hidden="${a.image ? 'true' : 'false'}"
                   tabindex="-1"></a>
                <a class="newsroom__card-body" href="${articleHref(a.slug)}">
                  <p class="newsroom__card-tag">${a.categoryLabel || ''}</p>
                  <h3 class="newsroom__card-title">${a.title}</h3>
                  <p class="newsroom__card-date">${a.dateLabel || a.date || ''}</p>
                </a>
              </article>
            </li>`)
          .join('');

        relatedEl.querySelectorAll('.newsroom__card-media').forEach((el) => {
          Images()?.paint(el);
        });
      }
    })
    .catch((err) => {
      console.error(err);
      if (titleEl) titleEl.textContent = 'Article not found';
      if (excerptEl) excerptEl.textContent = 'This article could not be loaded.';
    });
})();
