import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import i18n from './i18n/i18n';
import { logError, toast } from '@flaner/shared/utils';

const toError = (value: Error | string) => (value instanceof Error ? value : new Error(String(value)));

// Errors outside React Query (and best-effort failures passed to reportError) end up here.
// preventDefault: logError already prints the error (once), so the browser's own "Uncaught" line is dropped.
window.addEventListener('error', (event) => {
  event.preventDefault();
  logError('global', toError(event.error ?? event.message));
});
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  logError('global', toError(event.reason));
});

// Service Worker management:
// - In development: unregister any previously registered SW to prevent stale cache interference
// - In production: register the SW for offline support and caching
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Forcefully unregister any lingering service workers in dev mode
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('[SW] Unregistered stale service worker in dev mode');
      }
    });
  } else {
    // Production: dynamically import the PWA register module
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        // Ask instead of reloading: a forced reload mid-use loses unsaved forms.
        onNeedRefresh() {
          toast.message(i18n.t('pwa.updateAvailable'), {
            duration: Infinity,
            action: { label: i18n.t('pwa.refresh'), onClick: () => void updateSW(true) },
          });
        },
      });
    });
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
