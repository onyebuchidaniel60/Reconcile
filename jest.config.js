module.exports = {
  preset: "jest-expo",
  testMatch: ["**/tests/**/*.test.[jt]s?(x)"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  moduleNameMapper: {
    // Resolve the CJS build: the react-native ESM condition is not
    // transformable under the default ignore patterns.
    "^lucide-react-native$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
  },
};
