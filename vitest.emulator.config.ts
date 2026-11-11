import { defineConfig } from "vitest/config";
import path from "path";

// Endpoint specs against the Firestore + Auth emulators (`npm run test:emulator`), kept out of `npm test` (no Java needed there).
// Own `demo-` project id, so the per-test clean-up never touches `dev:emulators` / E2E data (`demo-flaner`).
export default defineConfig({
  test: {
    name: "emulator",
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.emu.spec.ts"],
    // One emulator database shared by every file: run files one at a time, `setupEmulator` clears it after each test
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      VITE_USE_EMULATORS: "true",
      VITE_API_KEY: "demo-api-key",
      VITE_AUTH_DOMAIN: "demo-flaner-unit.firebaseapp.com",
      VITE_PROJECT_ID: "demo-flaner-unit",
    },
  },
  resolve: {
    alias: {
      "@flaner/shared": path.resolve(__dirname, "./packages/shared/src"),
      "@flaner/test-utils": path.resolve(__dirname, "./packages/test-utils/src"),
    },
  },
});
