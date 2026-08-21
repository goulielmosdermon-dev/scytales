/* Stay Updated — CMS articles strip; lead syncs to active story */
(() => {
  const root = document.querySelector('[data-updates]');
  if (!root) return;

  const strip = root.querySelector('[data-updates-panels]');
  const prevBtn = root.querySelector('[data-updates-prev]');
  const nextBtn = root.querySelector('[data-updates-next]');
  const leadEl = root.querySelector('[data-updates-lead]');
  const ctaEl = root.querySelector('[data-updates-cta]');
  if (!strip) return;

  const INDEX_URL = 'content/articles/index.json?v=perm1';
  /** Curated Stay Updated lineup (CMS slugs, display order). */
  const FEATURED_SLUGS = [
    'facetec-and-scytales-enter-strategic-partnership',
    'performance-optimization-fast-and-efficient-mobile-id-validation',
    'comparing-different-authentication-methods-for-mobile-ids',
    'calculating-the-roi-of-implementing-mobile-id-solutions-for-businesses',
    'privacy-security-how-mobile-ids-protect-your-personal-information',
    'the-iso-mdl-standard-the-diamond-no-longer-in-the-rough',
    'mobile-driving-licence-standard-approved-and-published',
  ];
  /* Panel that starts open. Falls back to the first featured article. */
  const DEFAULT_SLUG = 'privacy-security-how-mobile-ids-protect-your-personal-information';
  const DURATION = 1100;
  const EASE = 'cubic-bezier(0.33, 0, 0.12, 1)';
  const TRANSITION = `flex-grow ${DURATION}ms ${EASE}, margin ${DURATION}ms ${EASE}`;
  const GROW_TRANSITION = `flex-grow ${DURATION}ms ${EASE}`;

  let panels = [];
  let articles = [];
  let grows = [];
  let active = 0;
  let animating = false;
  let len = 0;

  const articleHref = (slug) => `article.html?slug=${encodeURIComponent(slug)}`;

  /* On a phone the strip is ~300px wide, and the desktop decay curve leaves
     the trailing panels 1–5px wide — a hero with six slivers. Show three
     readable panels instead and drop the rest out of the flow. */
  const MOBILE = window.matchMedia('(max-width: 767px)');
  const MOBILE_GROWS = [3, 1.5, 1];
  const visibleCount = () => (MOBILE.matches ? Math.min(MOBILE_GROWS.length, len) : len);

  /** Hero-heavy decay curve sized to the article count. */
  const buildGrows = (n) => {
    if (n <= 0) return [];
    if (MOBILE.matches) {
      return Array.from({ length: n }, (_, i) => MOBILE_GROWS[i] ?? 0);
    }
    const out = [12.5];
    let v = 2.9;
    for (let i = 1; i < n; i += 1) {
      out.push(Math.max(0.11, v));
      v *= 0.52;
    }
    return out;
  };

  const growAt = (offset) => grows[Math.min(offset, grows.length - 1)] ?? 0.11;

  const escapeAttr = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');

  const syncCopy = (index) => {
    const a = articles[index];
    if (!a) return;
    if (leadEl) leadEl.textContent = a.excerpt || a.title;
    if (ctaEl) {
      ctaEl.href = articleHref(a.slug);
      ctaEl.setAttribute('aria-label', `Read more: ${a.title}`);
    }
  };

  const offsetOf = (n, base) => (n - base + len) % len;

  const gapPx = () => {
    const g = getComputedStyle(strip).gap || getComputedStyle(strip).columnGap || '12px';
    return parseFloat(g) || 12;
  };

  const clearCrush = (panel) => {
    panel.classList.remove('is-crushing');
    panel.style.maxWidth = '';
    panel.style.marginRight = '';
    panel.style.flexBasis = '';
  };

  const paint = (base, growForOffset) => {
    panels.forEach((panel, n) => {
      const offset = offsetOf(n, base);
      panel.dataset.offset = String(offset);
      panel.style.order = String(offset);
      panel.style.flexGrow = String(growForOffset(offset, n));
      panel.classList.toggle('is-active', offset === 0);
      panel.classList.toggle('is-offstage', offset >= visibleCount());
      panel.setAttribute('aria-pressed', String(offset === 0));
      panel.tabIndex = 0;
    });
    syncCopy(base);
  };

  const applyFinal = (base) => {
    panels.forEach(clearCrush);
    paint(base, (offset) => growAt(offset));
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const setActive = async (index, direction = 0) => {
    const next = ((index % len) + len) % len;
    if (next === active || animating) return;

    animating = true;
    const prev = active;
    const distFwd = (next - prev + len) % len;
    const distBack = (prev - next + len) % len;
    const forward = direction > 0 || (direction === 0 && distFwd <= distBack);
    const steps = forward ? distFwd : distBack;

    panels.forEach((p) => {
      p.style.transition = TRANSITION;
    });

    if (steps === 1 && forward) {
      const gap = gapPx();
      panels.forEach((panel, n) => {
        const oldOff = offsetOf(n, prev);
        if (oldOff === 0) {
          const w = panel.getBoundingClientRect().width;
          panel.classList.add('is-crushing');
          panel.style.maxWidth = `${w}px`;
          panel.style.marginRight = '0px';
          panel.style.flexBasis = '0px';
        } else {
          clearCrush(panel);
          panel.style.flexGrow = String(growAt(oldOff - 1));
        }
      });
      await frame();
      panels.forEach((panel, n) => {
        const oldOff = offsetOf(n, prev);
        if (oldOff === 0) {
          panel.style.transition = `flex-grow ${DURATION}ms ${EASE}, max-width ${DURATION}ms ${EASE}, margin ${DURATION}ms ${EASE}`;
          panel.style.flexGrow = '0';
          panel.style.maxWidth = '0px';
          panel.style.marginRight = `${-gap}px`;
        }
      });

      await wait(DURATION);

      const crushed = panels.find((_, n) => offsetOf(n, prev) === 0);
      panels.forEach((p) => {
        p.style.transition = 'none';
      });

      active = next;
      // Place recycled panel at the right edge at zero width (no max-width→none tween).
      paint(active, (offset) => (offset === len - 1 ? 0 : growAt(offset)));

      if (crushed) {
        crushed.classList.add('is-crushing');
        crushed.style.flexGrow = '0';
        crushed.style.maxWidth = '0px';
        crushed.style.marginRight = '0px';
        crushed.style.flexBasis = '0px';
      }

      await frame();

      if (crushed) {
        // Animate only flex-grow into the trailing rail — avoids max-width:none lag.
        crushed.style.transition = GROW_TRANSITION;
        crushed.classList.remove('is-crushing');
        crushed.style.maxWidth = '';
        crushed.style.marginRight = '';
        crushed.style.flexBasis = '0px';
        crushed.style.flexGrow = String(growAt(len - 1));
      }

      panels.forEach((p) => {
        if (p !== crushed) p.style.transition = TRANSITION;
      });

      await wait(DURATION);
      if (crushed) crushed.style.transition = TRANSITION;
      animating = false;
      return;
    }

    if (steps === 1 && !forward) {
      panels.forEach((p) => {
        p.style.transition = 'none';
      });
      active = next;
      paint(active, (offset) => (offset === 0 ? 0 : growAt(offset)));
      const hero = panels.find((_, n) => offsetOf(n, active) === 0);
      if (hero) {
        hero.classList.add('is-crushing');
        hero.style.flexGrow = '0';
        hero.style.maxWidth = '0px';
        hero.style.marginRight = '0px';
      }
      await frame();
      panels.forEach((p) => {
        p.style.transition = p === hero ? GROW_TRANSITION : TRANSITION;
      });
      await frame();
      if (hero) {
        hero.classList.remove('is-crushing');
        hero.style.maxWidth = '';
        hero.style.marginRight = '';
        hero.style.flexBasis = '0px';
        hero.style.flexGrow = String(growAt(0));
      }
      await wait(DURATION);
      if (hero) hero.style.transition = TRANSITION;
      animating = false;
      return;
    }

    const dir = forward ? 1 : -1;
    animating = false;
    for (let s = 0; s < steps; s++) {
      await setActive(active + dir, dir);
    }
  };

  const bindPanels = () => {
    panels.forEach((panel, i) => {
      panel.addEventListener('click', () => {
        if (i === active) {
          const a = articles[i];
          if (a) location.href = articleHref(a.slug);
          return;
        }
        const fwd = (i - active + len) % len;
        const back = (active - i + len) % len;
        setActive(i, fwd <= back ? 1 : -1);
      });

      panel.addEventListener('pointerenter', () => {
        syncCopy(i);
      });
    });

    strip.addEventListener('pointerleave', () => {
      syncCopy(active);
    });
  };

  const build = async (list) => {
    const bySlug = new Map((list || []).map((a) => [a.slug, a]));
    articles = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean);
    len = articles.length;
    grows = buildGrows(len);
    if (!len) return;

    const startIndex = Math.max(0, articles.findIndex((a) => a.slug === DEFAULT_SLUG));

    const images = await Promise.all(
      articles.map((a) => window.ScytalesArticleImages?.resolve(a) || Promise.resolve(a.image || null))
    );

    strip.innerHTML = articles
      .map((a, i) => {
        const img = images[i];
        const bg = img ? ` style="background-image:url('${escapeAttr(img)}')"` : '';
        return `
        <button class="updates__panel${i === startIndex ? ' is-active' : ''}"
                type="button"
                data-updates-panel
                data-slug="${escapeAttr(a.slug)}"
                aria-pressed="${i === startIndex}"
                aria-label="${escapeAttr(a.title)}">
          <div class="updates__media"${bg} aria-hidden="true"></div>
        </button>`;
      })
      .join('');

    panels = [...strip.querySelectorAll('[data-updates-panel]')];
    bindPanels();
    panels.forEach((p) => {
      p.style.transition = TRANSITION;
    });
    active = startIndex;
    applyFinal(active);

    prevBtn?.addEventListener('click', () => setActive(active - 1, -1));
    nextBtn?.addEventListener('click', () => setActive(active + 1, 1));

    // Crossing the breakpoint swaps the curve, so re-lay the strip.
    MOBILE.addEventListener('change', () => {
      grows = buildGrows(len);
      applyFinal(active);
    });
  };

  fetch(INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error('Failed to load articles');
      return r.json();
    })
    .then((data) => build(data.articles || []))
    .catch((err) => console.error(err));
})();
