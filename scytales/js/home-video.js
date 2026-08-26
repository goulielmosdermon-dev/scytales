/* Homepage hero film — Vimeo support panel (Ramp/Stripe layout).
   data-home-video-bg: click-to-play muted loop, no transport UI.
   Without that attribute the figure needs play/pause controls. */
(() => {
  const figure = document.querySelector('[data-home-video]');
  if (!figure) return;

  const id = figure.dataset.vimeoId;
  const hash = figure.dataset.vimeoHash;
  const poster = figure.querySelector('[data-home-video-poster]');
  const playBtn = figure.querySelector('[data-video-action="play"]');
  const pauseBtn = figure.querySelector('[data-video-action="pause"]');
  const isBg = figure.hasAttribute('data-home-video-bg');
  if (!id) return;
  if (!isBg && (!playBtn || !pauseBtn)) return;

  let player = null;
  let loading = false;

  const setState = (state) => {
    figure.dataset.state = state;
  };

  const loadApi = () =>
    new Promise((resolve, reject) => {
      if (window.Vimeo) return resolve(window.Vimeo);
      const existing = document.querySelector('script[data-vimeo-player-api]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Vimeo), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.async = true;
      script.dataset.vimeoPlayerApi = '';
      script.addEventListener('load', () => resolve(window.Vimeo), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });

  const mount = ({ autoplay, muted, loop, background }) => {
    if (player || loading) return;
    loading = true;

    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      muted: muted ? '1' : '0',
      loop: loop ? '1' : '0',
      background: background ? '1' : '0',
      controls: '0',
      title: '0',
      byline: '0',
      portrait: '0',
      dnt: '1',
    });
    if (hash) params.set('h', hash);

    const iframe = document.createElement('iframe');
    iframe.className = isBg
      ? 'hero__video-media'
      : 'video-player__media video-player__media--embed';
    iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?${params}`;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.title = figure.dataset.videoTitle || 'Scytáles';
    iframe.setAttribute('loading', isBg ? 'eager' : 'lazy');

    poster?.replaceWith(iframe);
    if (autoplay) setState('playing');

    loadApi()
      .then((Vimeo) => {
        player = new Vimeo.Player(iframe);
        player.on('play', () => setState('playing'));
        player.on('pause', () => setState('paused'));
        player.on('ended', () => setState('paused'));
        if (muted) player.setVolume(0).catch(() => {});
      })
      .catch(() => {
        if (!isBg) {
          iframe.src = iframe.src.replace('controls=0', 'controls=1');
        }
      })
      .finally(() => {
        loading = false;
      });
  };

  if (isBg) {
    /* Poster stays until the user clicks the film — no autoplay. */
    setState('paused');
    const activateBg = () => {
      mount({ autoplay: true, muted: true, loop: true, background: true });
    };
    figure.addEventListener('click', () => {
      if (!player) activateBg();
      else if (figure.dataset.state === 'playing') player.pause();
      else player.play().catch(() => setState('paused'));
    });
    return;
  }

  const activate = () => mount({ autoplay: true, muted: false, loop: false, background: false });

  playBtn.addEventListener('click', () => {
    if (!player) return activate();
    player.play().catch(() => setState('paused'));
  });

  pauseBtn.addEventListener('click', () => {
    player?.pause();
  });

  figure.addEventListener('click', (e) => {
    if (e.target.closest('.video-player__controls')) return;
    if (!player) return activate();
    if (figure.dataset.state === 'playing') player.pause();
    else player.play().catch(() => setState('paused'));
  });
})();
