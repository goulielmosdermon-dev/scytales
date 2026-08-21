/* Hover scramble — the character the cursor passes over flips to a random
   symbol and then flips back. One character at a time: the rest of the
   line is never touched.

   Every character is wrapped in its own inline span so the pointer has
   something per-glyph to hit. Spaces are left as plain text, so word
   shapes and line breaks are unchanged, and the wrapping happens inside
   the existing markup — the hero's word spans and their reveal animation
   are untouched. */
(() => {
  const CHARS = '!<>-_\\/[]{}—=+*^?#$%&@§±~|;:';
  const CHAR_CLASS = 'scramble-char';
  const WORD_CLASS = 'scramble-word';
  const HOLD_MS = 380;      /* how long the symbol stands before it flips back */
  const PREP_ATTR = 'data-scramble-ready';

  const prefersReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const randomChar = (not) => {
    let out = not;
    while (out === not) out = CHARS[(Math.random() * CHARS.length) | 0];
    return out;
  };

  /* Split every text node into one span per character. Runs once. */
  const prepare = (el) => {
    if (el.getAttribute(PREP_ATTR) === '1') return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim()) nodes.push(node);
    }

    nodes.forEach((textNode) => {
      const frag = document.createDocumentFragment();
      /* Characters are inline-blocks, and a line can break between any two
         of them — which split words mid-stem ("ge / neration"). Each word
         is therefore wrapped in its own nowrap box, so breaks can only
         happen at the spaces, exactly as they would in plain text. */
      textNode.textContent.split(/(\s+)/).forEach((chunk) => {
        if (!chunk) return;
        if (!chunk.trim()) {
          frag.appendChild(document.createTextNode(chunk));
          return;
        }
        const word = document.createElement('span');
        word.className = WORD_CLASS;
        [...chunk].forEach((char) => {
          const span = document.createElement('span');
          span.className = CHAR_CLASS;
          span.textContent = char;
          word.appendChild(span);
        });
        frag.appendChild(word);
      });
      textNode.replaceWith(frag);
    });

    el.setAttribute(PREP_ATTR, '1');
    lockWidths(el);
  };

  /* Symbols are narrower than letters in a proportional face, so a flip
     would reflow the line. Each span is pinned to the width of its own
     letter — measured once the display face has actually loaded.

     The pin is in px, so it is only right for the face it was measured
     against: swapping the family (the Font Lab does exactly that) leaves
     every glyph in a box sized for the old one, and a wider face then
     overlaps its neighbours. Hence remeasure(), and the listeners at the
     bottom of the file that call it. */
  const prepared = new Set();

  const measure = (el) => {
    const spans = [...el.querySelectorAll(`.${CHAR_CLASS}`)];
    spans.forEach((span) => { span.style.width = ''; });

    /* Read every width before writing any, or each write invalidates the
       layout for the next read. */
    const widths = spans.map((span) => span.getBoundingClientRect().width);
    /* Stored in em, not px: the statement band is fitted to its measure by
       js/line-reveal.js, which changes font-size after this runs. A px pin
       would keep the boxes at the old size and push the line off the right
       edge; an em pin scales with the type. */
    const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
    spans.forEach((span, i) => {
      span.style.width = `${(widths[i] / fontSize).toFixed(4)}em`;
    });
  };

  const lockWidths = (el) => {
    prepared.add(el);
    if (document.fonts?.ready) document.fonts.ready.then(() => measure(el));
    else measure(el);
  };

  const remeasure = () => {
    prepared.forEach((el) => {
      if (el.isConnected) measure(el);
      else prepared.delete(el);
    });
  };

  const wire = (el) => {
    if (prefersReduced) return;
    prepare(el);

    /* Delegated: pointerover fires per character as the cursor crosses it,
       and survives the spans being rewritten. */
    el.addEventListener('pointerover', (event) => {
      const span = event.target.closest?.(`.${CHAR_CLASS}`);
      if (!span || !el.contains(span)) return;
      if (span.dataset.busy === '1') return;

      const original = span.dataset.char || span.textContent;
      span.dataset.char = original;
      span.dataset.busy = '1';
      span.textContent = randomChar(original);
      /* Face and colour ride on the class and drop away with it when the
         character flips back; the colour itself is per-section CSS. */
      span.classList.add('is-scrambled');

      setTimeout(() => {
        span.textContent = span.dataset.char;
        span.classList.remove('is-scrambled');
        delete span.dataset.busy;
      }, HOLD_MS);
    });
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-scramble]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  /* The Font Lab fires this after it swaps a family or weight. */
  window.addEventListener('scytales:fonts-changed', remeasure);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(remeasure, 150);
  });

  window.ScytalesTextScramble = { init, remeasure };
})();
