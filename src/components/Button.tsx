import { type StyleProp, type ViewStyle } from "react-native";
import { usePressScale } from "../lib/motion/usePressScale";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

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
 * Press physics come from `usePressScale` (scale 0.97 + light haptic);
 * disabled renders at 40% opacity with no press animation. This file makes
 * no Reanimated or haptics calls of its own.
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
  const {
    Pressable: ScalePressable,
    animatedStyle,
    onPressIn,
    onPressOut,
  } = usePressScale(disabled);

  const height = variant === "ghost" ? 48 : 56;
  const backgroundColor =
    variant === "primary"
      ? colors.signalYellow
      : variant === "secondary"
        ? colors.paper
        : "transparent";
  const borderWidth = variant === "secondary" ? 1 : 0;

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
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
    </ScalePressable>
  );
}
