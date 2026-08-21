/* Typewriter — types a word character by character, holds, deletes it the
   same way, and moves to the next one, forever.

   Markup:  <span data-typewriter data-words='["One","Two"]'></span>

   The element is pinned to the width of its longest word (measured once
   the display face has loaded), so the line around it never reflows while
   the word changes. */
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

  /* No width is reserved: the word is set at its natural width and the
     centred headline re-flows around it, so the space before "safety,"
     is always a normal word space. Reserving the longest word's width
     instead parks short words against a fixed box and opens a gap. */

  const wire = (el) => {
    const words = readWords(el);
    if (!words.length) return;

    const textEl = document.createElement('span');
    textEl.className = 'typewriter__text';
    el.replaceChildren(textEl);

    if (prefersReduced) {
      textEl.textContent = words[0];
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

    setTimeout(step, TYPE_MS);
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-typewriter]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.ScytalesTypewriter = { init };
})();
