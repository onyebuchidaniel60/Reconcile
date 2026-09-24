import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { select } from "../lib/haptics";
import { Text } from "./Text";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  leadingIcon?: React.ReactNode;
  tone?: "light" | "dark";
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Filter/option chip per design.md §7 usage: radius 12, line fill on light
 * (ink 10% on dark), small 600 text. Selected uses signalYellow fill with
 * ink text. Toggles fire a selection haptic through the helper.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
  leadingIcon,
  tone = "light",
  testID,
  style,
}: ChipProps) {
  const handlePress = (): void => {
    void select();
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress ? handlePress : undefined}
      testID={testID}
      style={[
        {
          borderRadius: radius.chip,
          backgroundColor: selected
            ? colors.signalYellow
            : tone === "light"
              ? colors.line
              : colors.inkOverlay10,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      {leadingIcon}
      <Text role="small" color="ink" style={{ fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}
