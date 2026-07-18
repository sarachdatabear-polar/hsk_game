import js from "@eslint/js";
import globals from "globals";

// House idioms the recommended set would fight:
// - empty catch: `try{...}catch(e){}` is the standing storage/native guard pattern
// - unused args/caught errors: callbacks keep positional args for clarity
const houseRules = {
  "no-empty": ["error", { allowEmptyCatch: true }],
  "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
};

export default [
  {
    // Generated/bundled/vendored trees — never lint. docs/ holds one-off
    // Node tooling scripts outside the src/test/scripts trees this task
    // targets; out of scope here (see task-6 report).
    ignores: ["dist/", "www/", "android/", "data/", "audio/", "art/", "node_modules/", "supabase/", "docs/"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        // esbuild `define` in scripts/build.mjs replaces this at bundle time
        // (see src/analytics/index.js's typeof guard for the unbundled/test path).
        __APP_VERSION__: "readonly",
      },
    },
    rules: houseRules,
  },
  {
    files: ["test/**/*.js", "scripts/**/*.{js,mjs}", "*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: houseRules,
  },
];
