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
      name: "settings",
      coverage: {
        provider: "v8",
        include: ["packages/settings/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/settings/src/**/*.spec.{ts,tsx}",
          "packages/settings/src/**/*.test.{ts,tsx}",
          "packages/settings/src/**/index.ts",
          "packages/settings/src/**/types.ts",
          "packages/settings/src/api/**/endpoints.ts",
          "packages/settings/src/**/*.styles.ts",
          "packages/settings/src/bootstrap.tsx",
          "packages/settings/src/routes.tsx",
          "packages/settings/src/navigation.ts",
          "packages/settings/src/App.tsx",
          "packages/settings/src/env.d.ts",
        ],
        reportsDirectory: path.resolve(__dirname, "../../coverage/packages/settings"),
        reporter: ["text", "json", "html"],
      },
    },
  })
);
