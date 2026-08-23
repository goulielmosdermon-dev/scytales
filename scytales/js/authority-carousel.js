/* Authority expertise grid — image drop / pick on placeholders. */
(() => {
  const root = document.querySelector('[data-authority-grid]');
  if (!root) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  /* Not inside `root` — it is a <ul>, so a stray <input> child is invalid
     markup and throws off the grid's :nth-*-child border rules. */
  (root.parentElement || document.body).appendChild(fileInput);

  let activeDrop = null;

  const setImage = async (el, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const prev = el.querySelector('img');
    if (prev?.dataset.objectUrl) URL.revokeObjectURL(prev.dataset.objectUrl);

    const url = URL.createObjectURL(file);
    let img = prev;
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

  root.querySelectorAll('[data-authority-drop]').forEach((el) => {
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
      e.stopPropagation();
      clearDrag(el);
      const file = e.dataTransfer.files?.[0];
      setImage(el, file);
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      activeDrop = el;
      fileInput.value = '';
      fileInput.click();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activeDrop = el;
        fileInput.value = '';
        fileInput.click();
      }
    });
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (activeDrop && file) setImage(activeDrop, file);
    activeDrop = null;
  });
})();
