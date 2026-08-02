import pluginJs from "@eslint/js";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
      "jsx-a11y": pluginJsxA11y,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReact.configs["jsx-runtime"].rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,

      // Strict Rules
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],



      // React Compiler / Strict mode rules that we disable:
      // 1. refs: False positive with react-hook-form's `field.ref`, which we must pass to inputs.
      "react-hooks/refs": "off",

      // False positives with react-hook-form (void type in handleSubmit)
      "@typescript-eslint/no-invalid-void-type": "off",

      // Accessibility relaxations for onClick on div
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",

      // Overrides/Relaxing for monorepo
      "react/prop-types": "off", // We use TS instead
      "react/display-name": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
  {
    // Fast refresh expects files to only export components.
    // We disable this for shadcn/ui components because they often export variants (e.g. cva()) alongside components.
    // We also disable this for routes.tsx because it might export route configs alongside components.
    files: ["packages/ui-components/src/components/ui/**/*.tsx", "**/routes.tsx", "**/context/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/build/**", "**/.nx/**", "**/coverage/**", "run-eslint.cjs"],
  },
);
