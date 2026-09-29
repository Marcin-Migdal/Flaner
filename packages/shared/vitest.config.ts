import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "../../vitest.base";
import path from "path";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@flaner/shared": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      name: "@flaner/shared",
      coverage: {
        provider: "v8",
        include: ["packages/shared/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/shared/src/**/*.spec.{ts,tsx}",
          "packages/shared/src/**/*.test.{ts,tsx}",
          "packages/shared/src/**/index.ts",
          "packages/shared/src/types/**",
          "packages/shared/src/constants/**",
          "packages/shared/src/firebase/**",
          "packages/shared/src/env.d.ts",
          "packages/shared/src/utils/consts.ts",
        ],
        reporter: ["text", "json", "html"],
      },
    },
  })
);
