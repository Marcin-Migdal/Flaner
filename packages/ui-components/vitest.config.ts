import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "../../vitest.base";
import path from "path";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@flaner/ui-components": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      name: "@flaner/ui-components",
      coverage: {
        provider: "v8",
        include: ["packages/ui-components/src/**/*.{ts,tsx}"],
        exclude: [
          "packages/ui-components/src/**/*.spec.{ts,tsx}",
          "packages/ui-components/src/**/*.test.{ts,tsx}",
          "packages/ui-components/src/**/index.ts",
          "packages/ui-components/src/**/types.ts",
          "packages/ui-components/src/**/*.styles.ts",
          "packages/ui-components/src/components/ui/**",
          "packages/ui-components/src/env.d.ts",
        ],
        reporter: ["text", "json", "html"],
      },
    },
  })
);
