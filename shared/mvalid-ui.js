/* mValid tabs, NFC countdown, passport MRZ matrix — shared by styleguide + products stage */
(() => {
  'use strict';

  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
  const randGlyph = () => glyphs[(Math.random() * glyphs.length) | 0];

  const bindTabs = (scope) => {
    scope.querySelectorAll('[data-mvalid-tabs]').forEach((tabs) => {
      if (tabs.dataset.mvalidReady) return;
      tabs.dataset.mvalidReady = '1';
      tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.mvalid__tab');
        if (!tab || !tabs.contains(tab)) return;
        tabs.querySelectorAll('.mvalid__tab').forEach((el) => {
          el.classList.toggle('is-active', el === tab);
          el.setAttribute('aria-selected', el === tab ? 'true' : 'false');
        });
      });
    });
  };

  const bindTimers = (scope) => {
    scope.querySelectorAll('[data-mvalid-nfc-timer]').forEach((timerEl) => {
      if (timerEl.dataset.mvalidReady) return;
      timerEl.dataset.mvalidReady = '1';
      const numEl = timerEl.querySelector('[data-mvalid-nfc-timer-num]');
      if (!numEl) return;
      let secs = 53;
      const total = 60;
      const paint = () => {
        numEl.textContent = String(secs);
        const deg = (secs / total) * 360;
        timerEl.style.background = `conic-gradient(#EA6720 ${deg}deg, #EEF0F3 ${deg}deg)`;
      };
      paint();
      setInterval(() => {
        secs -= 1;
        if (secs < 0) secs = total;
        paint();
      }, 1000);
    });
  };

  const bindPassport = (scope) => {
    scope.querySelectorAll('.passport').forEach((root) => {
      if (root.dataset.mrzReady) return;
      root.dataset.mrzReady = '1';
      const lines = [...root.querySelectorAll('.passport__mrz-line[data-mrz]')];
      if (!lines.length) return;

      // Reset any cloned scrambled spans back to data-mrz source
      lines.forEach((line) => {
        const target = line.getAttribute('data-mrz') || '';
        line.textContent = '';
        [...target].forEach((ch) => {
          const span = document.createElement('span');
          span.dataset.final = ch;
          span.textContent = randGlyph();
          line.appendChild(span);
        });
      });

      let running = false;
      let visible = false;
      let frame = 0;
      let raf = 0;
      let loopTimer = 0;

      const tick = () => {
        frame += 1;
        let done = true;
        lines.forEach((line, lineIndex) => {
          const spans = line.children;
          const revealAt = Math.max(0, ((frame - lineIndex * 8) / 1.35) | 0);
          for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            if (i < revealAt) {
              if (!span.classList.contains('is-set')) {
                span.textContent = span.dataset.final;
                span.classList.add('is-set');
              }
            } else {
              done = false;
              span.classList.remove('is-set');
              if (frame % 2 === 0) span.textContent = randGlyph();
            }
          }
        });
        if (!done) raf = requestAnimationFrame(tick);
        else {
          running = false;
          if (visible) {
            clearTimeout(loopTimer);
            loopTimer = setTimeout(start, 2200);
          }
        }
      };

      const start = () => {
        if (!visible || running) return;
        running = true;
        frame = 0;
        lines.forEach((line) => {
          [...line.children].forEach((span) => {
            span.classList.remove('is-set');
            span.textContent = randGlyph();
          });
        });
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      };

      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
        clearTimeout(loopTimer);
      };

      if (!('IntersectionObserver' in window)) {
        visible = true;
        start();
        return;
      }

      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting && !root.hidden;
          if (visible) start();
          else stop();
        });
      }, { threshold: 0.2 });

      io.observe(root);

      const mo = new MutationObserver(() => {
        visible = !root.hidden && root.getClientRects().length > 0;
        if (visible) start();
        else stop();
      });
      mo.observe(root, { attributes: true, attributeFilter: ['hidden'] });

      // Product sheet clones start visible — kick once mounted
      requestAnimationFrame(() => {
        if (!root.hidden && root.getClientRects().length > 0) {
          visible = true;
          start();
        }
      });
    });
  };

  const init = (scope) => {
    const root = scope && scope.querySelectorAll ? scope : document;
    bindTabs(root);
    bindTimers(root);
    bindPassport(root);
  };

  window.ScytalesMvalidUi = { init };
  init(document);
})();
