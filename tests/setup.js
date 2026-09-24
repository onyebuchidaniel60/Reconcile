// Jest setup: fully mock react-native-reanimated. The real package (and
// its shipped mock, which imports the real entry) loads a native worklets
// module that cannot exist in jest. Component tests assert props, labels,
// and press behavior — never animation values.
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    get View() {
      return require("react-native").View;
    },
    createAnimatedComponent: (Component) => Component,
  },
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (updater) => updater(),
  useAnimatedProps: (updater) => updater(),
  withTiming: (value) => value,
  withRepeat: (value) => value,
  withDelay: (_delay, value) => value,
  withSequence: (...values) => values[values.length - 1],
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    out: (fn) => fn,
    inOut: (fn) => fn,
  },
  ReduceMotion: { System: "system", Always: "always", Never: "never" },
}));
