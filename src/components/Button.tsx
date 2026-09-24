import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { useMotion } from "../theme/motion";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { confirm } from "../lib/haptics";
import { Text } from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  trailingIcon?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Button per design.md §7: 56px primary/secondary, 48px ghost, pill radius.
 * Pressed state scales to 0.97 over the press duration with a light haptic;
 * disabled renders at 40% opacity with no press animation.
 */
export function Button({
  title,
  variant = "primary",
  onPress,
  disabled = false,
  accessibilityLabel,
  trailingIcon,
  testID,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const motion = useMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (): void => {
    if (disabled) return;
    // Reanimated shared values are mutated by design; the immutability
    // rule cannot model them.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(0.97, { duration: motion.press });
    void confirm();
  };

  const handlePressOut = (): void => {
    if (disabled) return;
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(1, { duration: motion.press });
  };

  const height = variant === "ghost" ? 48 : 56;
  const backgroundColor =
    variant === "primary"
      ? colors.signalYellow
      : variant === "secondary"
        ? colors.paper
        : "transparent";
  const borderWidth = variant === "secondary" ? 1 : 0;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
      style={[
        {
          height,
          borderRadius: radius.pill,
          backgroundColor,
          borderWidth,
          borderColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.4 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      <Text role="small" color="ink" style={{ fontWeight: "600" }}>
        {title}
      </Text>
      {trailingIcon}
    </AnimatedPressable>
  );
}
