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
      name: "core",
      include: ["packages/core/src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["packages/core/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/core/src/**/*.spec.{ts,tsx}",
          "packages/core/src/**/*.test.{ts,tsx}",
          "packages/core/src/**/index.ts",
          "packages/core/src/**/types.ts",
          "packages/core/src/**/*.types.ts",
          "packages/core/src/**/*.constants.ts",
          "packages/core/src/api/**/endpoints.ts",
          "packages/core/src/**/*.styles.ts",
          "packages/core/src/bootstrap.tsx",
          "packages/core/src/App.tsx",
          "packages/core/src/mf.ts",
          "packages/core/src/sw.ts",
          "packages/core/src/vite-env.d.ts",
          "packages/core/src/i18n/**",
        ],
        reportsDirectory: path.resolve(__dirname, "../../coverage/packages/core"),
        reporter: ["text", "json", "html"],
      },
    },
  })
);
