/* Customer stories — pinned, cross-fading stack.

   The section is deliberately tall. While it is on screen its .stories__pin
   sticks to the top of the viewport and the page's vertical scroll steps
   the cases through their beats; once the last one has played and the
   newsroom link has appeared, the section releases and the page scrolls on
   as normal. Nothing translates sideways — the cases are stacked and
   cross-fade.

   Each case plays four beats, carried on data-phase (the CSS owns every
   transition — this file only says which beat is current):

     1  the figure alone, centred
     2  the figure leaves
     3  the headline and body fade up together, centred
     4  they fade out, and the next case takes their place

   Scrolling back rewinds the same sequence. Nothing here is required for
   the content to be readable: the markup ships fully populated, and the
   .is-rail class the phase styles hang off is only added by this file.

   The rail runs on every viewport (phones included). Prefer-reduced-motion
   keeps the static stacked fallback. */
(() => {
  const root = document.querySelector('[data-stories-rail]');
  if (!root) return;

  const stack = root.querySelector('[data-stories-stack]');
  const foot = root.querySelector('[data-stories-foot]');
  const cases = [...root.querySelectorAll('[data-story-case]')];
  const dots = [...root.querySelectorAll('.stories__progress-dot')];
  const intro = root.querySelector('[data-stories-intro]');
  if (!stack || cases.length < 2) return;

  /* Where in a case's own share of the scroll each beat begins. The gaps
     are the reading pauses, and both are long on purpose: the figure holds
     for a third of the case before it leaves, and the headline and body
     hold for another third before the exit. */
  const PHASE_AT = [0.04, 0.40, 0.47, 0.86];

  /* The title's share of the scroll, as a fraction of one case's share.
     Not 1: a case spends its share on four beats, so its headline is only
     on screen for the gap between beats 3 and 4. Matching that gap is what
     makes the title dwell for as long as a story does — giving the title a
     whole share left it sitting there roughly two and a half times longer
     than anything that followed it. */
  const INTRO_SHARE = PHASE_AT[3] - PHASE_AT[2];

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

  const phaseFor = (local) => {
    let phase = 0;
    PHASE_AT.forEach((at, i) => {
      if (local >= at) phase = i + 1;
    });
    return phase;
  };

  /* ---- Per-frame layout ---------------------------------------------- */
  let raf = 0;

  const paint = () => {
    raf = 0;

    if (!root.classList.contains('is-rail')) return;

    const rect = root.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) return;

    /* 0 at the moment the section pins, 1 when it lets go. The title takes
       INTRO_SHARE of one case's share; the cases take one each. Measured in
       case-shares rather than fractions so the two are directly comparable. */
    const progress = clamp01(-rect.top / travel);
    const total = cases.length + INTRO_SHARE;
    const shares = progress * total;          /* how many case-shares in */

    const onIntro = shares < INTRO_SHARE;
    intro?.classList.toggle('is-on', onIntro);
    intro?.classList.toggle('is-past', !onIntro);

    const spread = clamp01((shares - INTRO_SHARE) / cases.length) * cases.length;
    const activeIndex = onIntro ? -1 : Math.min(cases.length - 1, Math.floor(spread));

    cases.forEach((caseEl, i) => {
      /* How far this case has advanced through its own share. */
      const caseLocal = onIntro ? 0 : clamp01(spread - i);
      const phase = i < activeIndex ? PHASE_AT.length : phaseFor(caseLocal);
      if (caseEl.dataset.phase !== String(phase)) {
        caseEl.dataset.phase = String(phase);
      }

    });

    dots.forEach((dot, i) => dot.classList.toggle('is-on', i === activeIndex));

    /* Last beat of all: the link to the newsroom, once case three is done. */
    const finished =
      activeIndex === cases.length - 1 &&
      clamp01(spread - activeIndex) >= PHASE_AT[PHASE_AT.length - 1];
    foot?.classList.toggle('is-on', finished);
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };

  /* ---- Enable / disable ---------------------------------------------- */
  const enable = () => {
    root.classList.add('is-rail');
    /* The track's height is these same shares, so the two can never drift:
       change INTRO_SHARE or add a case and the section resizes itself. */
    root.style.setProperty('--stories-shares', String(cases.length + INTRO_SHARE));
    kick();
  };

  const disable = () => {
    root.classList.remove('is-rail');
    cases.forEach((caseEl) => { caseEl.dataset.phase = '0'; });
    intro?.classList.remove('is-on', 'is-past');
    foot?.classList.remove('is-on');
  };

  const sync = () => (prefersReduced ? disable() : enable());

  /* Cream → orange the moment the pinned stage is genuinely on screen,
     and back again on the way out. Independent of the phase machinery. */
  const track = root.querySelector('.stories__track') || root;
  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        root.classList.toggle('is-warm', entry.isIntersecting);
      });
    },
    { threshold: 0, rootMargin: '-20% 0px -20% 0px' }
  ).observe(track);

  sync();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
})();
