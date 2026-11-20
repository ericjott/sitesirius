(() => {
  'use strict';

  const blockedShortcuts = new Set(['a', 'c', 'p', 's', 'u', 'x']);
  const isField = (target) => target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]');
  const block = (event) => { if (!isField(event.target)) event.preventDefault(); };
  const watermark = document.querySelector('.screen-watermark');
  const sessionCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const dateFormatter = new Intl.DateTimeFormat(document.documentElement.lang || 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const renderWatermark = () => {
    const label = `SIRIUS DYNAMICS • ${dateFormatter.format(new Date())} • ${sessionCode}`;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 60; index += 1) {
      const item = document.createElement('span');
      item.textContent = label;
      fragment.appendChild(item);
    }

    watermark.replaceChildren(fragment);
  };

  ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart'].forEach((type) => {
    document.addEventListener(type, block, { capture: true });
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && blockedShortcuts.has(key) && !isField(event.target)) {
      event.preventDefault();
    }
  }, { capture: true });

  renderWatermark();
  window.setInterval(renderWatermark, 60000);
})();
