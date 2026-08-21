/* More to discover, drag/drop or click to set cover images */
(() => {
  const slots = [...document.querySelectorAll('[data-discover-drop]')];
  if (!slots.length) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  let active = null;

  const setImage = (el, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const prev = el.querySelector('img');
    if (prev?.dataset.objectUrl) URL.revokeObjectURL(prev.dataset.objectUrl);

    const url = URL.createObjectURL(file);
    let img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      el.appendChild(img);
    }
    img.src = url;
    img.dataset.objectUrl = url;
    el.classList.add('has-image');
    el.setAttribute('aria-label', 'Replace image, drop or choose a new one');
  };

  const clearDrag = (el) => el.classList.remove('is-dragover');

  slots.forEach((el) => {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'Add image, drop or choose a file');

    el.addEventListener('dragenter', (e) => {
      e.preventDefault();
      el.classList.add('is-dragover');
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      el.classList.add('is-dragover');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) clearDrag(el);
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      clearDrag(el);
      setImage(el, e.dataTransfer.files?.[0]);
    });
    el.addEventListener('click', () => {
      active = el;
      fileInput.value = '';
      fileInput.click();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        active = el;
        fileInput.value = '';
        fileInput.click();
      }
    });
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (active && file) setImage(active, file);
    active = null;
  });
})();
