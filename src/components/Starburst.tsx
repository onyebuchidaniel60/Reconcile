import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";
import { useMotion } from "../theme/motion";
import { Text } from "./Text";

export type StarburstVariant = "signal-yellow" | "alert-red" | "paper";
export type StarburstSize = 32 | 48 | 64;

interface StarburstProps {
  variant?: StarburstVariant;
  size?: StarburstSize;
  text?: string;
  animateIn?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const FILLS: Record<StarburstVariant, string> = {
  "signal-yellow": colors.signalYellow,
  "alert-red": colors.alertRed,
  paper: colors.paper,
};

// 12-point starburst path in a 0..100 box.
const STAR_PATH =
  "M50 2 L58 22 L79 12 L74 33 L96 34 L82 48 L96 62 L74 63 L79 84 L58 74 L50 94 L42 74 L21 84 L26 63 L4 62 L18 48 L4 34 L26 33 L21 12 L42 22 Z";

/**
 * Starburst attention marker per design.md §7 (yellow / alert-red / paper).
 * The alert-red variant may carry a short text overlay. Optional 180ms
 * entrance pop that respects reduced motion. One starburst per screen is a
 * usage rule documented here, not enforced in code.
 */
export function Starburst({
  variant = "signal-yellow",
  size = 48,
  text,
  animateIn = false,
  testID,
  style,
}: StarburstProps) {
  const motion = useMotion();
  const scale = useSharedValue(animateIn ? 0 : 1);

  useEffect(() => {
    if (animateIn) {
      scale.value = withTiming(1, { duration: motion.pop });
    }
  }, [animateIn, motion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={
        text ? `Highlight: ${text}` : "Decorative highlight"
      }
      testID={testID}
      style={[{ width: size, height: size }, animatedStyle, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={STAR_PATH} fill={FILLS[variant]} />
      </Svg>
      {text && variant === "alert-red" ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text role="small" color="paper">
            {text}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
