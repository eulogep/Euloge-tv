import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript rules — let the TS-aware version handle unused vars
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off", // Necessary: used safely in controlled contexts
      "@typescript-eslint/ban-ts-comment": "off", // Temporary: some generated code needs @ts-ignore
      "@typescript-eslint/prefer-as-const": "warn",

      // React rules
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off", // Necessary: French text uses apostrophes
      "react/display-name": "off", // Necessary: forwardRef components
      "react/prop-types": "off", // Necessary: TypeScript handles prop validation

      // React compiler rules — disabled because react-compiler is not enabled
      "react-compiler/react-compiler": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",

      // Next.js rules
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "error",

      // General JavaScript rules — disable base rule, TS version takes over
      "no-unused-vars": "off",
      "prefer-const": "warn",
      "no-console": "off", // Necessary: logger utility uses console
      "no-debugger": "error",
      "no-fallthrough": "warn",

      // Re-enabled rules (were previously disabled)
      "no-unreachable": "warn",
      "no-redeclare": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills",
    ],
  },
];

export default eslintConfig;
