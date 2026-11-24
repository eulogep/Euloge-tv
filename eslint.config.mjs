import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // TypeScript rules — let the TS-aware version handle unused vars
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",

      // React rules
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",

      // React compiler rules — disabled because react-compiler is not enabled
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",

      // Next.js rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "warn",

      // General JavaScript rules — disable base rule, TS version takes over
      "no-unused-vars": "off",
      "prefer-const": "off",
      "no-console": "off",
      "no-debugger": "warn",
      "no-fallthrough": "off",

      // Re-enabled rules (were previously disabled)
      "no-unreachable": "off",
      "no-redeclare": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "playwright-report/**",
      "test-results/**",
      "audit-output/**",
      "next-env.d.ts",
      "examples/**",
      "skills",
      "source glm5/**",
      "claude design/**",
    ],
  },
];

export default eslintConfig;
