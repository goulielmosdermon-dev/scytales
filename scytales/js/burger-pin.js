/* Once the first section is behind you, the burger comes back.

   The nav scrolls away with the page, so past the fold there is no way
   into the menu. This lifts the burger — the same button, not a copy, so
   its aria state and the menu wiring stay in one place — out of the bar
   and pins it to the top right, fading it in.

   The trigger is the bottom of the first section rather than a fixed
   distance: pages differ, and the intent is "past the first section". A
   sentinel element is watched instead of the scroll event so the browser
   does the work off the main thread. */
(() => {
  const wire = () => {
    const nav = document.querySelector('[data-nav]');
    const burger = nav?.querySelector('.nav__burger');
    if (!nav || !burger || nav.dataset.burgerPin) return;
    nav.dataset.burgerPin = '1';

    /* The first thing after the nav: the hero, the product hero, whatever
       the page leads with. */
    const main = document.querySelector('main') || document.body;
    const first =
      [...main.children].find((el) => el.offsetHeight > 0) || main;

    /* Take the ground of whatever is behind the button, so the square
       reads as a hole cut in the section rather than a chip sitting on
       top of it. Sampling the live background beats tagging every section
       with a colour: bands get restyled, and this cannot fall out of step.
       The button is made transparent to hit-testing for the moment of the
       sample, or elementFromPoint would just return the button itself. */
    const OPAQUE = /^rgba?\((?:[^,]+,){3}\s*0\s*\)$|^transparent$/;

    const groundBehind = () => {
      const r = burger.getBoundingClientRect();
      const prev = burger.style.pointerEvents;
      burger.style.pointerEvents = 'none';
      let el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      burger.style.pointerEvents = prev;
      while (el && el !== document.documentElement) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && !OPAQUE.test(bg)) return bg;
        el = el.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const luminance = (rgb) => {
      const m = rgb.match(/[\d.]+/g);
      if (!m) return 1;
      const [r, g, b] = m.slice(0, 3).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };

    let matchRaf = 0;
    const matchGround = () => {
      if (matchRaf) return;
      matchRaf = requestAnimationFrame(() => {
        matchRaf = 0;
        if (!document.body.classList.contains('is-burger-pinned')) return;
        const bg = groundBehind();
        burger.style.background = bg;
        /* The bars and the square border are currentColor, so one value
           keeps both legible against whatever we just took. */
        burger.style.color = luminance(bg) < 0.6 ? '#fff' : 'var(--orange-500)';
      });
    };

    const setPinned = (on) => {
      document.body.classList.toggle('is-burger-pinned', on);
      if (on) matchGround();
      else {
        burger.style.background = '';
        burger.style.color = '';
      }
    };

    window.addEventListener('scroll', matchGround, { passive: true });
    window.addEventListener('resize', matchGround);

    if ('IntersectionObserver' in window) {
      /* Fires when the section's bottom edge passes the top of the
         viewport: the section is no longer intersecting and it sits
         above, not below. */
      new IntersectionObserver(
        ([entry]) => {
          const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          setPinned(past);
        },
        { threshold: 0 }
      ).observe(first);
    } else {
      const onScroll = () => setPinned(window.scrollY > first.offsetHeight);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }

  /* The nav is injected by js/site-nav.js on most pages. */
  window.addEventListener('scytales:nav-ready', wire);
  document.addEventListener('scytales:nav-ready', wire);
  window.ScytalesBurgerPin = { init: wire };
})();
