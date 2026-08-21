/* ROI flowchart — scaled embed + click-to-enlarge */
(() => {
  const CANVAS_W = 2000;
  const CANVAS_H = 1250;

  const NODES = [
    { id: 'pill1', t: 'pill', x: 245, y: 55, w: 330, h: 58, text: 'Business Overview' },
    { id: 'd1', t: 'diamond', x: 310, y: 168, w: 200, h: 230, text: 'Is your business substantially dependable on secure authentication and verification processes?' },
    { id: 'no1', t: 'no', x: 170, y: 263, w: 36, h: 36, text: 'No' },
    { id: 'b1', t: 'box', x: 80, y: 415, w: 220, h: 158, text: 'Consider which alternative security options could better address your situation. If your business does not require high security levels or does not rely on handling personal information, a mobile ID solution might not be the most optimal cost-effective solution.' },
    { id: 'yes1', t: 'yes', x: 390, y: 474, w: 36, h: 36, text: 'Yes' },
    { id: 'd2', t: 'diamond', x: 310, y: 580, w: 200, h: 230, text: 'Are your users receptive to mobile ID technology adoption?' },
    { id: 'no2', t: 'no', x: 168, y: 684, w: 36, h: 36, text: 'No' },
    { id: 'b2', t: 'box', x: 80, y: 805, w: 220, h: 175, text: 'Perform a market analysis and assess customer needs. Conduct surveys or focus groups that can measure customers’ comfort with mobile technology and their willingness to use mobile IDs. Another important aspect is research industry trends and your competitors adoption rate.' },
    { id: 'yes2', t: 'yes', x: 390, y: 880, w: 36, h: 36, text: 'Yes' },

    { id: 'pill2', t: 'pill', x: 815, y: 55, w: 330, h: 58, text: 'Potential Benefits Evaluation' },
    { id: 'd3', t: 'diamond', x: 880, y: 168, w: 200, h: 230, text: 'Would mobile IDs ease the customer onboarding, transaction validation, or access restriction to services?' },
    { id: 'no3', t: 'no', x: 739, y: 263, w: 36, h: 36, text: 'No' },
    { id: 'b3', t: 'box', x: 655, y: 405, w: 220, h: 120, text: 'Re-evaluate the need for a mobile ID implementation if they offer minimal advantages. Consider other identification validation methods.' },
    { id: 'yes3', t: 'yes', x: 962, y: 456, w: 36, h: 36, text: 'Yes' },
    { id: 'b4', t: 'box', x: 878, y: 580, w: 212, h: 155, text: 'Consider the potential savings on costs and operational efficiency gains, taking into account the time and resources dedicated to these tasks. Estimate how mobile ID-based processes can reduce manual workload and free up your resources.' },
    { id: 'd4', t: 'diamond', x: 880, y: 775, w: 200, h: 230, text: 'Will mobile ID validation improve user experience?' },
    { id: 'no4', t: 'no', x: 739, y: 885, w: 36, h: 36, text: 'No' },
    { id: 'b5', t: 'box', x: 655, y: 1040, w: 215, h: 100, text: 'If mobiles IDs will probably not improve the UX significantly, weight the potential benefits against the costs of implementation.' },
    { id: 'yes4', t: 'yes', x: 962, y: 1083, w: 36, h: 36, text: 'Yes' },
    { id: 'b6', t: 'box', x: 1090, y: 1025, w: 220, h: 135, text: 'Consider the potential impact on customer satisfaction and loyalty. A faster and more convenient identification validation process can lead to increased customer satisfaction which would translate to brand advocacy.' },

    { id: 'pill3', t: 'pill', x: 1390, y: 55, w: 330, h: 58, text: 'Cost-Benefit Analysis' },
    { id: 'd5', t: 'diamond', x: 1455, y: 168, w: 200, h: 230, text: 'Can you quantify the potential cost savings and ROI?' },
    { id: 'no5', t: 'no', x: 1315, y: 263, w: 36, h: 36, text: 'No' },
    { id: 'b7', t: 'box', x: 1228, y: 395, w: 222, h: 125, text: 'While objectively quantifying some factors can be challenging, consider the qualitative benefits such as the security improvement and brand reputation.' },
    { id: 'yes5', t: 'yes', x: 1539, y: 456, w: 36, h: 36, text: 'Yes' },
    { id: 'b8', t: 'box', x: 1450, y: 590, w: 215, h: 140, text: 'Considering your operations costs saving analysis, the impact of reduced manual work and the potential for fraud prevention, estimate the overall costs savings. Assess the ratio of financial benefits to the initial investment.' },
    { id: 'final', t: 'pill', x: 1398, y: 810, w: 322, h: 72, text: 'Final Decision - Based on your overall evaluation, decide if a mobile ID system aligns with your business goals.' },
  ];

  const EDGES = [
    { from: 'pill1', fs: 'bottom', to: 'd1', ts: 'top' },
    { from: 'd1', fs: 'left', to: 'no1', ts: 'right' },
    { from: 'no1', fs: 'bottom', to: 'b1', ts: 'top' },
    { from: 'd1', fs: 'bottom', to: 'yes1', ts: 'top' },
    { from: 'yes1', fs: 'bottom', to: 'd2', ts: 'top' },
    { from: 'd2', fs: 'left', to: 'no2', ts: 'right' },
    { from: 'no2', fs: 'bottom', to: 'b2', ts: 'top' },
    { from: 'd2', fs: 'bottom', to: 'yes2', ts: 'top' },
    { from: 'yes2', fs: 'right', to: 'pill2', ts: 'left', via: [[628, 898], [628, 84]] },

    { from: 'pill2', fs: 'bottom', to: 'd3', ts: 'top' },
    { from: 'd3', fs: 'left', to: 'no3', ts: 'right' },
    { from: 'no3', fs: 'bottom', to: 'b3', ts: 'top' },
    { from: 'd3', fs: 'bottom', to: 'yes3', ts: 'top' },
    { from: 'yes3', fs: 'bottom', to: 'b4', ts: 'top' },
    { from: 'b4', fs: 'bottom', to: 'd4', ts: 'top' },
    { from: 'd4', fs: 'left', to: 'no4', ts: 'right' },
    { from: 'no4', fs: 'bottom', to: 'b5', ts: 'top' },
    { from: 'd4', fs: 'bottom', to: 'yes4', ts: 'top' },
    { from: 'yes4', fs: 'right', to: 'b6', ts: 'left' },
    { from: 'b6', fs: 'top', to: 'pill3', ts: 'left', fromOffset: 106, via: [[1196, 84]] },

    { from: 'pill3', fs: 'bottom', to: 'd5', ts: 'top' },
    { from: 'd5', fs: 'left', to: 'no5', ts: 'right' },
    { from: 'no5', fs: 'bottom', to: 'b7', ts: 'top' },
    { from: 'd5', fs: 'bottom', to: 'yes5', ts: 'top' },
    { from: 'yes5', fs: 'bottom', to: 'b8', ts: 'top' },
    { from: 'b8', fs: 'bottom', to: 'final', ts: 'top' },
  ];

  const SVGNS = 'http://www.w3.org/2000/svg';

  const anchor = (node, side, offset) => {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    switch (side) {
      case 'top': return { x: offset != null ? node.x + offset : cx, y: node.y };
      case 'bottom': return { x: offset != null ? node.x + offset : cx, y: node.y + node.h };
      case 'left': return { x: node.x, y: offset != null ? node.y + offset : cy };
      case 'right': return { x: node.x + node.w, y: offset != null ? node.y + offset : cy };
      default: return { x: cx, y: cy };
    }
  };

  const orthogonalize = (points, firstVertical) => {
    const out = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const p = out[out.length - 1];
      const q = points[i];
      if (p.x !== q.x && p.y !== q.y) {
        const vertFirst = i === 1 ? firstVertical : p.x === out[out.length - 2].x;
        out.push(vertFirst ? { x: p.x, y: q.y } : { x: q.x, y: p.y });
      }
      out.push(q);
    }
    return out;
  };

  const mountInto = (root, { interactive = true, markerId = 'roi-arrow-fit' } = {}) => {
    const scaler = root.querySelector('[data-roi-scaler]') || root;
    let canvas = root.querySelector('[data-roi-canvas]');
    let svg = root.querySelector('[data-roi-wires]');

    if (!canvas) {
      scaler.innerHTML = `
        <div class="roi-flow__canvas" data-roi-canvas>
          <svg class="roi-flow__wires" data-roi-wires aria-hidden="true">
            <defs>
              <marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3d3d3d"></path>
              </marker>
            </defs>
          </svg>
        </div>`;
      canvas = scaler.querySelector('[data-roi-canvas]');
      svg = scaler.querySelector('[data-roi-wires]');
    }

    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
    svg.setAttribute('width', String(CANVAS_W));
    svg.setAttribute('height', String(CANVAS_H));

    // Clear previous nodes (keep svg)
    [...canvas.querySelectorAll('.roi-node')].forEach((el) => el.remove());
    [...svg.querySelectorAll('path:not(defs path)')].forEach((el) => el.remove());

    const byId = {};
    NODES.forEach((n, index) => {
      const el = document.createElement('div');
      const cls =
        n.t === 'no' ? 'roi-node roi-badge roi-badge--no'
          : n.t === 'yes' ? 'roi-node roi-badge roi-badge--yes'
            : `roi-node roi-node--${n.t}`;
      el.className = cls;
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      el.style.width = `${n.w}px`;
      el.style.height = `${n.h}px`;
      el.style.setProperty('--s', String(index));
      el.setAttribute('data-roi-node', '');
      const span = document.createElement('div');
      span.className = 'roi-node__txt';
      span.textContent = n.text;
      el.appendChild(span);
      canvas.appendChild(el);
      byId[n.id] = n;
    });

    const paths = [];
    EDGES.forEach((e, index) => {
      const start = anchor(byId[e.from], e.fs, e.fromOffset);
      const end = anchor(byId[e.to], e.ts, e.toOffset);
      const pts = [start];
      if (e.via) e.via.forEach((v) => pts.push({ x: v[0], y: v[1] }));
      pts.push(end);
      const firstVertical = e.fs === 'top' || e.fs === 'bottom';
      const line = orthogonalize(pts, firstVertical);
      const d = line.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#3d3d3d');
      path.setAttribute('stroke-width', '1.6');
      path.setAttribute('marker-end', `url(#${markerId})`);
      path.style.setProperty('--s', String(index));
      path.classList.add('roi-flow__line');
      svg.appendChild(path);
      paths.push(path);
      try {
        const len = path.getTotalLength();
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = String(len);
      } catch (_) {
        /* ignore */
      }
    });

    const fit = () => {
      const avail = scaler.clientWidth || root.clientWidth || CANVAS_W;
      const s = Math.min(1, avail / CANVAS_W);
      canvas.style.transform = `scale(${s})`;
      scaler.style.height = `${CANVAS_H * s}px`;
      return s;
    };

    fit();
    return { canvas, scaler, paths, fit, interactive };
  };

  const openLightbox = () => {
    if (document.querySelector('[data-roi-lightbox]')) return;

    const overlay = document.createElement('div');
    overlay.className = 'roi-flow-lightbox';
    overlay.setAttribute('data-roi-lightbox', '');
    overlay.innerHTML = `
      <button class="roi-flow-lightbox__close" type="button" aria-label="Close enlarged flowchart" data-roi-close>×</button>
      <div class="roi-flow-lightbox__zoom" role="group" aria-label="Zoom">
        <button type="button" data-roi-zoom-out aria-label="Zoom out">−</button>
        <button type="button" data-roi-zoom-reset aria-label="Reset zoom">Fit</button>
        <button type="button" data-roi-zoom-in aria-label="Zoom in">+</button>
      </div>
      <div class="roi-flow-lightbox__panel" data-roi-panel>
        <div class="roi-flow__scaler" data-roi-scaler>
          <div class="roi-flow__canvas" data-roi-canvas>
            <svg class="roi-flow__wires" data-roi-wires aria-hidden="true">
              <defs>
                <marker id="roi-arrow-lightbox" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3d3d3d"></path>
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('roi-lightbox-open');

    const panel = overlay.querySelector('[data-roi-panel]');
    const mounted = mountInto(panel, { interactive: false, markerId: 'roi-arrow-lightbox' });
    const scaler = mounted.scaler;
    const canvas = mounted.canvas;

    // Clear embed fit transform; lightbox owns pan/zoom.
    canvas.style.transform = '';
    scaler.style.height = `${CANVAS_H}px`;
    scaler.style.width = `${CANVAS_W}px`;

    let scale = 1;
    let tx = 0;
    let ty = 0;
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 2.75;
    const ZOOM_FACTOR = 1.18;

    const applyTransform = () => {
      scaler.style.transformOrigin = '0 0';
      scaler.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    const fitToPanel = () => {
      const pad = 32;
      const availW = Math.max(200, panel.clientWidth - pad);
      const availH = Math.max(200, panel.clientHeight - pad);
      scale = Math.min(availW / CANVAS_W, availH / CANVAS_H, 1);
      tx = (panel.clientWidth - CANVAS_W * scale) / 2;
      ty = (panel.clientHeight - CANVAS_H * scale) / 2;
      applyTransform();
    };

    const zoomAt = (clientX, clientY, nextScale) => {
      const rect = panel.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const contentX = (mx - tx) / scale;
      const contentY = (my - ty) / scale;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      tx = mx - contentX * scale;
      ty = my - contentY * scale;
      applyTransform();
    };

    const zoomTowardCenter = (nextScale) => {
      const rect = panel.getBoundingClientRect();
      zoomAt(rect.left + panel.clientWidth / 2, rect.top + panel.clientHeight / 2, nextScale);
    };

    fitToPanel();
    requestAnimationFrame(() => overlay.classList.add('is-drawn'));

    // Drag to pan
    let dragging = false;
    let dragMoved = false;
    let lastX = 0;
    let lastY = 0;

    panel.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      dragMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      panel.classList.add('is-dragging');
      panel.setPointerCapture?.(e.pointerId);
    });
    panel.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
      lastX = e.clientX;
      lastY = e.clientY;
      tx += dx;
      ty += dy;
      applyTransform();
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('is-dragging');
      try { panel.releasePointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
    };
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);

    // Wheel zoom toward cursor
    panel.addEventListener('wheel', (e) => {
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      const next = direction > 0 ? scale * ZOOM_FACTOR : scale / ZOOM_FACTOR;
      zoomAt(e.clientX, e.clientY, next);
    }, { passive: false });

    // Double-click zoom in at cursor
    panel.addEventListener('dblclick', (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, scale * ZOOM_FACTOR * 1.15);
    });

    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragMoved) {
        dragMoved = false;
      }
    });

    const close = () => {
      window.removeEventListener('resize', fitToPanel);
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      document.body.classList.remove('roi-lightbox-open');
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === '+' || e.key === '=') zoomTowardCenter(scale * ZOOM_FACTOR);
      if (e.key === '-' || e.key === '_') zoomTowardCenter(scale / ZOOM_FACTOR);
      if (e.key === '0') fitToPanel();
    };

    overlay.querySelector('[data-roi-close]')?.addEventListener('click', close);
    overlay.querySelector('[data-roi-zoom-in]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomTowardCenter(scale * ZOOM_FACTOR);
    });
    overlay.querySelector('[data-roi-zoom-out]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomTowardCenter(scale / ZOOM_FACTOR);
    });
    overlay.querySelector('[data-roi-zoom-reset]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fitToPanel();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', fitToPanel);
  };

  window.ScytalesRoiFlow = {
    mount(root) {
      if (!root || root.dataset.roiMounted === '1') return;
      root.dataset.roiMounted = '1';

      const ensureShell = () => {
        if (root.querySelector('[data-roi-scaler]')) return Promise.resolve();
        return fetch('templates/partials/roi-flowchart.html')
          .then((r) => r.text())
          .then((html) => {
            root.innerHTML = html;
          });
      };

      ensureShell().then(() => {
        const mounted = mountInto(root, { markerId: 'roi-arrow-fit' });
        const fit = () => mounted.fit();
        window.addEventListener('resize', fit);

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
          root.classList.add('is-drawn');
        } else {
          const io = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                root.classList.add('is-drawn');
                io.disconnect();
              });
            },
            { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
          );
          io.observe(root);
        }

        const expand = () => openLightbox(root);
        root.addEventListener('click', (e) => {
          if (e.target.closest('[data-roi-expand]') || e.target.closest('[data-roi-scaler]')) {
            expand();
          }
        });
        root.querySelector('[data-roi-expand]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          expand();
        });
      });
    },
  };
})();
