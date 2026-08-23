/* First-visit loader — small Scytáles mark built from body-font code. */
(() => {
  'use strict';

  const STORAGE = 'scytales-code-loader-seen-v3';
  const VB_W = 1024;
  const VB_H = 752;
  const PATHS = [
    'M169.0 136.0 L740.0 136.0 L838.0 4.0 L317.0 4.0 C207.0 4.0 3.0 90.0 3.0 290.0 L3.0 472.0 L169.0 472.0 Z',
    'M855.0 616.0 L284.0 616.0 L186.0 748.0 L707.0 748.0 C817.0 748.0 1021.0 662.0 1021.0 462.0 L1021.0 280.0 L855.0 280.0 Z',
  ];

  const APPEAR_MS = 1400;
  const HOLD_MS = 2000;
  const DISAPPEAR_MS = 1400;
  const FADE_MS = 680;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const SNIPPETS = [
    'const wallet = await scytales.verify(',
    'function deriveCredential() {',
    'return eudi.sign(payload);',
    'if (mdl.trustChain) {',
    'nonce: crypto.randomUUID(),',
    'ageOver: threshold >= 18,',
    '=> issuer.bind(hardwareKey)',
    'class DigitalIdentity {',
    'export async function validate',
    'const reader = new NFCReader();',
    'privacy: { minimize: true }',
    'schema: "eu.eudi.pid.v1",',
    'await mValidator.read(doc);',
    'let credential = iso18013.issue',
    'for (const claim of pid) {',
    'reader.authenticate(session)',
    'trustFramework.verify(chain)',
    '}; // scytales digital id',
  ];

  const bodyType = () => {
    const root = getComputedStyle(document.documentElement);
    const family = root.getPropertyValue('--font-body').trim() || '"Cascadia Code", monospace';
    const weight = root.getPropertyValue('--fw-body').trim() || '300';
    const sizeRaw = root.getPropertyValue('--fs-body-md').trim() || '18px';
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;font-size:${sizeRaw}`;
    document.documentElement.appendChild(probe);
    const size = (parseFloat(getComputedStyle(probe).fontSize) || 17) * 0.5;
    probe.remove();
    return { family, weight, size };
  };

  const randChar = () => {
    const pool = 'abcdefghijklmnopqrstuvwxyz0123456789_{}();=<>/[]';
    return pool[(Math.random() * pool.length) | 0];
  };

  const lineText = (cols) => {
    let out = '';
    while (out.length < cols + 32) {
      out += SNIPPETS[(Math.random() * SNIPPETS.length) | 0];
      out += ' ';
    }
    return out;
  };

  const buildMask = (gridW, gridH) => {
    const sampleW = Math.max(gridW * 8, 512);
    const sampleH = Math.round(sampleW * (VB_H / VB_W));
    const off = document.createElement('canvas');
    off.width = sampleW;
    off.height = sampleH;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.fillStyle = '#000';
    octx.fillRect(0, 0, sampleW, sampleH);
    octx.fillStyle = '#fff';
    octx.scale(sampleW / VB_W, sampleH / VB_H);
    PATHS.forEach((d) => octx.fill(new Path2D(d)));

    const data = octx.getImageData(0, 0, sampleW, sampleH).data;
    const threshold = 0.22;
    const rows = [];

    for (let gy = 0; gy < gridH; gy += 1) {
      const y0 = Math.floor((gy * sampleH) / gridH);
      const y1 = Math.floor(((gy + 1) * sampleH) / gridH);
      const cells = [];
      for (let gx = 0; gx < gridW; gx += 1) {
        const x0 = Math.floor((gx * sampleW) / gridW);
        const x1 = Math.floor(((gx + 1) * sampleW) / gridW);
        let hits = 0;
        let total = 0;
        for (let y = y0; y < y1; y += 1) {
          for (let x = x0; x < x1; x += 1) {
            total += 1;
            if (data[(y * sampleW + x) * 4] > 40) hits += 1;
          }
        }
        if (total && hits / total >= threshold) cells.push(gx);
      }
      rows.push(cells);
    }
    return rows;
  };

  const navy = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--navy-800').trim() || '#080917';

  const run = async (options = {}) => {
    const {
      host = null,
      persistSeen = false,
      fadeOut = true,
      lockScroll = !host,
      loop = false,
    } = options;

    host?.querySelector('.code-loader')?.remove();
    if (host?._codeLoaderStop) host._codeLoaderStop();

    const root = document.createElement('div');
    root.className = 'code-loader';
    if (host) root.classList.add('code-loader--stage');
    root.setAttribute('data-code-loader', '');
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', 'Loading Scytáles');

    const canvas = document.createElement('canvas');
    canvas.className = 'code-loader__canvas';
    root.appendChild(canvas);

    if (lockScroll) document.documentElement.classList.add('is-code-loading');
    if (host) host.appendChild(root);
    else document.body.prepend(root);

    const { family, weight, size: fontSize } = bodyType();
    const FONT = `${weight} ${fontSize}px ${family}`;
    const CHAR_W = fontSize * 0.62;
    const LINE_H = fontSize * 1.2;

    const finish = () => {
      if (persistSeen) localStorage.setItem(STORAGE, '1');
      delete document.documentElement.dataset.codeLoaderPending;
      if (!host) document.documentElement.dataset.codeLoaderExit = '1';
      if (!fadeOut) {
        options.onDone?.();
        return;
      }
      root.classList.add('is-fading');
      if (lockScroll) document.documentElement.classList.remove('is-code-loading');
      window.setTimeout(() => {
        root.classList.add('is-done');
        root.remove();
        options.onDone?.();
        if (!host) window.dispatchEvent(new CustomEvent('scytales:code-loader-done'));
      }, FADE_MS);
    };

    /* Force layout so canvas CSS width resolves. */
    void root.offsetWidth;
    const cssW = Math.min(canvas.getBoundingClientRect().width || 420, 420);
    const cssH = Math.round(cssW * (VB_H / VB_W));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d');
    const bg = navy();

    if (document.fonts?.load) {
      try {
        await document.fonts.load(FONT);
      } catch {
        /* fallback */
      }
    }

    const gridCols = Math.ceil(cssW / CHAR_W);
    const gridRows = Math.ceil(cssH / LINE_H);
    const mask = buildMask(gridCols, gridRows);
    const rowLines = mask.map((cells) => (cells.length ? lineText(gridCols) : ''));
    const locked = mask.map(() => ({}));

    const clear = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);
    };

    const drawFinal = () => {
      clear();
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      for (let y = 0; y < gridRows; y += 1) {
        const cells = mask[y];
        if (!cells.length) continue;
        const text = rowLines[y];
        cells.forEach((x, i) => {
          locked[y][x] = text[i % text.length] || ' ';
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillText(locked[y][x], x * CHAR_W, y * LINE_H);
        });
      }
    };

    const drawAppear = (t) => {
      const activeRow = Math.min(gridRows - 1, Math.floor(t * gridRows));
      for (let y = 0; y < activeRow; y += 1) {
        const cells = mask[y];
        if (!cells.length) continue;
        const text = rowLines[y];
        cells.forEach((x, i) => {
          locked[y][x] = text[i % text.length] || ' ';
        });
      }

      clear();
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      for (let y = 0; y < gridRows; y += 1) {
        const cells = mask[y];
        if (!cells.length) continue;
        const text = rowLines[y];
        cells.forEach((x, i) => {
          const ch = text[i % text.length] || ' ';
          if (y < activeRow) {
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fillText(locked[y][x] || ch, x * CHAR_W, y * LINE_H);
          } else if (y === activeRow && t < 1) {
            ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.45})`;
            ctx.fillText(Math.random() < 0.55 ? randChar() : ch, x * CHAR_W, y * LINE_H);
          }
        });
      }
    };

    const drawDisappear = (t) => {
      const clearRow = Math.min(gridRows, Math.floor(t * gridRows));
      clear();
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      for (let y = 0; y < gridRows; y += 1) {
        const cells = mask[y];
        if (!cells.length) continue;
        if (y < clearRow) continue;
        const text = rowLines[y];
        cells.forEach((x, i) => {
          const ch = locked[y][x] || text[i % text.length] || ' ';
          if (y === clearRow && t < 1) {
            ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.45})`;
            ctx.fillText(Math.random() < 0.55 ? randChar() : ch, x * CHAR_W, y * LINE_H);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fillText(ch, x * CHAR_W, y * LINE_H);
          }
        });
      }
    };

    if (reduceMotion.matches && !host) {
      finish();
      return;
    }

    let raf = 0;
    let start = performance.now();
    let alive = true;
    let exiting = false;
    const cycle = APPEAR_MS + HOLD_MS + DISAPPEAR_MS;

    const frame = (now) => {
      if (!alive) return;
      const elapsed = loop ? (now - start) % cycle : now - start;

      if (elapsed < APPEAR_MS) {
        drawAppear(Math.min(1, elapsed / APPEAR_MS));
      } else if (elapsed < APPEAR_MS + HOLD_MS) {
        drawFinal();
      } else if (elapsed < APPEAR_MS + HOLD_MS + DISAPPEAR_MS) {
        drawDisappear(Math.min(1, (elapsed - APPEAR_MS - HOLD_MS) / DISAPPEAR_MS));
      } else if (loop) {
        /* cycle restarts via modulo */
      } else if (!exiting) {
        /* Shape gone — navy field fades, site shows through (no white). */
        exiting = true;
        alive = false;
        clear();
        finish();
        return;
      }

      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
    if (host) host._codeLoaderStop = stop;
    root._codeLoaderStop = stop;

    raf = requestAnimationFrame(frame);
  };

  window.scytalesCodeLoader = { run, APPEAR_MS, HOLD_MS, DISAPPEAR_MS, FADE_MS };

  const wireStage = (stage) => {
    const replay =
      stage.closest('.code-loader-doc, #mark-exact')?.querySelector('[data-code-loader-replay]') ||
      stage.parentElement?.querySelector('[data-code-loader-replay]');
    const play = () => {
      run({ host: stage, persistSeen: false, fadeOut: false, lockScroll: false, loop: true }).catch(
        () => stage.querySelector('.code-loader')?.remove()
      );
    };
    if (replay && !replay.dataset.loaderWired) {
      replay.dataset.loaderWired = '1';
      replay.addEventListener('click', play);
    }
    play();
  };

  if (document.querySelector('[data-code-loader-preview]')) {
    const boot = () => document.querySelectorAll('[data-code-loader-preview]').forEach(wireStage);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
    return;
  }

  const skip = () => {
    document.documentElement.classList.remove('is-code-loading');
    delete document.documentElement.dataset.codeLoaderPending;
    localStorage.setItem(STORAGE, '1');
    window.dispatchEvent(new CustomEvent('scytales:code-loader-done'));
  };

  const shouldPlay = !localStorage.getItem(STORAGE) && !reduceMotion.matches;
  if (shouldPlay) {
    document.documentElement.classList.add('is-code-loading');
    document.documentElement.dataset.codeLoaderPending = '1';
  } else {
    skip();
    return;
  }

  const start = () =>
    run({ persistSeen: true, fadeOut: true, lockScroll: true, loop: false })
      .then(() => {
        delete document.documentElement.dataset.codeLoaderPending;
      })
      .catch(skip);

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
