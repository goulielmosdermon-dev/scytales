/* ============================================================
   SCYTÁLES — SESSION VIDEO LIGHTBOX
   Opens Vimeo sessions in the same .video-player chrome used on
   the homepage. Play/pause stay in sync via the Vimeo Player API.
   ============================================================ */
(() => {
  const PLAY_SVG = '<svg viewBox="0 0 20 24" fill="currentColor" aria-hidden="true"><path d="M0 0 20 12 0 24Z"/></svg>';
  const PAUSE_SVG = '<svg viewBox="0 0 18 24" fill="currentColor" aria-hidden="true"><path d="M0 0h6v24H0zM12 0h6v24h-6z"/></svg>';

  let overlay = null;
  let player = null;
  let vimeoApi = null;

  const loadVimeoApi = () => {
    if (vimeoApi) return Promise.resolve(vimeoApi);
    if (window.Vimeo?.Player) {
      vimeoApi = window.Vimeo;
      return Promise.resolve(vimeoApi);
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-vimeo-player-api]');
      if (existing) {
        existing.addEventListener('load', () => {
          vimeoApi = window.Vimeo;
          resolve(vimeoApi);
        });
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.async = true;
      script.dataset.vimeoPlayerApi = '';
      script.onload = () => {
        vimeoApi = window.Vimeo;
        resolve(vimeoApi);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const ensureOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'session-video';
    overlay.hidden = true;
    overlay.innerHTML = `
      <button class="session-video__backdrop" type="button" data-session-video-close aria-label="Close video"></button>
      <div class="session-video__dialog" role="dialog" aria-modal="true" aria-label="SCY Session video">
        <button class="session-video__close" type="button" data-session-video-close aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="session-video__stage" data-session-video-stage></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-session-video-close]')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && !overlay.hidden) close();
    });

    return overlay;
  };

  const destroyPlayer = async () => {
    if (!player) return;
    try {
      await player.pause();
    } catch (_) { /* ignore */ }
    try {
      await player.unload();
    } catch (_) { /* ignore */ }
    player = null;
  };

  const close = async () => {
    const node = ensureOverlay();
    await destroyPlayer();
    const stage = node.querySelector('[data-session-video-stage]');
    if (stage) stage.innerHTML = '';
    node.hidden = true;
    node.classList.remove('is-open');
    document.documentElement.classList.remove('session-video-open');
    document.body.classList.remove('session-video-open');
  };

  const open = async ({ id, hash, poster, title }) => {
    if (!id) return;
    const node = ensureOverlay();
    const stage = node.querySelector('[data-session-video-stage]');
    if (!stage) return;

    await destroyPlayer();

    const params = new URLSearchParams({
      autoplay: '1',
      title: '0',
      byline: '0',
      portrait: '0',
      controls: '0',
      transparent: '0',
    });
    if (hash) params.set('h', hash);

    stage.innerHTML = `
      <figure class="video-player" data-video-player data-state="paused">
        <iframe
          class="video-player__media video-player__media--embed"
          src="https://player.vimeo.com/video/${encodeURIComponent(id)}?${params.toString()}"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
          title="${title || 'SCY Session video'}"
        ></iframe>
        <div class="video-player__controls">
          <button class="video-player__btn" type="button" data-video-action="play" aria-label="Play video">${PLAY_SVG}</button>
          <button class="video-player__btn" type="button" data-video-action="pause" aria-label="Pause video">${PAUSE_SVG}</button>
        </div>
      </figure>
    `;

    const figure = stage.querySelector('[data-video-player]');
    const iframe = stage.querySelector('iframe');
    const playBtn = stage.querySelector('[data-video-action="play"]');
    const pauseBtn = stage.querySelector('[data-video-action="pause"]');

    node.hidden = false;
    requestAnimationFrame(() => node.classList.add('is-open'));
    document.documentElement.classList.add('session-video-open');
    document.body.classList.add('session-video-open');

    try {
      const Vimeo = await loadVimeoApi();
      player = new Vimeo.Player(iframe);

      const sync = async () => {
        try {
          const paused = await player.getPaused();
          figure.dataset.state = paused ? 'paused' : 'playing';
        } catch (_) {
          figure.dataset.state = 'paused';
        }
      };

      playBtn?.addEventListener('click', () => {
        player.play().catch(() => {});
      });
      pauseBtn?.addEventListener('click', () => {
        player.pause().catch(() => {});
      });
      player.on('play', () => { figure.dataset.state = 'playing'; });
      player.on('pause', () => { figure.dataset.state = 'paused'; });
      player.on('ended', () => { figure.dataset.state = 'paused'; });
      await sync();
    } catch (err) {
      console.warn('[session-video]', err);
      // Fall back to native Vimeo controls if the API fails to load.
      iframe.src = iframe.src.replace('controls=0', 'controls=1');
      figure.querySelector('.video-player__controls')?.remove();
    }
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-session-video]');
    if (!btn) return;
    e.preventDefault();
    open({
      id: btn.dataset.vimeoId,
      hash: btn.dataset.vimeoHash,
      poster: btn.dataset.sessionPoster,
      title: btn.getAttribute('aria-label') || 'SCY Session video',
    });
  });
})();
