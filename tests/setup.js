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

// Jest setup: no screen test renders a <SafeAreaProvider>, and
// `useSafeAreaInsets()` throws without one. Screens call it to size their
// bottom pill-nav clearance (Phase 10A.5, Fix 4), so the hook returns the
// library's own zero-inset default. `SafeAreaView` never reads context —
// it is a plain native view — so it is passed through untouched.
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    __esModule: true,
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
