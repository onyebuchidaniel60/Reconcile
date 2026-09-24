import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { useMotion } from "../theme/motion";
import { radius } from "../theme/radius";
import { PillBadge } from "./PillBadge";

export type ProgressBarVariant = "light" | "ink";

interface ProgressBarProps {
  value: number;
  label?: string;
  variant?: ProgressBarVariant;
  height?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Progress bar per design.md §7. Track is `line` at 60% opacity with pill
 * ends; fill is `ink` on light cards and `signal-yellow` on ink cards. A
 * label renders inside a small white pill centered over the filled portion.
 * Width animates over the UI duration unless reduced motion is on.
 */
export function ProgressBar({
  value,
  label,
  variant = "light",
  height = 12,
  testID,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const motion = useMotion();
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: motion.ui });
  }, [clamped, motion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ? `Progress ${label}` : "Progress"}
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      testID={testID}
      style={[
        {
          height,
          borderRadius: radius.pill,
          backgroundColor: colors.line,
          opacity: 1,
          overflow: "hidden",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          right: 0,
          backgroundColor: colors.line,
          opacity: 0.6,
          borderRadius: radius.pill,
        }}
      />
      <Animated.View
        style={[
          {
            height: "100%",
            borderRadius: radius.pill,
            backgroundColor:
              variant === "light" ? colors.ink : colors.signalYellow,
          },
          fillStyle,
        ]}
      />
      {label ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <PillBadge variant="light" label={label} />
        </View>
      ) : null}
    </View>
  );
}
