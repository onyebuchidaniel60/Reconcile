import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

interface IconButtonProps {
  accessibilityLabel: string;
  onPress?: () => void;
  children: React.ReactNode;
  tone?: "light" | "dark";
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular 44×44 icon button per design.md §7. Light gray on paper, 12%
 * paper overlay on ink. The icon itself is supplied by the caller from the
 * single icon library; the accessibility label is required.
 */
export function IconButton({
  accessibilityLabel,
  onPress,
  children,
  tone = "light",
  testID,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: radius.pill,
          backgroundColor:
            tone === "light" ? colors.iconButton : colors.paperOverlay12,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
