/* ============================================================
   SCYTÁLES — VIDEO PLAYER
   Drives every [data-video-player] on the page. The transport
   reads its state from the media element rather than from the
   click, so the buttons stay right even when playback changes
   for reasons we did not trigger — the video ending, or the OS
   pausing it for a call.
   ============================================================ */
(function () {
  'use strict';

  function setUp(player) {
    // CMS pages inject players after load and call init() again, so a player
    // that is already wired must not pick up a second set of listeners.
    if (player.dataset.videoPlayerReady === '1') return;
    var media = player.querySelector('.video-player__media');
    var play = player.querySelector('[data-video-action="play"]');
    var pause = player.querySelector('[data-video-action="pause"]');
    if (!media || !play || !pause) return;

    function sync() {
      player.dataset.state = media.paused ? 'paused' : 'playing';
    }

    // play() rejects when the browser declines — an unfinished gesture, or a
    // source it cannot reach. Swallowing it keeps the console clean; sync()
    // then puts the transport back to paused, which is the truth.
    function start() {
      var attempt = media.play();
      if (attempt && attempt.catch) attempt.catch(sync);
    }

    play.addEventListener('click', start);
    pause.addEventListener('click', function () { media.pause(); });
    media.addEventListener('click', function () {
      if (media.paused) start(); else media.pause();
    });

    ['play', 'pause', 'ended'].forEach(function (event) {
      media.addEventListener(event, sync);
    });

    player.dataset.videoPlayerReady = '1';
    sync();
  }

  function init(scope) {
    (scope || document).querySelectorAll('[data-video-player]').forEach(setUp);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  // Markup rendered after load (see js/page.js) re-runs this.
  window.ScytalesVideoPlayer = { init: init };
})();
