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
      name: "tools",
      include: ["packages/tools/src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["packages/tools/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/tools/src/**/*.spec.{ts,tsx}",
          "packages/tools/src/**/*.test.{ts,tsx}",
          "packages/tools/src/**/index.ts",
          "packages/tools/src/**/types.ts",
          "packages/tools/src/**/*.types.ts",
          "packages/tools/src/**/*.constants.ts",
          "packages/tools/src/utils/bambuFilaments.ts",
          "packages/tools/src/api/**/endpoints.ts",
          "packages/tools/src/**/*.styles.ts",
          "packages/tools/src/bootstrap.tsx",
          "packages/tools/src/routes.tsx",
          "packages/tools/src/navigation.ts",
          "packages/tools/src/App.tsx",
          "packages/tools/src/env.d.ts",
        ],
        reportsDirectory: path.resolve(__dirname, "../../coverage/packages/tools"),
        reporter: ["text", "json", "html"],
      },
    },
  })
);
