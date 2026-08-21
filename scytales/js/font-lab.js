/* Font Lab — frozen Aug 2026.
   Desktop Font Lab settings are baked into shared/tokens.css. This file
   re-applies them on every load (so stale localStorage cannot diverge)
   and never mounts UI. Body face: Cascadia Code Light. */
(() => {
  const STORAGE = 'scytales-font-lab-2';

  /* Snapshot — must stay in step with shared/tokens.css. */
  const FROZEN = {
    open: false,
    display: 'agrandir',
    head: 'agrandir',
    body: 'cascadia',
    fwBody: 300,
    linkBoth: true,
    lhDisplay: 1.12,
    lsDisplay: 0.01,
    lhHead: 1.1,
    lsHead: -0.01,
    lhHero: 0.92,
    lsHero: 0.003,
    fwDisplay: 400,
    fwHead: 400,
  };

  const BODY =
    '"Cascadia Code", ui-monospace, SFMono-Regular, Menlo, monospace';
  const DISPLAY =
    '"PP Agrandir", "Helvetica Neue", Arial, sans-serif';

  const apply = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--font-display', DISPLAY);
    doc.style.setProperty('--font-head', DISPLAY);
    doc.style.setProperty('--font-body', BODY);
    doc.style.setProperty('--display-1-stroke', '0');
    doc.style.setProperty('--fw-display', String(FROZEN.fwDisplay));
    doc.style.setProperty('--fw-head', String(FROZEN.fwHead));
    doc.style.setProperty('--fw-body', String(FROZEN.fwBody));
    doc.style.setProperty('--lh-display', String(FROZEN.lhDisplay));
    doc.style.setProperty('--ls-display', `${FROZEN.lsDisplay}em`);
    doc.style.setProperty('--lh-head', String(FROZEN.lhHead));
    doc.style.setProperty('--ls-head', `${FROZEN.lsHead}em`);
    doc.style.setProperty('--hero-lh', String(FROZEN.lhHero));
    doc.style.setProperty('--hero-ls', `${FROZEN.lsHero}em`);
    doc.style.setProperty('--fs-scale-display', '1');
    doc.style.setProperty('--fs-scale-head', '1');
    doc.style.setProperty('--fs-scale-body', '0.94');
  };

  try {
    localStorage.setItem(STORAGE, JSON.stringify(FROZEN));
  } catch {
    /* ignore quota / private mode */
  }

  apply();

  const fire = () => window.dispatchEvent(new CustomEvent('scytales:fonts-changed'));
  if (document.fonts?.ready) document.fonts.ready.then(fire);
  else fire();
})();
