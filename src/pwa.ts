export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      return;
    }

    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true);
        },
        onOfflineReady() {
          console.log('[WOLI OS] Service worker activated. Offline-first IndexedDB caching active.');
        },
        onRegisterError(error) {
          console.warn('[WOLI OS] Service worker registration error:', error);
        },
      });
    }).catch(() => {
      // ignore
    });
  }
}
