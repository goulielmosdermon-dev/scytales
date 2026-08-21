/* Section headings get the hero's word-by-word reveal on scroll into view.
   Homepage only — this file is linked from index.html and nowhere else.

   The motion is not reimplemented here. display1-reveal.js already splits an
   element into .display-1__word spans and stages them, and its stylesheet
   rules key off .display-1--reveal, not .display-1 — so any element can be
   handed to it. This file just decides which ones.

   .impact__title is deliberately NOT in the list: it is a .display-1, so
   that script picks it up on its own. Passing it again would restart the
   animation mid-flight. */
(() => {
  const SELECTOR = [
    '.products__title',
    '.stories__title',
    '.updates__title',
    '.testimonials__title',
  ].join(', ');

  const start = () => {
    const reveal = window.ScytalesDisplay1Reveal;
    const targets = [...document.querySelectorAll(SELECTOR)];
    if (!targets.length) return;

    /* If the shared reveal never loaded, leave the headings exactly as
       authored rather than hiding text we cannot animate. */
    if (!reveal?.observe) return;

    targets.forEach((el) => reveal.observe(el));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
