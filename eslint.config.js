// @ts-check
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    // Deno Edge Functions use jsr:/Deno imports the Expo web config
    // cannot resolve; they are covered by tsc (pure modules) and jest.
    ignores: ["dist/*", ".expo/*", "supabase/functions/**"],
  },
  {
    // Jest setup files run with the jest global available.
    files: ["tests/setup.js"],
    languageOptions: { globals: { jest: "readonly" } },
  },
  {
    // Node CLI scripts (Phase 11 harness). CommonJS, so __dirname/__filename
    // and the node built-ins are legitimately in scope.
    files: ["scripts/**/*.cjs"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "writable",
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        URL: "readonly",
      },
    },
  },
]);
