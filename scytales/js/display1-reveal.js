/* Word-by-word reveal for every .display-1 (same motion as the hero). */
(() => {
  const WORD_CLASS = 'display-1__word';
  const REVEAL_CLASS = 'display-1--reveal';
  const READY_CLASS = 'is-revealed';
  const PREP_ATTR = 'data-display1-prepared';

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const wrapWords = (el) => {
    const hasWords = !!el.querySelector(`.${WORD_CLASS}`);
    if (el.getAttribute(PREP_ATTR) === '1' && hasWords) return;

    if (hasWords) {
      [...el.querySelectorAll(`.${WORD_CLASS}`)].forEach((word, i) => {
        word.style.setProperty('--word-i', String(i));
      });
      el.setAttribute(PREP_ATTR, '1');
      el.classList.add(REVEAL_CLASS);
      return;
    }

    el.removeAttribute(PREP_ATTR);

    const frag = document.createDocumentFragment();
    let wordIndex = 0;

    const pushWord = (html) => {
      const span = document.createElement('span');
      span.className = WORD_CLASS;
      span.style.setProperty('--word-i', String(wordIndex++));
      span.innerHTML = html;
      frag.appendChild(span);
    };

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return;
          pushWord(part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        });
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName.toLowerCase();
      if (tag === 'br') {
        frag.appendChild(document.createElement('br'));
        return;
      }

      if (node.classList?.contains('u-accent') || tag === 'span') {
        const text = node.textContent.trim();
        if (!text) return;
        const inner = node.outerHTML;
        if (!/\s/.test(text) || node.classList?.contains('u-accent')) {
          pushWord(inner);
          return;
        }
      }

      [...node.childNodes].forEach(walk);
    };

    [...el.childNodes].forEach(walk);
    el.replaceChildren(frag);
    el.classList.add(REVEAL_CLASS);
    el.setAttribute(PREP_ATTR, '1');
  };

  const play = (el) => {
    if (prefersReduced) {
      el.classList.add(READY_CLASS);
      return;
    }
    el.classList.remove(READY_CLASS);
    void el.offsetWidth;
    el.classList.add(READY_CLASS);
  };

  const schedulePlay = (el) => {
    if (prefersReduced) {
      play(el);
      return;
    }

    const alreadyPlaying =
      el.classList.contains(READY_CLASS) && !!el.querySelector(`.${WORD_CLASS}`);
    if (alreadyPlaying) return;

    const scrollRoot = el.closest('.product-sheet') || null;
    const rect = el.getBoundingClientRect();
    const rootRect = scrollRoot?.getBoundingClientRect();
    const topBound = rootRect ? rootRect.top : 0;
    const viewH = rootRect ? rootRect.height : window.innerHeight;
    const inView =
      rect.bottom > topBound &&
      rect.top < topBound + viewH * 0.92;

    if (inView) {
      requestAnimationFrame(() => play(el));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          play(entry.target);
          io.unobserve(entry.target);
        });
      },
      {
        root: scrollRoot,
        threshold: 0.28,
        rootMargin: '0px 0px -8% 0px',
      }
    );
    io.observe(el);
  };

  const observe = (el) => {
    wrapWords(el);
    schedulePlay(el);
  };

  /* [data-display1-skip] opts an element out of the word split — used by
     anything that runs its own motion, e.g. js/line-reveal.js. */
  const init = (scope = document) => {
    scope
      .querySelectorAll('.display-1:not([data-display1-skip])')
      .forEach(observe);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.ScytalesDisplay1Reveal = { init, observe };
})();
