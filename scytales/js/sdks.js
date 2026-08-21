/* Build with Scytáles SDKs — hydrates the page from content/sdks.json */
(() => {
  const root = document.querySelector('[data-sdk-page]');
  if (!root) return;

  const SOURCE = 'content/sdks.json?v=1';

  const escapeText = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const setText = (sel, value) => {
    const el = root.querySelector(sel);
    if (!el) return;
    el.textContent = value || '';
    el.hidden = !value;
  };

  /* Line icons in the nav-mega language: 32×32, 1.6 stroke, currentColor. */
  const ICONS = {
    blocks: '<rect x="5" y="5" width="10" height="10" rx="1.6"/><rect x="17" y="5" width="10" height="10" rx="1.6"/><rect x="5" y="17" width="10" height="10" rx="1.6"/><path d="M17 22h10M22 17v10" stroke-linecap="round"/>',
    clock: '<circle cx="16" cy="16" r="11"/><path d="M16 9.5V16l4.5 3" stroke-linecap="round" stroke-linejoin="round"/>',
    sliders: '<path d="M6 10h20M6 22h20" stroke-linecap="round"/><circle cx="12" cy="10" r="3"/><circle cx="21" cy="22" r="3"/>',
    gauge: '<path d="M5 22a11 11 0 1 1 22 0" stroke-linecap="round"/><path d="M16 22l6-6" stroke-linecap="round"/><circle cx="16" cy="22" r="1.6"/>',
    ecosystem: '<circle cx="16" cy="8" r="3.4"/><circle cx="8" cy="22" r="3.4"/><circle cx="24" cy="22" r="3.4"/><path d="M13.4 10.4 10.6 18.6M18.6 10.4l2.8 8.2M11.4 22h9.2" stroke-linecap="round"/>',
    refresh: '<path d="M26 16a10 10 0 1 1-3.2-7.3" stroke-linecap="round"/><path d="M27 5v6h-6" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  const icon = (name) =>
    `<span class="sdk-feature__icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1">${ICONS[name] || ICONS.blocks}</svg></span>`;

  const button = (cta, variant) =>
    `<a class="btn ${variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}" href="${escapeText(cta.href || '#contact')}">${escapeText(cta.label)}</a>`;

  const renderHero = (d) => {
    setText('[data-sdk-eyebrow]', d.eyebrow);
    setText('[data-sdk-title]', d.title);
    setText('[data-sdk-sub]', d.sub);
    setText('[data-sdk-lead]', d.lead);

    const actions = root.querySelector('[data-sdk-actions]');
    if (actions) {
      actions.innerHTML = [
        d.ctaPrimary && button(d.ctaPrimary, 'primary'),
        d.ctaSecondary && button(d.ctaSecondary, 'secondary'),
      ].filter(Boolean).join('');
    }

    // Signature orange pillars — same markup the product template emits.
    const pillars = root.querySelector('[data-sdk-pillars]');
    if (pillars) {
      pillars.innerHTML = (d.bullets || [])
        .map((b) => `<div class="wallet-pillars__cell"><p class="wallet-pillars__text">${escapeText(b)}</p></div>`)
        .join('');
    }
  };

  const renderFeatures = (d) => {
    setText('[data-sdk-features-heading]', d.featuresHeading);
    const grid = root.querySelector('[data-sdk-features]');
    if (!grid) return;
    grid.innerHTML = (d.features || [])
      .map((f) => `
        <li class="sdk-feature">
          ${icon(f.icon)}
          <h3 class="sdk-feature__name">${escapeText(f.name)}</h3>
          <p class="sdk-feature__body">${escapeText(f.body)}</p>
        </li>`)
      .join('');
  };

  const renderCompare = (d) => {
    setText('[data-sdk-compare-heading]', d.compareHeading);
    setText('[data-sdk-compare-lead]', d.compareLead);
    const table = root.querySelector('[data-sdk-compare]');
    const c = d.compare;
    if (!table || !c) return;
    // First column is the row label, so the header leads with an empty cell.
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">Criteria</span></th>
          ${c.columns.map((col, i) => `<th scope="col"${i === 0 ? ' class="is-featured"' : ''}>${escapeText(col)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${(c.rows || []).map((r) => `
          <tr>
            <th scope="row">${escapeText(r.label)}</th>
            ${r.cells.map((cell, i) => `<td${i === 0 ? ' class="is-featured"' : ''}>${escapeText(cell)}</td>`).join('')}
          </tr>`).join('')}
      </tbody>`;
  };

  /* Same idiom as the article page's [data-auth-compare]: add a class once the
     element scrolls in, and skip straight to the end state under reduced
     motion. The stagger itself is a CSS transition-delay per row. */
  const revealOnScroll = (el) => {
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

  const renderList = (d) => {
    setText('[data-sdk-list-heading]', d.sdksHeading);
    setText('[data-sdk-list-lead]', d.sdksLead);
    const grid = root.querySelector('[data-sdk-list]');
    if (!grid) return;
    grid.innerHTML = (d.sdks || [])
      .map((s) => `
        <li class="sdk-card">
          <h3 class="sdk-card__name">${escapeText(s.name)}</h3>
          <p class="sdk-card__body">${escapeText(s.body)}</p>
          <ul class="sdk-card__platforms">
            ${(s.platforms || []).map((p) => `<li>${escapeText(p)}</li>`).join('')}
          </ul>
          <div class="sdk-card__actions">
            <a class="sdk-card__link" href="${escapeText(s.href || '#contact')}">Read more</a>
            <a class="sdk-card__link sdk-card__link--muted" href="#contact">Talk with Sales</a>
          </div>
        </li>`)
      .join('');
  };

  const renderCta = (d) => {
    setText('[data-sdk-cta-heading]', d.ctaHeading);
    setText('[data-sdk-cta-body]', d.ctaBody);
    const actions = root.querySelector('[data-sdk-cta-actions]');
    if (actions) {
      actions.innerHTML = (d.ctaActions || []).map((a) => button(a, a.variant)).join('');
    }
  };

  const applyMeta = (d) => {
    if (d.seoTitle) document.title = d.seoTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && d.seoDescription) meta.setAttribute('content', d.seoDescription);
  };

  fetch(SOURCE)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load SDK content: ${r.status}`);
      return r.json();
    })
    .then((d) => {
      applyMeta(d);
      renderHero(d);
      renderFeatures(d);
      renderCompare(d);
      renderList(d);
      renderCta(d);
      revealOnScroll(root.querySelector('[data-sdk-compare]'));
      // The headline is injected after display1-reveal.js has already run its
      // initial pass, so re-observe it here or it never animates in.
      const title = root.querySelector('[data-sdk-title]');
      if (title) window.ScytalesDisplay1Reveal?.observe?.(title);
    })
    .catch((err) => {
      console.error('[sdks]', err);
      setText('[data-sdk-title]', 'Build with Scytáles SDKs');
    });
})();
