import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "../../vitest.base";
import path from "path";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      name: "planning",
      include: ["packages/planning/src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["packages/planning/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/planning/src/**/*.spec.{ts,tsx}",
          "packages/planning/src/**/*.test.{ts,tsx}",
          "packages/planning/src/**/index.ts",
          "packages/planning/src/**/types.ts",
          "packages/planning/src/**/*.types.ts",
          "packages/planning/src/**/*.constants.ts",
          "packages/planning/src/api/**/endpoints.ts",
          "packages/planning/src/**/*.styles.ts",
          "packages/planning/src/bootstrap.tsx",
          "packages/planning/src/App.tsx",
          "packages/planning/src/mf.ts",
          "packages/planning/src/navigation.ts",
          "packages/planning/src/env.d.ts",
          "packages/planning/src/vite-env.d.ts",
        ],
        reportsDirectory: path.resolve(__dirname, "../../coverage/packages/planning"),
        reporter: ["text", "json", "html"],
      },
    },
  })
);
