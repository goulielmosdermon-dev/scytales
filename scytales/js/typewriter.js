/* Typewriter — types a word character by character, holds, deletes it the
   same way, and moves to the next one, forever.

   Markup:  <span data-typewriter data-words='["One","Two"]'></span>

   On the home hero the cycling word is flex-laid with forced breaks
   (desktop: 2 lines; mobile: word alone, then 3 stacked lines). We size
   once for the longest word so the face doesn’t jump as shorter words
   type in. */
(() => {
  const TYPE_MS = 78;      /* per character, typing */
  const DELETE_MS = 42;    /* per character, deleting */
  const HOLD_MS = 2000;    /* the word stands this long once complete */
  const GAP_MS = 260;      /* blank beat before the next word types */

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const readWords = (el) => {
    try {
      const parsed = JSON.parse(el.getAttribute('data-words') || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  };

  const longestWord = (words) =>
    words.reduce((best, w) => (w.length > best.length ? w : best), '');

  /* Fit against the longest typewriter word, not the live string — otherwise
     the headline scales up and down as characters appear and vanish.
     Measure .hero__pair (word + “safety,”) with nowrap — flex-wrap on the
     h1 makes scrollWidth report the wrapped width, so “safety,” can drop
     under on mid-width screens without this. */
  const fitHeroHeadline = () => {
    const h1 = document.querySelector('.hero__lead .display-1');
    if (!h1) return;
    const lead = h1.closest('.hero__lead');
    if (!lead) return;

    const tw = h1.querySelector('[data-typewriter]');
    const textEl = tw?.querySelector('.typewriter__text');
    const pair = h1.querySelector('.hero__pair');
    const words = tw ? readWords(tw) : [];
    const probe = longestWord(words);
    const live = textEl ? textEl.textContent : '';

    h1.style.fontSize = '';
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const avail = Math.floor(lead.clientWidth * (mobile ? 0.94 : 0.96));
    if (avail <= 0) return;

    if (textEl && probe) textEl.textContent = probe;

    let need = 0;
    if (pair) {
      const prevWrap = pair.style.flexWrap;
      const prevWs = pair.style.whiteSpace;
      pair.style.flexWrap = 'nowrap';
      pair.style.whiteSpace = 'nowrap';
      need = pair.scrollWidth;
      pair.style.flexWrap = prevWrap;
      pair.style.whiteSpace = prevWs;
    } else {
      need = h1.scrollWidth;
    }

    if (textEl) textEl.textContent = live;

    if (need > avail) {
      const current = parseFloat(getComputedStyle(h1).fontSize);
      h1.style.fontSize = `${(current * avail) / need}px`;
    }
  };

  const wire = (el) => {
    const words = readWords(el);
    if (!words.length) return;

    const textEl = document.createElement('span');
    textEl.className = 'typewriter__text';
    el.replaceChildren(textEl);

    const inHero = !!el.closest('.hero__lead');

    if (prefersReduced) {
      textEl.textContent = words[0];
      if (inHero) fitHeroHeadline();
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const step = () => {
      const word = words[wordIndex];

      if (!deleting) {
        charIndex += 1;
        textEl.textContent = word.slice(0, charIndex);
        if (charIndex < word.length) return setTimeout(step, TYPE_MS);
        deleting = true;
        return setTimeout(step, HOLD_MS);
      }

      charIndex -= 1;
      textEl.textContent = word.slice(0, charIndex);
      if (charIndex > 0) return setTimeout(step, DELETE_MS);

      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      return setTimeout(step, GAP_MS);
    };

    /* Size for the longest word before the first tick paints a short one. */
    if (inHero) {
      textEl.textContent = longestWord(words);
      fitHeroHeadline();
      textEl.textContent = '';
    }

    setTimeout(step, TYPE_MS);
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-typewriter]').forEach(wire);
    fitHeroHeadline();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.addEventListener('resize', fitHeroHeadline);
  document.fonts?.ready?.then?.(fitHeroHeadline);

  window.ScytalesTypewriter = { init, fitHeroHeadline };
})();
