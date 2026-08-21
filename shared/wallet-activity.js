/* Wallet activity — CMS-driven metrics; capsule waveform bars scale to chartMax and grow on open */
(() => {
  const DEFAULT = {
    title: 'Activity',
    primaryLabel: 'Primary',
    secondaryLabel: 'Secondary',
    totalLabel: 'Total activity',
    totals: { primary: 0, secondary: 0, total: 0 },
    chartMax: 0,
    months: [
      { label: 'Jan', primary: 40, secondary: 50 },
      { label: 'Feb', primary: 42, secondary: 55 },
      { label: 'Mar', primary: 45, secondary: 60 },
      { label: 'Apr', primary: 48, secondary: 62 },
      { label: 'May', primary: 44, secondary: 58 },
      { label: 'Jun', primary: 38, secondary: 40 },
      { label: 'Jul', primary: 36, secondary: 42 },
      { label: 'Aug', primary: 50, secondary: 70 },
      { label: 'Sep', primary: 46, secondary: 65 },
      { label: 'Oct', primary: 52, secondary: 55 },
      { label: 'Nov', primary: 48, secondary: 58 },
      { label: 'Dec', primary: 44, secondary: 60 },
    ],
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const format = (n) => Math.round(n).toLocaleString('en-US');

  const easeOutCubic = (t) => 1 - (1 - t) ** 3;

  const readConfig = (root) => {
    const raw = root.getAttribute('data-wa-config');
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const months = (Array.isArray(parsed?.months) && parsed.months.length
      ? parsed.months
      : DEFAULT.months
    ).map((m) => ({
      label: m.label,
      primary: Number(m.primary ?? m.creds ?? 0),
      secondary: Number(m.secondary ?? m.verify ?? 0),
    }));

    const totals = {
      primary: Number(parsed?.totals?.primary ?? DEFAULT.totals.primary),
      secondary: Number(parsed?.totals?.secondary ?? DEFAULT.totals.secondary),
      total: Number(parsed?.totals?.total ?? DEFAULT.totals.total),
    };
    if (!totals.total) totals.total = totals.primary + totals.secondary;

    const localMax = Math.max(1, ...months.map((m) => m.primary + m.secondary));
    const chartMax = Math.max(Number(parsed?.chartMax) || 0, localMax);

    return {
      title: parsed?.title || DEFAULT.title,
      primaryLabel: parsed?.primaryLabel || DEFAULT.primaryLabel,
      secondaryLabel: parsed?.secondaryLabel || DEFAULT.secondaryLabel,
      totalLabel: parsed?.totalLabel || DEFAULT.totalLabel,
      totals,
      chartMax,
      months,
    };
  };

  function animateValue(el, to, duration = 700) {
    if (!el) return;
    if (reduce) {
      el.textContent = format(to);
      return;
    }
    const from = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(from + (to - from) * easeOutCubic(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function build(root) {
    if (root.dataset.waReady) return;
    root.dataset.waReady = '1';

    const config = readConfig(root);

    root.innerHTML = `
      <h3 class="wallet-activity__title">${config.title}</h3>
      <div class="wallet-activity__summary">
        <div class="wallet-activity__metric">
          <p class="wallet-activity__label">
            <span class="wallet-activity__swatch wallet-activity__swatch--creds" aria-hidden="true"></span>
            ${config.primaryLabel}
          </p>
          <p class="wallet-activity__value" data-wa-value="primary">0</p>
        </div>
        <div class="wallet-activity__metric">
          <p class="wallet-activity__label">
            <span class="wallet-activity__swatch wallet-activity__swatch--verify" aria-hidden="true"></span>
            ${config.secondaryLabel}
          </p>
          <p class="wallet-activity__value" data-wa-value="secondary">0</p>
        </div>
        <div class="wallet-activity__metric">
          <p class="wallet-activity__label">${config.totalLabel}</p>
          <p class="wallet-activity__value" data-wa-value="total">0</p>
        </div>
      </div>
      <div class="wallet-activity__chart" role="img" aria-label="${config.title} activity chart">
        ${config.months.map((m, i) => {
          const stack = m.primary + m.secondary;
          const barH = Math.min(100, (stack / config.chartMax) * 100);
          const delay = reduce ? 0 : i * 40;
          return `
            <div class="wallet-activity__col">
              <div class="wallet-activity__bar" style="--bar-h:${barH.toFixed(2)}%; transition-delay:${delay}ms"></div>
              <span class="wallet-activity__month">${m.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const values = {
      primary: root.querySelector('[data-wa-value="primary"]'),
      secondary: root.querySelector('[data-wa-value="secondary"]'),
      total: root.querySelector('[data-wa-value="total"]'),
    };

    let playing = false;

    const play = () => {
      root.classList.remove('is-ready');
      values.primary.textContent = '0';
      values.secondary.textContent = '0';
      values.total.textContent = '0';
      void root.offsetWidth;
      requestAnimationFrame(() => {
        root.classList.add('is-ready');
        animateValue(values.primary, config.totals.primary, 780);
        animateValue(values.secondary, config.totals.secondary, 860);
        animateValue(values.total, config.totals.total, 920);
      });
    };

    root.addEventListener('pointerenter', () => {
      if (playing) return;
      playing = true;
      play();
      window.setTimeout(() => { playing = false; }, 1000);
    });

    /* Grow bars + count up when the sheet mounts */
    requestAnimationFrame(() => {
      requestAnimationFrame(play);
    });
  }

  function init(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-wallet-activity]').forEach(build);
  }

  window.ScytalesWalletActivity = { init };

  init(document);
})();
