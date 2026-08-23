/* Homepage video — Vimeo embed behind a poster facade.
   The old homepage video was a signed progressive .mp4 played by a plain
   <video>. This one is only available through Vimeo's player, so the figure
   starts as a poster image and swaps in the iframe on first play. Nothing
   from Vimeo is fetched until someone asks for it.

   The custom transport is kept: the iframe runs controls=0 and the existing
   play/pause buttons drive it through the Vimeo Player API, so the section
   looks and behaves exactly as it did with the <video>. */
(() => {
  const figure = document.querySelector('[data-home-video]');
  if (!figure) return;

  const id = figure.dataset.vimeoId;
  const hash = figure.dataset.vimeoHash;
  const poster = figure.querySelector('[data-home-video-poster]');
  const playBtn = figure.querySelector('[data-video-action="play"]');
  const pauseBtn = figure.querySelector('[data-video-action="pause"]');
  if (!id || !playBtn || !pauseBtn) return;

  let player = null;
  let loading = false;

  const setState = (state) => {
    figure.dataset.state = state;
  };

  /* Mirrors the loader in session-video.js: one <script> for the whole page,
     however many players end up asking for it. */
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

  const activate = () => {
    if (player || loading) return;
    loading = true;

    /* autoplay=1 is set on the src rather than called afterwards: the iframe
       is created inside the click handler, which is what lets the browser
       treat playback as user-initiated across the origin boundary. */
    const params = new URLSearchParams({
      autoplay: '1',
      controls: '0',
      title: '0',
      byline: '0',
      portrait: '0',
      dnt: '1',
    });
    if (hash) params.set('h', hash);

    const iframe = document.createElement('iframe');
    iframe.className = 'video-player__media video-player__media--embed';
    iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?${params}`;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.title = figure.dataset.videoTitle || 'Scytáles';
    iframe.setAttribute('loading', 'lazy');

    poster?.replaceWith(iframe);
    setState('playing');

    loadApi()
      .then((Vimeo) => {
        player = new Vimeo.Player(iframe);
        player.on('play', () => setState('playing'));
        player.on('pause', () => setState('paused'));
        player.on('ended', () => setState('paused'));
      })
      .catch(() => {
        /* The API failed to load. The video is already playing inside the
           iframe; only our transport is dead, so hand control to Vimeo's. */
        iframe.src = iframe.src.replace('controls=0', 'controls=1');
      })
      .finally(() => {
        loading = false;
      });
  };

  playBtn.addEventListener('click', () => {
    if (!player) return activate();
    player.play().catch(() => setState('paused'));
  });

  pauseBtn.addEventListener('click', () => {
    player?.pause();
  });

  /* The whole surface toggles, as it did when this was a <video>. */
  figure.addEventListener('click', (e) => {
    if (e.target.closest('.video-player__controls')) return;
    if (!player) return activate();
    if (figure.dataset.state === 'playing') player.pause();
    else player.play().catch(() => setState('paused'));
  });
})();
