import { useEffect } from "react";
import {
  Easing,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useMotion, type MotionOptions } from "../../theme/motion";

export interface ChartReveal {
  progress: SharedValue<number>;
}

/**
 * Chart reveal: progress 0 → 1 over the chart duration with ease-out,
 * after an optional stagger delay. Charts multiply their drawn values by
 * progress. Collapses to 1 instantly under reduced motion.
 */
export function useChartReveal(delayMs = 0, options?: MotionOptions): ChartReveal {
  const motion = useMotion(options);
  const progress = useSharedValue(motion.chart === 0 ? 1 : 0);

  useEffect(() => {
    if (motion.chart === 0) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: motion.chart, easing: Easing.out(Easing.exp) }),
    );
  }, [delayMs, motion, progress]);

  return { progress };
}
