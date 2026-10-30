(() => {
  'use strict';

  const blockedShortcuts = new Set(['a', 'c', 'p', 's', 'u', 'x']);
  const block = (event) => event.preventDefault();
  const watermark = document.querySelector('.screen-watermark');
  const sessionCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
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

    if ((event.ctrlKey || event.metaKey) && blockedShortcuts.has(key)) {
      event.preventDefault();
    }
  }, { capture: true });

  renderWatermark();
  window.setInterval(renderWatermark, 60000);
})();
