/* Solutions detail — CMS-driven industry pages */
(() => {
  const root = document.querySelector('[data-solution-page]');
  if (!root) return;

  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  if (!slug && location.hash.startsWith('#solutions/')) {
    slug = location.hash.slice('#solutions/'.length).split(/[/?#]/)[0];
  }
  if (!slug) slug = 'government';

  const escapeText = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /* Same escaping, plus the single quote — the orbit states ride in a
     single-quoted attribute. */
  const escapeAttr = (value) => escapeText(value).replace(/'/g, '&#39;');

  const paragraphs = (text) =>
    String(text || '')
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeText(p)}</p>`)
      .join('');

  const setText = (sel, value) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = value || '';
  };

  const render = (data) => {
    document.title = data.seoTitle || `${data.eyebrow} Solutions | Scytáles`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && data.seoDescription) meta.setAttribute('content', data.seoDescription);

    setText('[data-solution-eyebrow]', data.eyebrow);
    setText('[data-solution-title]', data.title);
    setText('[data-solution-lead]', data.lead);
    setText('[data-solution-demo-text]', data.demoText);
    setText('[data-solution-products-lead]', data.productsLead);

    window.ScytalesDisplay1Reveal?.init(root);

    const sectionsEl = root.querySelector('[data-solution-sections]');
    if (sectionsEl) {
      sectionsEl.innerHTML = (data.sections || [])
        .map((section, i) => {
          const bullets = (section.bullets || [])
            .map((item) => `<li>${escapeText(item)}</li>`)
            .join('');
          const list = bullets ? `<ul class="solution-page__list">${bullets}</ul>` : '';

          /* A `rail` array turns the section into the same pinned carousel
             of orange blocks the product pages use — the heading becomes
             the intro block, each entry a block after it. */
          if (section.rail?.length) {
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const blocks = section.rail
              .map(
                (item, n) => `<article class="benefits-rail__block">
                  <p class="benefits-rail__body">${escapeText(item)}</p>
                  <span class="benefits-rail__mark" aria-hidden="true">${letters[n] || ''}</span>
                </article>`
              )
              .join('');
            return `
              <section class="benefits-rail solution-rail" style="--s:${i}"
                       aria-label="${escapeText(section.heading)}" data-benefits-pin>
                <div class="benefits-rail__sticky">
                  <div class="benefits-rail__track" data-benefits-rail>
                    <article class="benefits-rail__block benefits-rail__block--intro">
                      <p class="benefits-rail__title">${escapeText(section.heading)}</p>
                    </article>
                    ${blocks}
                  </div>
                </div>
              </section>`;
          }

          /* An `orbit` array replaces the prose with the armillary graphic —
             three rings that turn, and a tag on the rim that steps through
             the listed states. js/orbit.js drives it. */
          if (section.orbit?.length) {
            return `
              <section class="solution-block solution-block--orbit" style="--s:${i}">
                <div class="solution-block__lead-col">
                  <h2 class="h-2 solution-block__title">${escapeText(section.heading)}</h2>
                  ${section.lead ? `<p class="body-md solution-block__lead">${escapeText(section.lead)}</p>` : ''}
                </div>
                <div class="orb" data-orb data-orb-state="1"
                     data-orb-states='${escapeAttr(JSON.stringify(section.orbit))}'>
                  <span class="orb__ring orb__ring--1"></span>
                  <span class="orb__ring orb__ring--2"></span>
                  <span class="orb__ring orb__ring--3"></span>
                  <p class="orb__tag">
                    <span class="orb__index" data-orb-index>1</span>
                    <span class="orb__label" data-orb-label></span>
                  </p>
                </div>
              </section>`;
          }

          /* A `points` array is the panel layout: heading and lead across
             the top, the points below in a three-column grid. */
          if (section.points?.length) {
            const cells = section.points
              .map((item) => `<li class="solution-points__item">${escapeText(item)}</li>`)
              .join('');
            return `
              <section class="solution-points" style="--s:${i}">
                <div class="solution-points__head">
                  <h2 class="h-2 solution-points__title">${escapeText(section.heading)}</h2>
                  ${section.lead ? `<p class="body-md solution-points__lead">${escapeText(section.lead)}</p>` : ''}
                </div>
                <ul class="solution-points__grid">${cells}</ul>
              </section>`;
          }

          return `
            <section class="solution-block" style="--s:${i}">
              <h2 class="h-2 solution-block__title">${escapeText(section.heading)}</h2>
              <div class="body-md solution-block__body">
                ${paragraphs(section.body)}
                ${list}
              </div>
            </section>`;
        })
        .join('');
      window.ScytalesBenefitsPin?.init(sectionsEl);
      window.ScytalesOrbit?.init(sectionsEl);
    }

    /* Same cards as a product page's "More to discover" — image, copy, link. */
    const productsEl = root.querySelector('[data-solution-products]');
    if (productsEl) {
      const slugs = (data.relatedProducts || []).map((p) => p.slug).filter(Boolean);
      window.ScytalesProductRender?.renderDiscoverInto(productsEl, slugs)?.catch((err) =>
        console.error(err)
      );
    }
  };

  fetch(`content/solutions/${encodeURIComponent(slug)}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Solution not found: ${slug}`);
      return r.json();
    })
    .then(render)
    .catch((err) => {
      console.error(err);
      setText('[data-solution-title]', 'Solution not found');
      setText('[data-solution-lead]', 'This solutions page could not be loaded.');
    });
})();
