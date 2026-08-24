import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { sharedFederationConfig } from '../../vite.federation';

const PORT = 4204;

export default defineConfig({
  envDir: '../../',
  server: {
    port: PORT,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
  },
  preview: { port: PORT, strictPort: true, host: '0.0.0.0', cors: true },
  build: { target: 'chrome89' },
  optimizeDeps: {
    exclude: ['@flaner/ui-components'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    tailwindcss(),
    federation({
      name: 'planning',
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
