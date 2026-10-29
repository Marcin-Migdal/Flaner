import { defineConfig } from "vitest/config";

// Security rules tests run against the Firestore emulator (see `npm run test:rules`),
// so they are kept out of the default `npm test` projects.
export default defineConfig({
  test: {
    name: "firestore-rules",
    root: __dirname,
    globals: true,
    environment: "node",
    include: ["**/*.spec.ts"],
    // Tests share one emulator database and clear it between cases
    fileParallelism: false,
    testTimeout: 15000,
  },
});
