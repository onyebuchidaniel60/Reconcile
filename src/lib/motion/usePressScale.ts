import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from "react-native-reanimated";
import { useMotion, type MotionOptions } from "../../theme/motion";
import { confirm } from "../haptics";

const ScalePressable = Animated.createAnimatedComponent(Pressable);

export interface PressScale {
  Pressable: typeof ScalePressable;
  animatedStyle: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Press-scale interaction: scale(0.97) over the press duration with a light
 * haptic, skipped entirely while disabled. The animated component comes
 * from here so callers never touch Reanimated directly.
 */
export function usePressScale(disabled = false, options?: MotionOptions): PressScale {
  const motion = useMotion(options);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = (): void => {
    if (disabled) return;
    // Reanimated shared values are mutated by design; the immutability
    // rule cannot model them.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(0.97, { duration: motion.press });
    void confirm();
  };

  const onPressOut = (): void => {
    if (disabled) return;
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(1, { duration: motion.press });
  };

  return { Pressable: ScalePressable, animatedStyle, onPressIn, onPressOut };
}
