import { View, type StyleProp, type ViewStyle } from "react-native";
import { Inbox } from "lucide-react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Empty state per design.md §7: single outline icon (32) at 40% ink
 * opacity, one body sentence, optional single ghost/secondary action.
 * Centered vertically in its container.
 */
export function EmptyState({ message, icon, action, testID, style }: EmptyStateProps) {
  return (
    <View
      accessibilityLabel={message}
      testID={testID}
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
        },
        style,
      ]}
    >
      <View style={{ opacity: 0.4 }}>
        {icon ?? <Inbox size={32} color={colors.ink} strokeWidth={1.5} />}
      </View>
      <Text role="body" color="ink" style={{ marginTop: spacing.md, textAlign: "center" }}>
        {message}
      </Text>
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}
