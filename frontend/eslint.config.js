import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
const tsRecommended = tseslint.configs.recommended.map((config) =>
  config.files ? config : { ...config, files: tsFiles }
);

export default tseslint.config(
  {
    ignores: ["dist", "build", "node_modules", "coverage"],
  },
  js.configs.recommended,
  ...tsRecommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      // this tells ESLint to ignore variables starting with _
      "no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
        },
      ],

      // mark variables used in JSX as "used"
      "react/jsx-uses-vars": "error",

      "react/react-in-jsx-scope": "off", // Correct for modern React/Vite
      "react/jsx-uses-react": "off", // Correct for modern React/Vite
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  prettierConfig
);
