/* Innovation dial — four nodes on one arc, the active one parked at the
   crown.

   The ring is rotated by -(index x --dial-step), which carries the arc and
   every node with it; the copy cross-fades underneath, and so does the
   node's backdrop graphic ([data-dial-bg]). All the geometry is
   CSS (see .innovation in site.css) — this file only ever writes
   --dial-angle, the per-node opacity, and the current/aria state.

   The section is four viewports tall and its .innovation__pin sticks for
   all of it, so the band holds still while the dial advances and releases
   the page only once the fourth node has been reached. Scroll position
   picks the node — no wheel hijacking, so trackpads, keyboards and
   scrollbars all behave the way the visitor expects. Clicking a number or
   using the arrow keys jumps straight there. */
(() => {
  const root = document.querySelector('[data-dial]');
  if (!root) return;

  const ring = root.querySelector('[data-dial-ring]');
  const track = root.querySelector('.innovation__track');
  const nodes = [...root.querySelectorAll('[data-dial-node]')];
  const slides = [...root.querySelectorAll('[data-dial-slide]')];
  const cta = root.querySelector('[data-dial-cta]');
  if (!ring || nodes.length < 2 || nodes.length !== slides.length) return;

  const stepDeg = () => {
    const raw = getComputedStyle(root).getPropertyValue('--dial-step');
    return parseFloat(raw) || 35;
  };

  let index = 0;

  /* Nodes are laid out by their own index; the ring's rotation is what
     brings one to the crown. */
  nodes.forEach((node, i) => node.style.setProperty('--i', String(i)));

  const render = () => {
    root.style.setProperty('--dial-angle', `${-index * stepDeg()}deg`);

    nodes.forEach((node, i) => {
      if (i === index) node.setAttribute('aria-current', 'true');
      else node.removeAttribute('aria-current');
      /* Solid at the crown, dimmer ahead of it, nearly gone once passed —
         the way the design drops the numbers behind. */
      const opacity = i === index ? 1 : i < index ? 0.12 : 0.42;
      node.style.setProperty('--node-opacity', String(opacity));
    });

    slides.forEach((slide, i) => {
      slide.toggleAttribute('data-current', i === index);
      slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });

    /* The button is outside the slides and never moves or fades — only
       what it opens changes. */
    const slug = slides[index]?.getAttribute('data-dial-slug');
    if (cta && slug) cta.setAttribute('data-innovation-open', slug);

    /* js/dial-backdrop.js owns the graphics: it fades the right one in and
       runs its self-draw. */
    window.ScytalesDialBackdrop?.show?.(index);
  };

  const go = (next) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    if (clamped === index) return false;
    index = clamped;
    render();
    return true;
  };

  /* Clicking a number scrolls to that node's share of the track, so the
     scroll position and the dial can never disagree. */
  const scrollTo = (i) => {
    if (!track) return;
    const travel = track.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + (travel * i) / slides.length + 8,
      behavior: 'smooth',
    });
  };

  nodes.forEach((node, i) => {
    node.addEventListener('click', () => scrollTo(i));
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      scrollTo(Math.min(slides.length - 1, index + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      scrollTo(Math.max(0, index - 1));
    }
  });

  let raf = 0;

  const fromScroll = () => {
    raf = 0;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) return;

    const progress = Math.max(0, Math.min(1, -rect.top / travel));
    go(Math.min(slides.length - 1, Math.floor(progress * slides.length)));
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(fromScroll);
  };

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);

  render();
  kick();
})();
