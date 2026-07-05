import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import './i18n/i18n';

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
      registerSW({
        immediate: true,
        onNeedRefresh() {
          window.location.reload();
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
