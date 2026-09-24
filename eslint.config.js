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
]);
