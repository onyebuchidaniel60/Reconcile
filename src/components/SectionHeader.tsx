import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Text";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Section header per design.md §7: h2 text with an optional right-aligned
 * action at small size rendered at 70% ink opacity.
 */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  testID,
  style,
}: SectionHeaderProps) {
  return (
    <View
      testID={testID}
      style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, style]}
    >
      <Text role="h2">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
        >
          <Text role="small" style={{ opacity: 0.7 }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
