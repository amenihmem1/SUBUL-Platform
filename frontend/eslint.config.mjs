import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Disable strict setState-in-effect rule which is overly aggressive
      "react-hooks/set-state-in-effect": "off",
      // Disable rule that requires useCallback for functions in useEffect deps
      "react-hooks/exhaustive-deps": "warn",
      // Allow explicit any for flexibility
      "@typescript-eslint/no-explicit-any": "off",
      // Allow require() style imports for compatibility
      "@typescript-eslint/no-require-imports": "off",
      // Allow empty object types
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow unescaped entities in JSX (use proper escaping where needed)
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
