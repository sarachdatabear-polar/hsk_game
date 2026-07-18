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
    // Generated/bundled/vendored trees — never lint. docs/ is NOT wholesale
    // ignored: its one-off Node tooling scripts (docs/i18n/scripts/*.mjs) are
    // linted via the node-globals files block below; no other JS lives there.
    // Also ignore local-only artifacts that appear on dev machines but never in
    // CI: the Python audio venv and superpowers session scratch.
    ignores: ["dist/", "www/", "android/", "data/", "audio/", "art/", "node_modules/", "supabase/", ".venv/", ".superpowers/"],
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
    files: ["test/**/*.js", "scripts/**/*.{js,mjs}", "*.mjs", "docs/i18n/scripts/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: houseRules,
  },
];
