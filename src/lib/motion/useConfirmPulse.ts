import type { ViewStyle } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type AnimatedStyle,
} from "react-native-reanimated";
import { useMotion, type MotionOptions } from "../../theme/motion";
import { confirm } from "../haptics";

export interface ConfirmPulse {
  animatedStyle: AnimatedStyle<ViewStyle>;
  pulse: () => void;
}

/**
 * Confirm pulse for chip-style confirmations: scale 1.0 → 1.06 → 1.0 over
 * the 180ms pop duration plus a light haptic. Instant under reduced motion.
 */
export function useConfirmPulse(options?: MotionOptions): ConfirmPulse {
  const motion = useMotion(options);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulse = (): void => {
    // Reanimated shared values are mutated by design; the immutability
    // rule cannot model them.
    if (motion.pop === 0) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = 1;
      return;
    }
    scale.value = withSequence(
      withTiming(1.06, { duration: motion.pop / 2 }),
      withTiming(1, { duration: motion.pop / 2 }),
    );
    void confirm();
  };

  return { animatedStyle, pulse };
}
