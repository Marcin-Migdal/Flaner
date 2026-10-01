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
      name: "shopping",
      coverage: {
        provider: "v8",
        include: ["packages/shopping/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/shopping/src/**/*.spec.{ts,tsx}",
          "packages/shopping/src/**/*.test.{ts,tsx}",
          "packages/shopping/src/**/index.ts",
          "packages/shopping/src/**/types.ts",
          "packages/shopping/src/**/*.styles.ts",
          "packages/shopping/src/bootstrap.tsx",
          "packages/shopping/src/routes.tsx",
          "packages/shopping/src/navigation.ts",
          "packages/shopping/src/App.tsx",
          "packages/shopping/src/env.d.ts",
        ],
        reportsDirectory: path.resolve(__dirname, "../../coverage/packages/shopping"),
        reporter: ["text", "json", "html"],
      },
    },
  })
);
