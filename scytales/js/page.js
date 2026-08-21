/* CMS pages — events, studios, about, partners, join, contacts */
(() => {
  const root = document.querySelector('[data-cms-page]');
  if (!root) return;

  /* Pages whose header follows the SDKs page: Display 1 on a 22ch measure
     rather than the default H2. A rule about the section rather than about
     any one page's content — hence a list here, not a flag per JSON. */
  const DISPLAY_HERO_SLUGS = ['scy-studios', 'events', 'join', 'partners'];

  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  if (!slug && location.hash.startsWith('#company/')) {
    const key = location.hash.slice('#company/'.length).split(/[/?#]/)[0];
    const map = {
      about: 'about',
      mission: 'about',
      certifications: 'about',
      leadership: 'about',
      locations: 'about',
      partners: 'partners',
      contacts: 'contacts',
    };
    slug = map[key] || 'about';
  }
  if (!slug && location.hash === '#careers') slug = 'join';
  if (!slug) slug = 'about';

  const escapeText = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const paragraphs = (text) =>
    String(text || '')
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeText(p)}</p>`)
      .join('');

  const setText = (sel, value) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = value || '';
  };

  const renderHero = (data) => {
    const hero = root.querySelector('.cms-hero');
    if (data.layout === 'contacts' || data.hideHero) {
      hero?.setAttribute('hidden', '');
      return;
    }
    hero?.removeAttribute('hidden');

    setText('[data-cms-eyebrow]', data.eyebrow);
    const eyebrowEl = root.querySelector('[data-cms-eyebrow]');
    if (eyebrowEl) eyebrowEl.hidden = !data.eyebrow;
    setText('[data-cms-title]', data.title);
    setText('[data-cms-lead]', data.lead);
    const leadEl = root.querySelector('[data-cms-lead]');
    if (leadEl) leadEl.hidden = !data.lead;

    const titleEl = root.querySelector('[data-cms-title]');
    let bannerEl = root.querySelector('[data-cms-hero-banner]');

    /* The About page's mark is the 3D rod, not a flat image: same slot, same
       banner element, but the module renders into it. */
    if (data.heroRod) {
      if (titleEl) {
        titleEl.hidden = true;
        titleEl.textContent = data.title || data.seoTitle || 'Scytáles';
      }
      if (!bannerEl && titleEl?.parentNode) {
        bannerEl = document.createElement('div');
        bannerEl.className = 'cms-hero__banner';
        bannerEl.setAttribute('data-cms-hero-banner', '');
        titleEl.parentNode.insertBefore(bannerEl, titleEl);
      }
      if (bannerEl) {
        bannerEl.hidden = false;
        bannerEl.innerHTML =
          '<div class="cms-hero__rod" data-scytale-rod data-rod-replay' +
          ' data-rod-glyphs="../shared/graphics/scytale-graph.svg"' +
          ' role="img" aria-label="Scytáles"></div>';
        /* The rod ships as a module, so it may evaluate after this render;
           mount now if it is ready, otherwise wait for it to say so. */
        const host = bannerEl.firstElementChild;
        const mount = () => window.ScytaleRod?.init(bannerEl);
        if (window.ScytaleRod) mount();
        else window.addEventListener('scytale-rod:ready', mount, { once: true });
      }
      hero?.classList.add('cms-hero--has-banner');
    } else if (data.heroImage) {
      if (titleEl) {
        titleEl.hidden = true;
        titleEl.textContent = data.title || data.seoTitle || 'Scytáles';
      }
      if (!bannerEl && titleEl?.parentNode) {
        bannerEl = document.createElement('div');
        bannerEl.className = 'cms-hero__banner';
        bannerEl.setAttribute('data-cms-hero-banner', '');
        titleEl.parentNode.insertBefore(bannerEl, titleEl);
      }
      if (bannerEl) {
        bannerEl.hidden = false;
        const alt = data.heroImageAlt || data.title || 'Scytáles';
        bannerEl.innerHTML = `<img class="cms-hero__banner-img" src="${escapeText(data.heroImage)}" alt="${escapeText(alt)}">`;
      }
      hero?.classList.add('cms-hero--has-banner');
    } else {
      bannerEl?.remove();
      hero?.classList.remove('cms-hero--has-banner');
      if (titleEl) {
        titleEl.hidden = !data.title;
        if (data.title) {
          /* These pages set their headline the way the SDKs page does —
             Display 1, on a shorter measure. */
          const isDisplayHero = DISPLAY_HERO_SLUGS.includes(data.slug);
          const useDisplay1 =
            data.layout === 'about' || data.slug === 'about' || isDisplayHero;
          titleEl.classList.toggle('display-1', useDisplay1);
          titleEl.classList.toggle('h-2', !useDisplay1);
          hero?.classList.toggle('cms-hero--resource', isDisplayHero);
        }
      }
    }

    const actions = root.querySelector('[data-cms-actions]');
    if (actions) {
      actions.innerHTML = data.cta
        ? `<a class="btn btn-primary" href="${escapeText(data.cta.href)}">${escapeText(data.cta.label)}</a>`
        : '';
    }

    const heroInner = root.querySelector('.cms-hero__inner');
    let media = root.querySelector('[data-cms-media]');
    if (data.image) {
      if (!media && heroInner) {
        media = document.createElement('div');
        media.className = 'cms-hero__media';
        media.setAttribute('data-cms-media', '');
        media.setAttribute('aria-hidden', 'true');
        heroInner.appendChild(media);
      }
      if (media) {
        media.innerHTML = `<img src="${escapeText(data.image)}" alt="">`;
        media.classList.add('has-image');
      }
      heroInner?.classList.remove('cms-hero__inner--no-media');
    } else {
      media?.remove();
      heroInner?.classList.add('cms-hero__inner--no-media');
    }
  };

  /* A `pills` array renders as a stack of rows above the prose — a long
     capability list reads as a scannable set, not a sentence. Each row is
     a button that opens a line about the item; js/pills.js handles the
     toggle and the reveal-on-scroll. Entries may be a plain string or
     { label, note }. */
  const pills = (items) =>
    items?.length
      ? `<ul class="cms-pills" data-pills>${items
          .map((item, i) => {
            const label = typeof item === 'string' ? item : item.label;
            const note = typeof item === 'string' ? '' : item.note;
            return `<li class="cms-pill" style="--i:${i}">
              <button class="cms-pill__row" type="button"
                      aria-expanded="false"${note ? '' : ' disabled'}>
                <span class="cms-pill__label">${escapeText(label)}</span>
              </button>
              ${note ? `<div class="cms-pill__panel"><p>${escapeText(note)}</p></div>` : ''}
            </li>`;
          })
          .join('')}</ul>`
      : '';

  const block = (id, heading, bodyHtml, pillItems) => `
    <section class="cms-block" id="${escapeText(id || '')}">
      <div class="container cms-block__inner">
        <h2 class="h-2 cms-block__title">${escapeText(heading)}</h2>
        <div class="body-md cms-block__body">${pills(pillItems)}${bodyHtml}</div>
      </div>
    </section>`;

  const renderEvents = (data) => `
    <section class="cms-cards" aria-label="Events">
      <div class="container">
        <ul class="cms-events">
          ${(data.events || [])
            .map(
              (e) => `<li class="cms-event">
              <h3 class="cms-event__title">${escapeText(e.name)}</h3>
              ${e.meta ? `<p class="cms-event__meta">${escapeText(e.meta)}</p>` : ''}
              <p class="cms-event__dates">${escapeText(e.dates)}</p>
              <p class="cms-event__location">${escapeText(e.location)}</p>
            </li>`
            )
            .join('')}
        </ul>
      </div>
    </section>`;

  const renderStudios = (data) => {
    const sections = (data.sections || [])
      .map((s) => {
        if (s.bullets) {
          return block(
            s.id,
            s.heading,
            `<ul class="cms-list">${s.bullets.map((b) => `<li>${escapeText(b)}</li>`).join('')}</ul>`
          );
        }
        return block(s.id, s.heading, paragraphs(s.body));
      })
      .join('');

    const sessions = `
      <section class="cms-cards" id="sessions" aria-labelledby="sessions-title">
        <div class="container">
          <h2 class="h-2" id="sessions-title">${escapeText(data.sessionsHeading || 'SCY Sessions')}</h2>
          <ul class="cms-sessions">
            ${(data.sessions || [])
              .map(
                (s) => `<li class="cms-session">
                <div class="cms-session__copy">
                  <h3 class="cms-session__guest">${escapeText(s.guest)}</h3>
                  ${s.role ? `<p class="cms-session__role">${escapeText(s.role)}</p>` : ''}
                  ${s.date ? `<p class="cms-session__date">${escapeText(s.date)}</p>` : ''}
                  <p class="body-md cms-session__summary">${escapeText(s.summary)}</p>
                </div>
                <button
                  class="cms-session__thumb-btn"
                  type="button"
                  data-session-video
                  data-vimeo-id="${escapeText(s.vimeoId || '')}"
                  data-vimeo-hash="${escapeText(s.vimeoHash || '')}"
                  data-session-poster="${escapeText(s.thumbnail || '')}"
                  aria-label="Play video: ${escapeText(s.guest || 'SCY Session')}"
                >
                  <img class="cms-session__thumb" src="${escapeText(s.thumbnail || '')}" alt="" loading="lazy" decoding="async">
                </button>
              </li>`
              )
              .join('')}
          </ul>
        </div>
      </section>`;
    return sections + sessions;
  };

  const renderAbout = (data) => {
    const sections = (data.sections || [])
      .map((s) => block(s.id, s.heading, paragraphs(s.body), s.pills))
      .join('');

    const leadership = `
      <section class="cms-cards" id="leadership" aria-labelledby="leadership-title">
        <div class="container">
          <h2 class="h-2" id="leadership-title">${escapeText(data.leadershipHeading)}</h2>
          <ul class="cms-people">
            ${(data.leadership || [])
              .map(
                (p) => `<li class="cms-person">
                ${
                  p.photo
                    ? `<img class="cms-person__photo" src="${escapeText(p.photo)}" alt="${escapeText(p.name)}" loading="lazy" width="480" height="480">`
                    : `<div class="cms-person__avatar" aria-hidden="true">${escapeText((p.name || '?').slice(0, 1))}</div>`
                }
                <h3 class="cms-person__name">${escapeText(p.name)}</h3>
                <p class="cms-person__role">${escapeText(p.role)}</p>
              </li>`
              )
              .join('')}
          </ul>
        </div>
      </section>`;

    const certs = `
      <section class="cms-cards" id="certifications" aria-labelledby="certs-title">
        <div class="container">
          <h2 class="h-2" id="certs-title">${escapeText(data.certificationsHeading)}</h2>
          <ul class="cms-certs">
            ${(data.certifications || [])
              .map(
                (c) => {
                  const multiplyTitles = new Set([
                    'ISO/IEC 18013-5',
                    'ISO/IEC 18013-7',
                    'W3C Verifiable Credentials',
                    'ICAO 9303',
                    'ISO/IEC 27001',
                    'ISO/IEC 9001',
                  ]);
                  const brightTitles = new Set([
                    'ISO/IEC 18013-5',
                    'ISO/IEC 18013-7',
                  ]);
                  const classes = [
                    'cms-cert__logo',
                    multiplyTitles.has(c.title) ? 'cms-cert__logo--multiply' : '',
                    brightTitles.has(c.title) ? 'cms-cert__logo--bright' : '',
                  ].filter(Boolean).join(' ');
                  return `<li class="cms-cert">
                ${
                  c.logo
                    ? `<img class="${classes}" src="${escapeText(c.logo)}" alt="" loading="lazy">`
                    : ''
                }
                <h3 class="cms-cert__title">${escapeText(c.title)}</h3>
                <p class="body-md">${escapeText(c.body)}</p>
              </li>`;
                }
              )
              .join('')}
          </ul>
          <h3 class="cms-subheading">${escapeText(data.associatesHeading)}</h3>
          <ul class="cms-associates">
            ${(data.associates || [])
              .map((a) => {
                const name = typeof a === 'string' ? a : a.name;
                const logo = typeof a === 'object' ? a.logo : '';
                return logo
                  ? `<li class="cms-associate">
                      <img class="cms-associate__logo" src="${escapeText(logo)}" alt="${escapeText(name)} logo" loading="lazy">
                    </li>`
                  : `<li class="cms-associate"><span>${escapeText(name)}</span></li>`;
              })
              .join('')}
          </ul>
        </div>
      </section>`;

    const locations = `
      <section class="cms-cards" id="locations" aria-labelledby="locations-title">
        <div class="container">
          <h2 class="h-2" id="locations-title">${escapeText(data.locationsHeading)}</h2>
          <ul class="cms-locations">
            ${(data.locations || [])
              .map(
                (l) => `<li class="cms-location">
                ${
                  l.map
                    ? `<img class="cms-location__map" src="${escapeText(l.map)}" alt="" aria-hidden="true" loading="lazy">`
                    : ''
                }
                <div class="cms-location__copy">
                  <p class="cms-location__type">${escapeText(l.type)}</p>
                  <h3 class="cms-location__name">${escapeText(l.name)}</h3>
                  <p class="cms-location__lines">${(l.lines || []).map(escapeText).join('<br>')}</p>
                  ${(l.links || [])
                    .map((link) => `<a href="${escapeText(link.href)}">${escapeText(link.label)}</a>`)
                    .join(' ')}
                </div>
              </li>`
              )
              .join('')}
          </ul>
        </div>
      </section>`;

    return sections + leadership + certs + locations;
  };

  const renderPartners = (data) => `
    <section class="cms-cards" aria-label="Partners">
      <div class="container">
        <ul class="cms-partners">
          ${(data.partners || [])
            .map((partner) => {
              const name = typeof partner === 'string' ? partner : partner.name;
              const logo = typeof partner === 'object' ? partner.logo : '';
              return logo
                ? `<li class="cms-partner">
                    <img class="cms-partner__logo" src="${escapeText(logo)}" alt="${escapeText(name)} logo" loading="lazy">
                  </li>`
                : `<li class="cms-partner"><span>${escapeText(name)}</span></li>`;
            })
            .join('')}
        </ul>
      </div>
    </section>`;

  const renderJoin = (data) => {
    const roles = (data.regions || []).flatMap((region) =>
      (region.roles || []).map((role) => ({
        ...role,
        region: region.name,
      }))
    );

    /* Moved here from the homepage hero section. Still a plain <video> on a
       signed progressive URL, so shared/video-player.js drives it — page.html
       loads that script for this one block. */
    const video = data.video
      ? `
    <section class="cms-video" aria-label="${escapeText(data.video.label || data.title || 'Video')}">
      <div class="container">
        <figure class="video-player" data-video-player data-state="paused">
          <video class="video-player__media"
                 poster="${escapeText(data.video.poster || '')}"
                 preload="metadata"
                 playsinline
                 src="${escapeText(data.video.src)}"></video>
          <div class="video-player__controls">
            <button class="video-player__btn" type="button" data-video-action="play" aria-label="Play video">
              <svg viewBox="0 0 20 24" fill="currentColor" aria-hidden="true"><path d="M0 0 20 12 0 24Z"/></svg>
            </button>
            <button class="video-player__btn" type="button" data-video-action="pause" aria-label="Pause video">
              <svg viewBox="0 0 18 24" fill="currentColor" aria-hidden="true"><path d="M0 0h6v24H0zM12 0h6v24h-6z"/></svg>
            </button>
          </div>
        </figure>
      </div>
    </section>`
      : '';

    return `${video}
    <section class="cms-cards cms-cards--openings" id="openings" aria-labelledby="openings-title">
      <div class="container">
        <h2 class="h-2" id="openings-title">${escapeText(data.openingsHeading)}</h2>
        <ul class="cms-jobs-grid">
          ${roles
            .map(
              (role) => `<li class="cms-job">
              <p class="cms-job__region">${escapeText(role.region)}</p>
              <h3 class="cms-job__title">${escapeText(role.title)}</h3>
              <p class="cms-job__type">${escapeText(role.type)}</p>
            </li>`
            )
            .join('')}
        </ul>
        <div class="cms-direct">
          <h3 class="cms-subheading">${escapeText(data.directContact?.heading || 'Contact us directly')}</h3>
          <a href="mailto:${escapeText(data.directContact?.email || 'hr@scytales.com')}">${escapeText(data.directContact?.email || 'hr@scytales.com')}</a>
        </div>
      </div>
    </section>`;
  };

  const renderContacts = (data) => `
    <section class="cms-contact" aria-label="Contact">
      <div class="container cms-contact__stack">

        <div class="contact-wizard" data-contact-wizard>
          <ol class="contact-wizard__steps" aria-label="Form progress">
            <li class="contact-wizard__step is-active" data-wizard-step-label="1">
              <span class="contact-wizard__step-icon" aria-hidden="true"></span>
              <span class="contact-wizard__step-name">Your email</span>
            </li>
            <li class="contact-wizard__step" data-wizard-step-label="2">
              <span class="contact-wizard__step-icon" aria-hidden="true"></span>
              <span class="contact-wizard__step-name">Your info</span>
            </li>
            <li class="contact-wizard__step" data-wizard-step-label="3">
              <span class="contact-wizard__step-icon" aria-hidden="true"></span>
              <span class="contact-wizard__step-name">Let's talk</span>
            </li>
          </ol>

          <form class="contact-wizard__form" data-cms-form novalidate>
            <div class="contact-wizard__panel is-active" data-wizard-panel="1">
              <h3 class="contact-wizard__title">Let's get you to the right place</h3>
              <p class="contact-wizard__lead">We just need a few quick details.</p>
              <div class="contact-wizard__fields">
                <label class="contact-wizard__row">
                  <span>Work email</span>
                  <input type="email" name="email" required autocomplete="email" placeholder="you@company.com">
                </label>
                <label class="contact-wizard__row">
                  <span>Country/Region</span>
                  <select name="country" required>
                    <option value="">Select a country</option>
                    <option>Australia</option>
                    <option>Finland</option>
                    <option>Greece</option>
                    <option>Portugal</option>
                    <option>Spain</option>
                    <option>Sweden</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
              <div class="contact-wizard__actions">
                <button class="btn btn-primary contact-wizard__next" type="button" data-wizard-next>Continue</button>
              </div>
            </div>

            <div class="contact-wizard__panel" data-wizard-panel="2" hidden>
              <h3 class="contact-wizard__title">How can we reach you?</h3>
              <p class="contact-wizard__lead">Please provide your contact information.</p>
              <div class="contact-wizard__fields">
                <label class="contact-wizard__row">
                  <span>First name</span>
                  <input name="firstName" required autocomplete="given-name" placeholder="Jane">
                </label>
                <label class="contact-wizard__row">
                  <span>Last name</span>
                  <input name="lastName" required autocomplete="family-name" placeholder="Diaz">
                </label>
                <label class="contact-wizard__row">
                  <span>Phone number</span>
                  <input type="tel" name="phone" autocomplete="tel" placeholder="Enter your phone number">
                </label>
                <label class="contact-wizard__row">
                  <span>Company website</span>
                  <input name="company" autocomplete="organization" placeholder="company.com">
                </label>
                <label class="contact-wizard__row">
                  <span>Job level</span>
                  <select name="jobLevel">
                    <option value="">Select a job level</option>
                    <option>C-level / Executive</option>
                    <option>VP / Director</option>
                    <option>Manager</option>
                    <option>Individual contributor</option>
                    <option>Other</option>
                  </select>
                </label>
                <label class="contact-wizard__row">
                  <span>Job function</span>
                  <select name="jobFunction">
                    <option value="">Select a job function</option>
                    <option>Product</option>
                    <option>Engineering</option>
                    <option>Security / Identity</option>
                    <option>Operations</option>
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>Other</option>
                  </select>
                </label>
                <label class="contact-wizard__row contact-wizard__row--top">
                  <span>Anything else? <em>(Optional)</em></span>
                  <textarea name="details" rows="4" placeholder="Tell us more about your project, needs, and timeline"></textarea>
                </label>
              </div>
              <p class="contact-wizard__legal">You may receive marketing communications from Scytáles including product updates, industry news, and events. You can unsubscribe at any time.</p>
              <div class="contact-wizard__actions">
                <button class="contact-wizard__back" type="button" data-wizard-back>Back</button>
                <button class="btn btn-primary contact-wizard__next" type="button" data-wizard-next>Continue</button>
              </div>
            </div>

            <div class="contact-wizard__panel" data-wizard-panel="3" hidden>
              <h3 class="contact-wizard__title">Let's talk</h3>
              <p class="contact-wizard__lead">Tell us what you want to explore with Scytáles.</p>
              <div class="contact-wizard__fields">
                <label class="contact-wizard__row contact-wizard__row--top">
                  <span>How can we help?</span>
                  <textarea name="interest" rows="5" required placeholder="Share your goals, timeline, or the products you're evaluating"></textarea>
                </label>
                <label class="contact-wizard__check">
                  <input type="checkbox" name="consent" required>
                  <span>I agree to receive periodic communications from Scytáles related to products and services and can unsubscribe at any time.</span>
                </label>
              </div>
              <p class="contact-wizard__legal">Scytáles will handle your data pursuant to its <a href="#privacy">Privacy Policy</a>.</p>
              <div class="contact-wizard__actions">
                <button class="contact-wizard__back" type="button" data-wizard-back>Back</button>
                <button class="btn btn-primary" type="submit">Submit</button>
              </div>
              <p class="contact-wizard__status" data-cms-form-status hidden></p>
            </div>
          </form>

          <div class="contact-wizard__success" data-wizard-success hidden>
            <div class="contact-wizard__success-icon" aria-hidden="true">
              <svg viewBox="0 0 64 48" fill="none">
                <path d="M12 18c0-5.5 4.5-10 10-10h8c5.5 0 10 4.5 10 10v8c0 5.5-4.5 10-10 10h-4l-8 8v-8h-6c-5.5 0-10-4.5-10-10v-8Z" fill="color-mix(in srgb, var(--orange-300) 55%, #fff)"/>
                <path d="M26 10c0-5.5 4.5-10 10-10h8c5.5 0 10 4.5 10 10v8c0 5.5-4.5 10-10 10h-4l-8 8v-8h-6c-5.5 0-10-4.5-10-10v-8Z" fill="var(--navy-800)"/>
              </svg>
            </div>
            <h3 class="contact-wizard__title">Thanks for reaching out</h3>
            <p class="contact-wizard__lead">We'll be in touch within one business day to schedule a meeting.</p>
          </div>
        </div>

        <aside class="cms-contact__aside">
          <h2 class="h-2 cms-contact__aside-title">${escapeText(data.directHeading)}</h2>
          <ul class="cms-contact-grid">
            ${(data.direct || [])
              .map(
                (d) => `<li class="cms-contact-cell">
                <p class="cms-contact-cell__label">${escapeText(d.label)}</p>
                <a class="cms-contact-cell__link" href="mailto:${escapeText(d.email)}">${escapeText(d.email)}</a>
              </li>`
              )
              .join('')}
            ${(data.offices || [])
              .flatMap((office) =>
                (office.items || []).map(
                  (item) => `<li class="cms-contact-cell">
                <p class="cms-contact-cell__label">${escapeText(office.region)}</p>
                <p class="cms-contact-cell__name">${escapeText(item.name)}</p>
                <address class="cms-contact-cell__address">${(item.lines || []).map(escapeText).join('<br>')}</address>
              </li>`
                )
              )
              .join('')}
          </ul>
        </aside>
      </div>
    </section>`;

  const renderBody = (data) => {
    switch (data.layout) {
      case 'events':
        return renderEvents(data);
      case 'scy-studios':
        return renderStudios(data);
      case 'about':
        return renderAbout(data);
      case 'partners':
        return renderPartners(data);
      case 'join':
        return renderJoin(data);
      case 'contacts':
        return renderContacts(data);
      default:
        return '';
    }
  };

  const bindForm = () => {
    const wizard = root.querySelector('[data-contact-wizard]');
    const form = root.querySelector('[data-cms-form]');
    if (!wizard || !form) return;

    const status = root.querySelector('[data-cms-form-status]');
    const success = wizard.querySelector('[data-wizard-success]');
    const panels = [...wizard.querySelectorAll('[data-wizard-panel]')];
    const stepLabels = [...wizard.querySelectorAll('[data-wizard-step-label]')];
    let step = 1;

    const setStep = (next) => {
      step = next;
      panels.forEach((panel) => {
        const n = Number(panel.dataset.wizardPanel);
        const active = n === step;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      stepLabels.forEach((label) => {
        const n = Number(label.dataset.wizardStepLabel);
        label.classList.toggle('is-active', n === step);
        label.classList.toggle('is-done', n < step);
      });
    };

    const validatePanel = (panel) => {
      const fields = [...panel.querySelectorAll('input, select, textarea')];
      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
      return true;
    };

    wizard.addEventListener('click', (e) => {
      const next = e.target.closest('[data-wizard-next]');
      const back = e.target.closest('[data-wizard-back]');
      if (next) {
        const panel = wizard.querySelector(`[data-wizard-panel="${step}"]`);
        if (!panel || !validatePanel(panel)) return;
        setStep(Math.min(3, step + 1));
      }
      if (back) setStep(Math.max(1, step - 1));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const panel = wizard.querySelector('[data-wizard-panel="3"]');
      if (!panel || !validatePanel(panel)) return;

      const subject = encodeURIComponent('Scytáles contact form');
      const body = encodeURIComponent(
        [
          `Email: ${form.email?.value || ''}`,
          `Country: ${form.country?.value || ''}`,
          `Name: ${form.firstName?.value || ''} ${form.lastName?.value || ''}`,
          `Phone: ${form.phone?.value || ''}`,
          `Company: ${form.company?.value || ''}`,
          `Job level: ${form.jobLevel?.value || ''}`,
          `Job function: ${form.jobFunction?.value || ''}`,
          `Details: ${form.details?.value || ''}`,
          `Interest: ${form.interest?.value || ''}`,
        ].join('\n')
      );

      if (status) {
        status.hidden = false;
        status.textContent = 'Opening your email client…';
      }

      form.hidden = true;
      wizard.querySelector('.contact-wizard__steps')?.setAttribute('hidden', '');
      if (success) success.hidden = false;

      window.location.href = `mailto:sales@scytales.com?subject=${subject}&body=${body}`;
    });

    setStep(1);
  };

  const scrollToHash = () => {
    const hash = location.hash.replace(/^#/, '');
    const map = {
      mission: 'mission',
      certifications: 'certifications',
      leadership: 'leadership',
      locations: 'locations',
    };
    // support ?slug=about#mission and legacy #company/mission after load
    let id = map[hash] || hash;
    if (hash.startsWith('company/')) {
      id = map[hash.slice('company/'.length)] || '';
    }
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  fetch(`content/pages/${encodeURIComponent(slug)}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Page not found: ${slug}`);
      return r.json();
    })
    .then((data) => {
      document.title = data.seoTitle || 'Scytáles';
      const meta = document.querySelector('meta[name="description"]');
      if (meta && data.seoDescription) meta.setAttribute('content', data.seoDescription);
      renderHero(data);
      const body = root.querySelector('[data-cms-body]');
      if (body) body.innerHTML = renderBody(data);
      bindForm();
      scrollToHash();
      window.ScytalesDisplay1Reveal?.init(root);
      /* The join page's video block is rendered above, well after
         shared/video-player.js ran its own pass. */
      window.ScytalesVideoPlayer?.init(root);
      window.ScytalesPills?.init(root);
    })
    .catch((err) => {
      console.error(err);
      setText('[data-cms-title]', 'Page not found');
      setText('[data-cms-lead]', 'This page could not be loaded.');
    });
})();
