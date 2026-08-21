/* Style-guide contents menu.

   Built from the document rather than hand-listed: every `section[id]` is a
   entry, and every `h3.h-3` inside one becomes a sub-entry. So a new section
   shows up in the menu by existing — there is no second list to forget to
   update, which is the usual way a contents menu goes stale.

   Sub-headings that have no id are given one from their own text, so the
   links survive re-ordering. Scroll position is tracked with an observer
   rather than a scroll handler, so nothing runs per frame. */
(() => {
  const sections = [...document.querySelectorAll('section[id]')];
  if (sections.length < 2) return;

  const slug = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  /* ---- build the tree ---- */
  const tree = sections.map((sec) => {
    const title =
      sec.querySelector('.section-title')?.textContent.trim() || sec.id.replace(/-/g, ' ');
    const subs = [...sec.querySelectorAll('h3.h-3')].map((h) => {
      if (!h.id) h.id = `sg-${slug(h.textContent)}`;
      return { id: h.id, text: h.textContent.trim() };
    });
    return { id: sec.id, title, subs, el: sec };
  });

  /* ---- markup ---- */
  const nav = document.createElement('nav');
  nav.className = 'sg-contents';
  nav.setAttribute('aria-label', 'Contents');
  nav.innerHTML = `
    <button class="sg-contents__toggle" type="button" aria-expanded="false"
            aria-controls="sg-contents-list">
      <span class="sg-contents__bars" aria-hidden="true"><span></span><span></span><span></span></span>
      Contents
    </button>
    <div class="sg-contents__panel" id="sg-contents-list">
      <ol class="sg-contents__list">
        ${tree
          .map(
            (s) => `<li class="sg-contents__item">
              <a class="sg-contents__link" href="#${s.id}" data-spy="${s.id}">${s.title}</a>
              ${
                s.subs.length
                  ? `<ul class="sg-contents__subs">${s.subs
                      .map(
                        (h) =>
                          `<li><a class="sg-contents__sub" href="#${h.id}" data-spy="${h.id}">${h.text}</a></li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
            </li>`
          )
          .join('')}
      </ol>
    </div>`;
  document.body.appendChild(nav);

  const toggle = nav.querySelector('.sg-contents__toggle');
  const panel = nav.querySelector('.sg-contents__panel');
  const links = new Map(
    [...nav.querySelectorAll('[data-spy]')].map((a) => [a.dataset.spy, a])
  );

  const setOpen = (on) => {
    nav.classList.toggle('is-open', on);
    toggle.setAttribute('aria-expanded', String(on));
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));

  /* Following a link closes the panel on narrow screens, where it covers
     the very thing it just jumped to. */
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a') && window.matchMedia('(max-width: 1279px)').matches) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  /* ---- scroll spy ---- */
  const marks = [...document.querySelectorAll('section[id], h3.h-3[id]')];
  let current = null;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (id === current) return;
        current = id;
        links.forEach((a) => a.classList.remove('is-on'));
        const link = links.get(id);
        if (!link) return;
        link.classList.add('is-on');
        /* Keep the marked entry in view inside a long menu. */
        link.scrollIntoView({ block: 'nearest' });
      });
    },
    /* A band near the top of the viewport: whatever crosses it is what the
       reader is on, which a whole-element threshold cannot tell you for
       sections taller than the screen. */
    { rootMargin: '-12% 0px -80% 0px', threshold: 0 }
  );
  marks.forEach((m) => io.observe(m));
})();
