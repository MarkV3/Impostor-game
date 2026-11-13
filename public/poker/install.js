(() => {
  const install = document.getElementById('installTrainer');
  const status = document.getElementById('offlineStatus');
  const update = document.getElementById('updateTrainer');
  let promptEvent;
  let registration;
  let reloadForUpdate = false;

  const standalone = () => window.matchMedia('(display-mode: standalone)').matches;
  const refreshLabel = () => {
    install.hidden = standalone();
  };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event;
    refreshLabel();
  });
  window.addEventListener('appinstalled', refreshLabel);
  install.addEventListener('click', async () => {
    if (promptEvent) {
      const ready = promptEvent;
      promptEvent = null;
      await ready.prompt();
      await ready.userChoice;
    } else {
      window.Trainer.openModal(
        'Install on your Android phone',
        '<p>Open this page in <b>Chrome</b>, rather than the browser inside another app.</p>' +
          '<ol><li>Tap Chrome’s <b>three-dot menu</b>.</li>' +
          '<li>Tap <b>Add to Home screen</b>, then <b>Install</b> if offered.</li>' +
          '<li>Wait for the trainer to say <b>Offline ready</b> before testing without a connection.</li></ol>' +
          '<p>If Chrome offers only a shortcut, it still opens the trainer; offline support is prepared separately.</p>' +
          '<p class="subtle">Practice results stay on this device. The app picker and multiplayer game need a connection.</p>',
      );
    }
    refreshLabel();
  });
  refreshLabel();

  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'Offline installation needs HTTPS and a supported browser';
    return;
  }

  const showUpdate = () => {
    update.hidden = !registration?.waiting;
  };
  update.addEventListener('click', () => {
    if (!registration?.waiting) return;
    reloadForUpdate = true;
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadForUpdate) window.location.reload();
  });

  const updateStatus = () => {
    status.textContent = navigator.onLine
      ? 'Offline ready · progress stays on this device'
      : 'Offline practice · progress stays on this device';
  };
  navigator.serviceWorker
    .register('/poker/sw.js', { scope: '/poker/', updateViaCache: 'none' })
    .then(async (reg) => {
      registration = reg;
      showUpdate();
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        installing?.addEventListener('statechange', showUpdate);
      });
      await navigator.serviceWorker.ready;
      updateStatus();
      window.addEventListener('online', updateStatus);
      window.addEventListener('offline', updateStatus);
    })
    .catch(() => {
      status.textContent = 'Offline setup failed · reconnect and reload to retry';
    });
})();
