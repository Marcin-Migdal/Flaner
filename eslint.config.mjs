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



      // 1. refs: False positive with react-hook-form's `field.ref`, which we must pass to inputs.
      "react-hooks/refs": "off",

      // 2. no-invalid-void-type: False positive with TanStack Query / React Query mutations (e.g. useMutation<void, ...>)
      "@typescript-eslint/no-invalid-void-type": "off",
      "react/prop-types": "off", // We use TS instead
      "react/display-name": "off",
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
