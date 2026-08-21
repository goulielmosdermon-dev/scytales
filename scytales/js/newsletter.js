/* Newsletter subscribe popup — contact-wizard style */
(() => {
  const root = document.querySelector('[data-newsletter-modal]');
  const openBtn = document.querySelector('[data-newsletter-open]');
  if (!root || !openBtn) return;

  const backdrop = root.querySelector('[data-newsletter-backdrop]');
  const dialog = root.querySelector('[data-newsletter-dialog]');
  const closeBtn = root.querySelector('[data-newsletter-close]');
  const wizard = root.querySelector('[data-newsletter-wizard]');
  const form = root.querySelector('[data-newsletter-form]');
  if (!backdrop || !dialog || !closeBtn || !wizard || !form) return;

  const success = wizard.querySelector('[data-newsletter-success]');
  const panels = [...wizard.querySelectorAll('[data-wizard-panel]')];
  const stepLabels = [...wizard.querySelectorAll('[data-wizard-step-label]')];
  let open = false;
  let step = 1;
  let lastFocus = null;

  const lockScroll = (on) => {
    document.documentElement.classList.toggle('newsletter-open', on);
    document.body.classList.toggle('newsletter-open', on);
  };

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

  const reset = () => {
    form.reset();
    form.hidden = false;
    wizard.querySelector('.contact-wizard__steps')?.removeAttribute('hidden');
    if (success) success.hidden = true;
    setStep(1);
  };

  const openModal = () => {
    if (open) return;
    lastFocus = document.activeElement;
    open = true;
    reset();
    root.hidden = false;
    root.removeAttribute('inert');
    lockScroll(true);
    requestAnimationFrame(() => root.classList.add('is-open'));
    const first = form.querySelector('input, select, button');
    window.setTimeout(() => first?.focus?.({ preventScroll: true }), 40);
  };

  const closeModal = () => {
    if (!open) return;
    open = false;
    root.classList.remove('is-open');
    lockScroll(false);

    const finish = () => {
      if (open) return;
      root.hidden = true;
      root.setAttribute('inert', '');
      lastFocus?.focus?.({ preventScroll: true });
    };

    const onEnd = (e) => {
      if (e.target !== dialog) return;
      dialog.removeEventListener('transitionend', onEnd);
      finish();
    };
    dialog.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, 360);
  };

  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  closeBtn.addEventListener('click', () => closeModal());
  backdrop.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });

  wizard.addEventListener('click', (e) => {
    const next = e.target.closest('[data-wizard-next]');
    const back = e.target.closest('[data-wizard-back]');
    if (next) {
      const panel = wizard.querySelector(`[data-wizard-panel="${step}"]`);
      if (!panel || !validatePanel(panel)) return;
      setStep(Math.min(2, step + 1));
    }
    if (back) setStep(Math.max(1, step - 1));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const panel = wizard.querySelector('[data-wizard-panel="2"]');
    if (!panel || !validatePanel(panel)) return;

    const subject = encodeURIComponent('Scytáles newsletter subscribe');
    const body = encodeURIComponent(
      [
        `Email: ${form.email?.value || ''}`,
        `Name: ${form.firstName?.value || ''} ${form.lastName?.value || ''}`,
        `Country: ${form.country?.value || ''}`,
        'Request: Newsletter subscription',
      ].join('\n')
    );

    form.hidden = true;
    wizard.querySelector('.contact-wizard__steps')?.setAttribute('hidden', '');
    if (success) success.hidden = false;

    window.location.href = `mailto:info@scytales.com?subject=${subject}&body=${body}`;
  });

  setStep(1);

  window.ScytalesNewsletter = {
    open: openModal,
    close: closeModal,
    isOpen: () => open,
  };
})();
