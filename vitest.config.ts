import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "./vitest.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      projects: ["packages/*/vitest.config.ts"],
    },
  })
);
