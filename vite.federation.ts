import type { DepOptimizationOptions } from 'vite';

export const sharedFederationConfig = {
  react: { singleton: true },
  'react-dom': { singleton: true },
  'react-router': { singleton: true },
  'react-hook-form': { singleton: true },
  '@tanstack/react-query': { singleton: true },
  'react-i18next': { singleton: true },
  i18next: { singleton: true },
  '@flaner/shared/api': { singleton: true },
  '@flaner/shared/constants': { singleton: true },
  '@flaner/shared/context': { singleton: true },
  '@flaner/shared/firebase': { singleton: true },
  '@flaner/shared/hooks': { singleton: true },
  '@flaner/shared/utils': { singleton: true },
  'firebase/app': { singleton: true },
  'firebase/auth': { singleton: true },
  'firebase/firestore': { singleton: true },
  'sonner': { singleton: true },
};

// Every package's dev server. On a cold start (no `node_modules/.vite`, as in CI) a dependency the
// crawl of `index.html` cannot see is found only when a page requests it; Vite then re-bundles and
// sends `full-reload` to every open page, wiping their state mid-test (#189). Pre-bundle them up front.
export const sharedOptimizeDeps = {
  // Workspace source, served as-is so edits hot-reload; its own imports are found by crawling it
  exclude: ['@flaner/ui-components'],
  entries: ['index.html', '../ui-components/src/index.ts'],
  // Runtime plugin injected by the federation plugin (dev type hints), invisible to the crawl
  include: ['@module-federation/dts-plugin/dynamic-remote-type-hints-plugin'],
} satisfies DepOptimizationOptions;
