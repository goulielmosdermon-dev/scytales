/* Hero product compose — browser animates on first load (already in view);
   POS + ID wait for scroll before fading/sliding in. */
(() => {
  const stage = document.querySelector('[data-compose-reveal]');
  if (!stage) return;

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const revealBrowser = () => {
    stage.classList.add('is-browser-in');
  };

  const revealRest = () => {
    stage.classList.add('is-in');
  };

  if (prefersReduced) {
    revealBrowser();
    revealRest();
    return;
  }

  /* Double rAF so the opacity:0 paint lands before we flip — otherwise the
     browser pops in with no transition on hard refresh. */
  requestAnimationFrame(() => {
    requestAnimationFrame(revealBrowser);
  });

  const stageInView = () => {
    const rect = stage.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.85 && rect.bottom > 40;
  };

  let done = false;
  const tryRevealRest = () => {
    if (done || !stageInView()) return;
    done = true;
    revealRest();
    window.removeEventListener('scroll', onScroll);
    io?.disconnect();
  };

  /* If the stage is already on screen at load, hold POS + ID until the user
     scrolls. If it starts below the fold, reveal when it enters. */
  const initiallyVisible = stageInView();

  const onScroll = () => {
    if (initiallyVisible || window.scrollY > 8) tryRevealRest();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  let io = null;
  if (!initiallyVisible && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tryRevealRest();
        });
      },
      { threshold: 0.28, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(stage);
  } else if (!initiallyVisible) {
    tryRevealRest();
  }
})();
