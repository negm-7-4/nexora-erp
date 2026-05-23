module.exports = {
  root: true,
  env: {
    browser: true,
    es2024: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["react-hooks"],
  extends: ["eslint:recommended", "plugin:react-hooks/recommended"],
  ignorePatterns: ["android/**", "dist/**"],
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
  },
};
