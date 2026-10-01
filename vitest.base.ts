import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    pool: "threads",
    environmentMatchGlobs: [
      ["**/schemas/**", "node"],
      ["**/packages/shared/src/utils/**", "node"],
      ["**/packages/planning/src/utils/**", "node"],
      ["**/packages/community/src/utils/**", "node"],
      ["**/packages/tools/src/utils/**", "node"],
      ["**/packages/settings/src/utils/**", "node"],
      ["**/packages/core/src/utils/**", "node"],
    ],
    setupFiles: [path.resolve(__dirname, "./vitest.setup.ts")],
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "packages/*/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "e2e"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: path.resolve(__dirname, "./coverage"),
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: [
        "packages/*/src/**/*.spec.{ts,tsx}",
        "packages/*/src/**/*.test.{ts,tsx}",
        "packages/*/src/**/index.ts",
        "packages/*/src/**/types.ts",
        "packages/*/src/**/*.types.ts",
        "packages/*/src/**/*.constants.ts",
        "packages/*/src/**/*.styles.ts",
        "packages/*/src/**/bootstrap.tsx",
        "packages/*/src/**/routes.tsx",
        "packages/*/src/**/navigation.ts",
        "packages/*/src/**/App.tsx",
        "packages/*/src/**/env.d.ts",
        "packages/*/src/**/vite-env.d.ts",
        "packages/ui-components/src/components/ui/**",
        "packages/shared/src/constants/**",
        "packages/shared/src/utils/consts.ts",
        "packages/tools/src/utils/bambuFilaments.ts",
        "packages/*/src/**/sw.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@flaner/shared": path.resolve(__dirname, "./packages/shared/src"),
      "@flaner/ui-components": path.resolve(__dirname, "./packages/ui-components/src"),
      "@flaner/test-utils": path.resolve(__dirname, "./packages/test-utils/src"),
    },
  },
});
