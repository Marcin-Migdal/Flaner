import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { sharedFederationConfig } from '../../vite.federation';

const PORT = 4200;

export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: PORT,
    strictPort: true,
    host: '127.0.0.1',
    headers: {
      // Set to unsafe-none to completely bypass COOP restrictions on localhost,
      // which eliminates the browser console error regarding window.closed.
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
  },
  preview: { port: PORT, strictPort: true },
  build: { target: 'chrome89' },
  optimizeDeps: {
    exclude: ['@flaner-v2/ui-components', '@flaner-v2/shared'],
  },
  plugins: [
    tailwindcss(),
    federation({
      name: 'core',
      // No build-time `remotes:` block - the consumer registers them at
      // runtime in src/mf.ts at module load time.
      shared: sharedFederationConfig,
    }),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      manifest: false, // Using public/manifest.json directly
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
      },
      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        type: 'module',
      },
    }),
  ],
});
