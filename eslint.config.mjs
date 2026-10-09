import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "next-env.d.ts",
      "artifacts/**",
      ".next/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default config;
