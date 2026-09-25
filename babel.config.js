module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated worklets (v4 via react-native-worklets) require this
    // transform, and it must be the last plugin entry. Without it, every
    // useSharedValue/useAnimatedStyle/useAnimatedProps call site crashes on
    // native while web keeps working on the JS fallback — exactly the
    // "works on web, exits on device" signature.
    plugins: ["react-native-reanimated/plugin"],
  };
};
