import { useEffect } from "react";
import { type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { useMotion } from "../theme/motion";
import { radius, type RadiusName } from "../theme/radius";
import { spacing } from "../theme/spacing";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radiusName?: RadiusName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading placeholder per design.md §7: line color at 60% opacity with a
 * radius matching the shape it replaces. The only animation is a subtle
 * opacity pulse, which collapses to a static block under reduced motion.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radiusName = "card",
  testID,
  style,
}: SkeletonProps) {
  const motion = useMotion();
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (motion.ui === 0) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(withTiming(1, { duration: motion.ui }), -1, true);
  }, [motion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID={testID ?? "skeleton"}
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius: radius[radiusName],
          backgroundColor: colors.line,
          marginVertical: spacing.xs,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
