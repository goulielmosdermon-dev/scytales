/* Image Lab — drop a file on any <img> to replace it.
   · Overrides are keyed by the image's original path, so every instance of
     that asset swaps at once and the change survives page navigation.
   · Stored in IndexedDB (localStorage is far too small for image data).
   · Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z (or Ctrl+Y) redoes — across pages. */
(() => {
  'use strict';

  /* Dev-only tool — hide on deployed hosts */
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;

  const DB_NAME = 'scytales-image-lab';
  const DB_VERSION = 1;
  const STORE = 'overrides';
  const META = 'meta';
  const HISTORY_MAX = 30;
  const MAX_EDGE = 2000;      // px — long edge cap for re-encoded photos
  const RAW_LIMIT = 700 * 1024; // keep PNG/GIF under this untouched (alpha, animation)

  /* ---- IndexedDB ------------------------------------------- */
  let dbPromise = null;
  const db = () => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'key' });
          if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  };

  const tx = async (store, mode, fn) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req && 'result' in req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };

  const readAllOverrides = () => tx(STORE, 'readonly', (s) => s.getAll());
  const putOverride = (rec) => tx(STORE, 'readwrite', (s) => s.put(rec));
  const delOverride = (key) => tx(STORE, 'readwrite', (s) => s.delete(key));
  const clearOverrides = () => tx(STORE, 'readwrite', (s) => s.clear());
  const readMeta = (key) => tx(META, 'readonly', (s) => s.get(key));
  const writeMeta = (key, value) => tx(META, 'readwrite', (s) => s.put(value, key));

  /* ---- state ------------------------------------------------ */
  const overrides = new Map();   // key -> { key, src, name, ts }
  let undoLog = [];              // [{ key, prev, next, name }]
  let redoLog = [];
  let panel = null;

  /* An image is identified by its original path, normalised so that
     "assets/x.jpg" from /scytales/ and "./assets/x.jpg" collapse to one key. */
  const keyFor = (src) => {
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return null;
    try {
      const u = new URL(src, location.href);
      return u.origin === location.origin ? u.pathname.replace(/^\/+/, '') : u.href;
    } catch {
      return src;
    }
  };

  const shortName = (key) => key.split('/').pop() || key;

  /* ---- applying --------------------------------------------- */
  const originalOf = (img) => {
    if (!img.dataset.ilSrc) {
      const raw = img.getAttribute('src');
      if (!raw || raw.startsWith('data:')) return null;
      img.dataset.ilSrc = raw;
    }
    return img.dataset.ilSrc;
  };

  const patch = (img) => {
    const original = originalOf(img);
    if (!original) return;
    const key = keyFor(original);
    if (!key) return;
    const rec = overrides.get(key);
    if (rec) {
      if (img.getAttribute('src') !== rec.src) img.setAttribute('src', rec.src);
    } else if (img.getAttribute('src') !== original) {
      img.setAttribute('src', original);
    }
  };

  const patchAll = (scope = document) => {
    if (scope.tagName === 'IMG') patch(scope);
    scope.querySelectorAll?.('img').forEach(patch);
  };

  const patchKey = (key) => {
    document.querySelectorAll('img').forEach((img) => {
      const original = img.dataset.ilSrc || img.getAttribute('src');
      if (original && keyFor(original) === key) patch(img);
    });
  };

  /* ---- file → data URL --------------------------------------- */
  const readAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });

  /* SVGs stay vector; small PNG/GIF stay untouched so transparency and
     animation survive. Everything else is capped and re-encoded to JPEG. */
  const processFile = async (file) => {
    const keepRaw =
      file.type === 'image/svg+xml' ||
      ((file.type === 'image/png' || file.type === 'image/gif') && file.size <= RAW_LIMIT);
    if (keepRaw) return readAsDataURL(file);

    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Not a readable image'));
        el.src = url;
      });
      const scale = Math.min(1, MAX_EDGE / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * scale));
      const h = Math.max(1, Math.round(im.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Flatten onto white so a transparent source doesn't turn black in JPEG.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(im, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.86);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  /* ---- mutations -------------------------------------------- */
  const setValue = async (key, value, name) => {
    if (value) {
      const rec = { key, src: value, name: name || shortName(key), ts: Date.now() };
      overrides.set(key, rec);
      await putOverride(rec);
    } else {
      overrides.delete(key);
      await delOverride(key);
    }
    patchKey(key);
    renderPanel();
  };

  const pushHistory = async (op) => {
    undoLog.push(op);
    if (undoLog.length > HISTORY_MAX) undoLog.shift();
    redoLog = [];
    await writeMeta('undo', undoLog);
    await writeMeta('redo', redoLog);
  };

  const replaceImage = async (key, dataUrl, name) => {
    const prev = overrides.get(key)?.src || null;
    await setValue(key, dataUrl, name);
    await pushHistory({ key, prev, next: dataUrl, name });
    toast(`Replaced <b>${shortName(key)}</b> — ⌘Z to undo`);
  };

  const revert = async (key) => {
    const prev = overrides.get(key)?.src || null;
    if (!prev) return;
    await setValue(key, null);
    await pushHistory({ key, prev, next: null, name: shortName(key) });
    toast(`Restored <b>${shortName(key)}</b>`);
  };

  const undo = async () => {
    const op = undoLog.pop();
    if (!op) return false;
    redoLog.push(op);
    if (redoLog.length > HISTORY_MAX) redoLog.shift();
    await setValue(op.key, op.prev, op.name);
    await writeMeta('undo', undoLog);
    await writeMeta('redo', redoLog);
    toast(op.prev ? `Undo — <b>${op.name}</b> restored` : `Undo — <b>${op.name}</b> back to original`);
    return true;
  };

  const redo = async () => {
    const op = redoLog.pop();
    if (!op) return false;
    undoLog.push(op);
    if (undoLog.length > HISTORY_MAX) undoLog.shift();
    await setValue(op.key, op.next, op.name);
    await writeMeta('undo', undoLog);
    await writeMeta('redo', redoLog);
    toast(`Redo — <b>${op.name}</b>`);
    return true;
  };

  const resetAll = async () => {
    const keys = [...overrides.keys()];
    overrides.clear();
    await clearOverrides();
    undoLog = [];
    redoLog = [];
    await writeMeta('undo', undoLog);
    await writeMeta('redo', redoLog);
    keys.forEach(patchKey);
    renderPanel();
    toast('All images restored');
  };

  /* ---- toast ------------------------------------------------- */
  let toastEl = null;
  let toastTimer = 0;
  const toast = (html) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'image-lab-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = html;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2600);
  };

  /* ---- drop targeting ---------------------------------------- */
  /* Hit-tests every <img> rather than using elementFromPoint, because a lot
     of the site's imagery sits under `pointer-events: none`. Smallest hit
     wins, which resolves nested/overlapping images to the visible one. */
  const imgAtPoint = (x, y) => {
    let best = null;
    let bestArea = Infinity;
    document.querySelectorAll('img').forEach((img) => {
      if (!img.getClientRects().length) return;
      const r = img.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      const area = r.width * r.height;
      if (area > 0 && area <= bestArea) {
        bestArea = area;
        best = img;
      }
    });
    return best;
  };

  let hot = null;
  const setHot = (img) => {
    if (hot === img) return;
    hot?.classList.remove('il-hot');
    hot = img;
    hot?.classList.add('il-hot');
  };

  const dragHasFiles = (e) =>
    !!e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');

  document.addEventListener('dragover', (e) => {
    if (!dragHasFiles(e)) return;
    const img = imgAtPoint(e.clientX, e.clientY);
    setHot(img);
    // Always cancel: dropping anywhere would otherwise navigate to the file.
    e.preventDefault();
    e.dataTransfer.dropEffect = img ? 'copy' : 'none';
  });

  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) setHot(null);
  });

  document.addEventListener('drop', async (e) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    const img = imgAtPoint(e.clientX, e.clientY);
    setHot(null);
    if (!img) return;

    const file = [...(e.dataTransfer.files || [])].find((f) => f.type.startsWith('image/'));
    if (!file) {
      toast('That file is not an image');
      return;
    }
    const original = originalOf(img);
    const key = keyFor(original);
    if (!key) {
      toast('This image cannot be targeted');
      return;
    }
    try {
      const dataUrl = await processFile(file);
      await replaceImage(key, dataUrl, file.name);
    } catch (err) {
      console.error(err);
      toast(
        String(err && err.name) === 'QuotaExceededError'
          ? 'Out of storage — reset some images first'
          : 'Could not read that image'
      );
    }
  });

  /* ---- keyboard ---------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;

    const k = e.key.toLowerCase();
    const isRedo = (k === 'z' && e.shiftKey) || (k === 'y' && !e.metaKey);
    const isUndo = k === 'z' && !e.shiftKey;
    if (!isUndo && !isRedo) return;
    if (isUndo && !undoLog.length) return;
    if (isRedo && !redoLog.length) return;

    e.preventDefault();
    (isRedo ? redo : undo)();
  });

  /* ---- panel -------------------------------------------------- */
  const renderPanel = () => {
    if (!panel) return;
    const list = panel.querySelector('[data-il-list]');
    const empty = panel.querySelector('[data-il-empty]');
    if (!list && !empty) return;
    const toggle = panel.parentElement?.querySelector('[data-il-toggle]');
    const items = [...overrides.values()].sort((a, b) => b.ts - a.ts);

    if (toggle) {
      if (items.length) toggle.setAttribute('data-count', String(items.length));
      else toggle.removeAttribute('data-count');
    }
    if (empty) empty.hidden = items.length > 0;
    if (!list) return;
    list.innerHTML = items
      .map(
        (rec) => `
      <li class="image-lab__item">
        <img class="image-lab__thumb" src="${rec.src}" alt="">
        <span class="image-lab__name">${rec.key}</span>
        <button class="image-lab__revert" type="button" data-il-revert="${rec.key}"
          aria-label="Restore ${rec.key}">×</button>
      </li>`
      )
      .join('');
  };

  const buildPanel = () => {
    const root = document.createElement('aside');
    root.className = 'image-lab';
    root.setAttribute('data-image-lab', '');
    root.innerHTML = `
      <button class="image-lab__toggle" type="button" aria-expanded="false" data-il-toggle>Image Lab</button>
      <div class="image-lab__panel" data-il-panel hidden>
        <p class="image-lab__title">Image Lab</p>
        <p class="image-lab__hint">Drag an image file onto any picture on the page to replace it everywhere.
          <kbd>⌘Z</kbd> undo · <kbd>⇧⌘Z</kbd> redo. Saved locally in this browser.</p>
        <p class="image-lab__empty" data-il-empty>No replacements yet.</p>
        <ul class="image-lab__list" data-il-list></ul>
        <button class="image-lab__reset" type="button" data-il-reset>Restore all images</button>
      </div>
    `;
    document.body.appendChild(root);
    panel = root.querySelector('[data-il-panel]');

    const toggleBtn = root.querySelector('[data-il-toggle]');
    toggleBtn?.addEventListener('click', () => {
      const open = !root.classList.contains('is-open');
      root.classList.toggle('is-open', open);
      if (panel) panel.hidden = !open;
      toggleBtn.setAttribute('aria-expanded', String(open));
      if (!open) return;
      // The three labs share the right edge — only one panel at a time.
      document.querySelectorAll('[data-font-lab].is-open [data-font-lab-toggle], [data-color-lab].is-open [data-color-lab-toggle]')
        .forEach((btn) => btn.click());
    });

    root.addEventListener('click', (e) => {
      const rev = e.target.closest('[data-il-revert]');
      if (rev) {
        revert(rev.getAttribute('data-il-revert'));
        return;
      }
      if (e.target.closest('[data-il-reset]')) resetAll();
    });

    renderPanel();
  };

  /* ---- boot ---------------------------------------------------- */
  const observe = () => {
    new MutationObserver((records) => {
      records.forEach((r) => {
        r.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          patchAll(node);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };

  const boot = async () => {
    try {
      const [records, undoSaved, redoSaved] = await Promise.all([
        readAllOverrides(),
        readMeta('undo'),
        readMeta('redo'),
      ]);
      (records || []).forEach((rec) => overrides.set(rec.key, rec));
      undoLog = undoSaved || [];
      redoLog = redoSaved || [];
    } catch (err) {
      console.error('Image Lab: storage unavailable', err);
    }
    patchAll(document);
    buildPanel();
    observe();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.ScytalesImageLab = {
    undo,
    redo,
    resetAll,
    list: () => [...overrides.keys()],
    patchAll,
    /* For components that own their own drop zone (e.g. the authority grid)
       and need the replacement persisted rather than held in a blob URL. */
    applyFile: async (img, file) => {
      const key = keyFor(originalOf(img));
      if (!key) throw new Error('Image Lab: image cannot be targeted');
      await replaceImage(key, await processFile(file), file.name);
    },
  };
})();
