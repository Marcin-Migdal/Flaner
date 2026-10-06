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
      name: "community",
      coverage: {
        provider: "v8",
        include: ["packages/community/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/community/src/**/*.spec.{ts,tsx}",
          "packages/community/src/**/*.test.{ts,tsx}",
          "packages/community/src/**/index.ts",
          "packages/community/src/**/types.ts",
          "packages/community/src/api/**/endpoints.ts",
          "packages/community/src/**/*.styles.ts",
          "packages/community/src/bootstrap.tsx",
          "packages/community/src/routes.tsx",
          "packages/community/src/navigation.ts",
          "packages/community/src/App.tsx",
          "packages/community/src/env.d.ts",
        ],
        reportsDirectory: path.resolve(__dirname, "../../coverage/packages/community"),
        reporter: ["text", "json", "html"],
      },
    },
  })
);
