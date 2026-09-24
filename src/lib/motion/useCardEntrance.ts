import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type AnimatedStyle,
} from "react-native-reanimated";
import { useMotion, type MotionOptions } from "../../theme/motion";

/**
 * Card entrance: opacity 0→1 plus translateY 8px→0 over the UI duration,
 * with an optional stagger index (40ms per index, capped at 8). Collapses
 * to the final state under reduced motion.
 */
export function useCardEntrance(index = 0, options?: MotionOptions): AnimatedStyle<ViewStyle> {
  const motion = useMotion(options);
  const progress = useSharedValue(motion.ui === 0 ? 1 : 0);

  useEffect(() => {
    if (motion.ui === 0) {
      progress.value = 1;
      return;
    }
    const capped = Math.min(Math.max(index, 0), 8);
    progress.value = withDelay(capped * 40, withTiming(1, { duration: motion.ui }));
  }, [index, motion, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 8 * (1 - progress.value) }],
  }));
}
