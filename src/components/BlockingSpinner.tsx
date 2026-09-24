import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import { useMotion } from "../theme/motion";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

interface BlockingSpinnerProps {
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-screen blocking-operation indicator. Spinners are allowed only for
 * blocking operations (design.md §7) — content cards use LoadingState
 * skeletons instead. Under reduced motion the spinner collapses to a
 * static "Loading" label.
 */
export function BlockingSpinner({
  accessibilityLabel = "Loading",
  testID,
  style,
}: BlockingSpinnerProps) {
  const motion = useMotion();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl,
        },
        style,
      ]}
    >
      {motion.ui === 0 ? (
        <Text role="body" color="ink">
          {accessibilityLabel}…
        </Text>
      ) : (
        <ActivityIndicator size="large" color={colors.ink} />
      )}
    </View>
  );
}
