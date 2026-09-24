import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

export type PillBadgeVariant = "dark" | "light";

interface PillBadgeProps {
  label: string;
  variant?: PillBadgeVariant;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small pill badge for use inside cards (e.g. "Today", percentage labels).
 * Dark is ink background with paper text; light is paper with ink text.
 */
export function PillBadge({
  label,
  variant = "dark",
  testID,
  style,
}: PillBadgeProps) {
  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius: radius.pill,
          backgroundColor: variant === "dark" ? colors.ink : colors.paper,
          paddingVertical: spacing.xxs,
          paddingHorizontal: spacing.md,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text role="small" color={variant === "dark" ? "paper" : "ink"}>
        {label}
      </Text>
    </View>
  );
}
