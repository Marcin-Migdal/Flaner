import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import { sharedFederationConfig } from '../../vite.federation';

// Port deliberately avoids 5000 (macOS AirTunes binds it on 0.0.0.0, leading
// to silent EADDRINUSE on 127.0.0.1). Override `--port` only if 5000+ is free.
const PORT = 4201;

export default defineConfig({
  envDir: '../../',
  server: {
    port: PORT,
    strictPort: true,
    host: '0.0.0.0',
    // Allow cross-origin fetches of mf-manifest.json + chunks from a consumer
    // running on a different port. Vite 8 narrows the default CORS allowlist
    // to specific localhost patterns; setting `cors: true` emits a wildcard
    // `Access-Control-Allow-Origin: *` for dev which is what federation needs.
    cors: true,
  },
  preview: { port: PORT, strictPort: true, host: '0.0.0.0', cors: true },
  build: { target: 'chrome89' },
  optimizeDeps: {
    exclude: ['@flaner/ui-components'],
  },
  plugins: [
    tailwindcss(),
    federation({
      name: 'settings',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
        './routes': './src/routes.tsx',
        './navigation': './src/navigation.ts',
      },
      shared: sharedFederationConfig,
    }),
    react(),
  ],
});
