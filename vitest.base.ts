import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./vitest.setup.ts")],
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "packages/*/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "e2e"],
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@flaner/shared": path.resolve(__dirname, "./packages/shared/src"),
      "@flaner/ui-components": path.resolve(__dirname, "./packages/ui-components/src"),
      "@flaner/test-utils": path.resolve(__dirname, "./packages/test-utils/src"),
    },
  },
});
