(() => {
  'use strict';

  const body = document.body;
  const blockedShortcuts = new Set(['a', 'c', 'p', 's', 'u', 'x']);
  let guardTimer = 0;

  const block = (event) => event.preventDefault();
  const hideGuard = () => {
    window.clearTimeout(guardTimer);
    body.classList.remove('content-obscured');
  };
  const showGuard = (duration = 0) => {
    window.clearTimeout(guardTimer);
    body.classList.add('content-obscured');
    if (duration > 0) guardTimer = window.setTimeout(hideGuard, duration);
  };

  ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart'].forEach((type) => {
    document.addEventListener(type, block, { capture: true });
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (event.key === 'PrintScreen') {
      event.preventDefault();
      showGuard(1600);
      navigator.clipboard?.writeText('').catch(() => {});
      return;
    }

    if ((event.ctrlKey || event.metaKey) && blockedShortcuts.has(key)) {
      event.preventDefault();
    }
  }, { capture: true });

  window.addEventListener('blur', () => showGuard());
  window.addEventListener('focus', () => window.setTimeout(hideGuard, 180));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) showGuard();
    else window.setTimeout(hideGuard, 180);
  });
})();
