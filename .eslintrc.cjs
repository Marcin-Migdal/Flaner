module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["react"],
  ignorePatterns: [".eslintrc.cjs", "dist/"],
  rules: {
    curly: "error",
    "@typescript-eslint/no-use-before-define": "error",
    "@typescript-eslint/no-shadow": "error",
    "no-console": "warn",
    "react/jsx-no-useless-fragment": "error",
    eqeqeq: "error",
    "@typescript-eslint/no-explicit-any": "error",
    "react/no-children-prop": "error",
    "no-nested-ternary": "error",

    "react-hooks/exhaustive-deps": "off",
    "@typescript-eslint/no-unused-vars": ["error", { vars: "all", args: "all", argsIgnorePattern: "^_" }],
  },
};
