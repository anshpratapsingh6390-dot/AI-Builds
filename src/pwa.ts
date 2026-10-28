import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Automatic update to keep service worker assets fresh
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[WOLI OS] Service worker activated. Offline-first IndexedDB caching active.');
      },
      onRegisterError(error) {
        console.warn('[WOLI OS] Service worker registration error:', error);
      },
    });
  }
}
